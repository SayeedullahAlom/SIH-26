import type { HTMLAttributes } from "react";

export default function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md shadow-[0_15px_40px_rgba(35,134,248,0.12)] hover:shadow-[0_22px_55px_rgba(35,134,248,0.20)] transition-all duration-300 ${className}`}
      {...props}
    />
  );
}