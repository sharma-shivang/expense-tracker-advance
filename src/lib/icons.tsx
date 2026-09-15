import {
  ShoppingCart,
  Utensils,
  UtensilsCrossed,
  Coffee,
  GlassWater,
  Beer,
  Car,
  Bus,
  CarTaxiFront,
  Bike,
  Fuel,
  Plane,
  Home,
  Zap,
  Droplets,
  Wifi,
  Gamepad2,
  Film,
  Music,
  Gift,
  Shirt,
  ShoppingBag,
  HeartPulse,
  Stethoscope,
  GraduationCap,
  BookOpen,
  Laptop,
  Phone,
  Camera,
  Wrench,
  Scissors,
  Baby,
  PawPrint,
  Briefcase,
  Code2,
  PiggyBank,
  Banknote,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  Building2,
  Receipt,
  CircleDollarSign,
  Rocket,
  Smartphone,
  Tag as TagIcon,
} from "lucide-react";
import type { CSSProperties, ComponentType, SVGProps } from "react";

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;

const icons: Record<string, IconComp> = {
  ShoppingCart,
  Utensils,
  UtensilsCrossed,
  Coffee,
  GlassWater,
  Beer,
  Car,
  Bus,
  CarTaxiFront,
  Bike,
  Fuel,
  Plane,
  Home,
  Zap,
  Droplets,
  Wifi,
  Gamepad2,
  Film,
  Music,
  Gift,
  Shirt,
  ShoppingBag,
  HeartPulse,
  Stethoscope,
  GraduationCap,
  BookOpen,
  Laptop,
  Phone,
  Camera,
  Wrench,
  Scissors,
  Baby,
  PawPrint,
  Briefcase,
  Code2,
  PiggyBank,
  Banknote,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  Building2,
  Receipt,
  CircleDollarSign,
  Rocket,
  Smartphone,
  Tag: TagIcon,
};

export const ICON_OPTIONS: { name: string; icon: IconComp }[] = Object.entries(icons).map(
  ([name, icon]) => ({ name, icon })
);

export const EMOJI_OPTIONS: string[] = [
  "🪙", "🍽️", "☕", "🚗", "🏠", "💡", "🎬", "🛍️", "🏥", "📚",
  "💰", "💻", "📈", "✈️", "🧺", "💳", "🏦", "💵", "📱", "✨",
];

const isEmoji = (s: string) => /[^\x00-\x7F]/.test(s);

export function EntityIcon({
  icon,
  className,
  style,
}: {
  icon?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  if (icon && isEmoji(icon)) {
    return (
      <span style={{ fontSize: "1em", lineHeight: 1, ...style }} aria-hidden="true">
        {icon}
      </span>
    );
  }
  const IconComp = (icon && icons[icon]) || TagIcon;
  return (
    <IconComp
      className={`lucide-icon inline${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function iconLabel(icon?: string | null): string {
  return icon && isEmoji(icon) ? `${icon} ` : "";
}