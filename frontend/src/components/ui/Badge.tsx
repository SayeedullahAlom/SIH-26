type BadgeTone = "success" | "danger" | "warning" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  neutral: "bg-blue-50 text-[#1D3587] border-blue-200",
};

const VALUE_TONE: Record<string, BadgeTone> = {
  PASS: "success",
  COMPLIANT: "success",
  visible: "success",
  ISSUE: "danger",
  NON_COMPLIANT: "danger",
  REVIEW_REQUIRED: "warning",
  illegible: "warning",
  not_visible: "neutral",
  pending: "neutral",
};

export function Badge({ value, size = "sm" }: { value: string; size?: "sm" | "md" }) {
  const tone = VALUE_TONE[value] || "neutral";
  const sizeClass = size === "md" ? "text-xs px-3 py-1" : "text-[11px] px-2.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wider ${toneClasses[tone]} ${sizeClass}`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}