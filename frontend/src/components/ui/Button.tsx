import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-bold text-xs uppercase tracking-wider px-6 py-3 transition-all duration-300 transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

const variants: Record<Variant, string> = {
  // Eureka hero outlined style ("REGISTER" button)
  primary:
    "border-2 border-black text-black bg-transparent hover:bg-black hover:text-white shadow-sm hover:shadow-md",
  // Deep navy brand button
  secondary:
    "bg-[#1D3587] text-white hover:bg-[#142666] shadow-lg shadow-blue-900/15 hover:-translate-y-0.5",
  ghost:
    "text-zinc-600 hover:text-black hover:bg-black/5 normal-case font-medium",
};

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}