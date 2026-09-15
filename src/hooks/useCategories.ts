import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Category } from "../types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { categories: cats } = await api.get<{ categories: Category[] }>("/categories");
      setCategories(cats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { categories, loading, reload };
}