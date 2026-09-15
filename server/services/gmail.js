export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function clientConfig() {
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    throw new Error("GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not configured in server/.env");
  }
  const redirectUri =
    process.env.GMAIL_REDIRECT_URI || `${process.env.SERVER_ORIGIN || "http://localhost:5001"}/api/email/callback`;
  return {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri,
  };
}

export function buildAuthUrl(state) {
  const { clientId, redirectUri } = clientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function tokenRequest(body) {
  const { clientId, clientSecret } = clientConfig();
  const params = new URLSearchParams();
  for (const [k, v] of body.entries()) params.set(k, v);
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error_description || `Google token request failed: ${data.error}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function exchangeCode(code) {
  const { redirectUri } = clientConfig();
  const data = await tokenRequest(
    new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: redirectUri })
  );
  if (!data.refresh_token) {
    throw new Error("Google did not return a refresh token (access_type=offline). Approve the consent screen again.");
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function refreshAccessToken(refreshToken) {
  const data = await tokenRequest(
    new URLSearchParams({ refresh_token: refreshToken, grant_type: "refresh_token" })
  );
  return data.access_token;
}

async function gmailGet(path, accessToken) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error?.message || `Gmail API error (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function gmailProfile(accessToken) {
  const data = await gmailGet("/users/me/profile", accessToken);
  return data.emailAddress;
}

export async function listMessages(accessToken, query, maxResults = 100) {
  const q = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const data = await gmailGet(`/users/me/messages?${q}`, accessToken);
  return data.messages ?? [];
}

export async function getMessage(accessToken, id) {
  const data = await gmailGet(`/users/me/messages/${id}?format=full`, accessToken);
  const headers = {};
  for (const h of data.payload?.headers ?? []) headers[String(h.name).toLowerCase()] = h.value;

  const text = stripHtml(extractText(data.payload));
  const dateMs = Date.parse(headers.date ?? "");

  return {
    id,
    threadId: data.threadId,
    subject: headers.subject ?? "",
    from: headers.from ?? "",
    date: headers.date ?? "",
    dateMs: isNaN(dateMs) ? Date.now() : dateMs,
    text,
  };
}

function extractText(part) {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64").toString("utf8");
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return Buffer.from(part.body.data, "base64").toString("utf8");
  }
  let out = "";
  for (const p of part.parts ?? []) out += extractText(p);
  return out;
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h\d|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x20b9;|&#8377;|&#x09F3;/gi, "₹")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const DEBIT_HINTS = /\b(debited|you paid|you sent|paid to|sent to|spent|purchase|withdrawn|withdrawal|payment to|upi payment)\b/i;
const CREDIT_HINTS = /\b(credited|credit|received|recvd|refund|deposited|income|added to|sent you|deposit|accredited)\b/i;

const AMOUNT_RE = /(?:rs\.?\s*|inr\s*|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;

const STRONG_CUE_RE = /\b(?:debited|credited|received|recvd|sent|paid|deposited|withdrawn|refunded?)\b/i;

function isBankAlert(body) {
  const am = body.match(AMOUNT_RE);
  if (!am) return false;
  const cue = STRONG_CUE_RE.exec(body);
  if (!cue) return false;
  return Math.abs(am.index - cue.index) <= 160;
}

function prettifyName(s) {
  if (!s) return s;
  if (/[a-z]/.test(s)) return s;
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function isAccountPhrase(s) {
  return /^(your|my|the|account|a\/?c|bank|upi|vpa|self|myself|own|you|yourself)\b/i.test(s.trim());
}

function cleanMerchant(s) {
  const clean = s.trim().replace(/^[\s.\-]+|[\s.,\-]+$/g, "");
  return clean.length >= 2 && !isAccountPhrase(clean) ? clean : null;
}

function extractCounterparty(body, type) {
  if (type === "expense") {
    const paren = body.match(/\btowards\s+VPA\s+\S+?\s*\(([^()\n]{2,60})\)/i);
    if (paren) {
      const name = cleanMerchant(paren[1]);
      if (name) return name;
    }
  } else {
    const sr = body.match(
      /\b(?:sender|remitter|beneficiary)\s*:?\s*([A-Za-z][A-Za-z0-9& .'\-]{1,40})(?=\s*\(|,|\.|\n|\s+on\b|$)/i
    );
    if (sr) {
      const name = cleanMerchant(sr[1]);
      if (name) return name;
    }
  }

  const m1 = body.match(
    /\b(?:(?:you\s+)?(?:paid|sent)|transfer(?:red)?\s+to)(?:\s+[₹rs.\d,]+\s*)*\s+to\s+([A-Za-z][A-Za-z0-9 .'-]{1,30})(?=\s*[,(]|\s*(?:on|via|using|at|upi)\b|\s*$)/i
  );
  if (m1) {
    const name = cleanMerchant(m1[1]);
    if (name) return name;
  }
  const m2 = body.match(/([A-Za-z][\w\s.'-]{1,30})@[\w.-]+\b/i);
  if (m2) {
    const name = m2[1].trim();
    const last = name.match(/(^|\s)([A-Z][\w&.'-]*(?:\s[A-Z][\w&.'-]*){0,3})$/);
    const candidate = last ? last[2] : name;
    if (/\s/.test(candidate)) {
      const clean = cleanMerchant(candidate);
      if (clean) return clean;
    }
  }
  const m3 = body.match(/UPI\/[\d/]+[\s:]*([A-Za-z][\w\s.'-]{1,30})@/i);
  if (m3) {
    const clean = cleanMerchant(m3[1]);
    if (clean) return clean;
  }

  const re =
    type === "income"
      ? /\b(?:credited|received|recvd|deposited|accredited|refunded?|added to|amount credited)\b.{0,80}?\b(?:from|by)\s+([A-Za-z][A-Za-z0-9 &.'-]{1,40})/i
      : /\b(?:debited|paid|sent|spent|purchase|withdrawn|upi payment)\b.{0,80}?\b(?:to|towards|for)\s+([A-Za-z][A-Za-z0-9 &.'-]{1,40})/i;
  const m4 = body.match(re);
  if (m4) {
    let raw = m4[1]
      .trim()
      .replace(/\b(?:on|via|using|at|upi|dated|date|ref|balance|avl|info)\b.*$/i, "")
      .replace(/\*\*\s*\d+\s*$/g, "")
      .replace(/[\s.,\-]+$/, "")
      .trim();
    const clean = cleanMerchant(raw);
    if (clean) return clean;
  }
  return null;
}

export function parseTransactionEmail(subject, text) {
  const body = (text || "").replace(/\r\n/g, "\n");

  if (!isBankAlert(body)) return { amount: null, type: "expense", description: "" };

  const amountMatch = body.match(AMOUNT_RE) || (subject || "").match(AMOUNT_RE);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : null;

  const isDebit = DEBIT_HINTS.test(body);
  const isCredit = CREDIT_HINTS.test(body);
  const type = isCredit && !isDebit ? "income" : "expense";

  const payee = extractCounterparty(body, type);
  const description =
    (payee ? prettifyName(payee) : "") ||
    (subject || "Imported expense").replace(/\s+/g, " ").trim();

  return { amount, type, description: description.slice(0, 120) || "Imported expense" };
}

export const SYNC_QUERY =
  'from:(noreply OR alerts OR statement OR upi OR payments) (upi OR debited OR credited OR paid OR spent OR received OR transfer OR transaction) newer_than:90d';