import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, ShieldCheck, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Inspection } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

function StatCard({
  label,
  value,
  tone,
  filterKey,
}: {
  label: string;
  value: number;
  tone: string;
  filterKey: string;
}) {
  return (
    <Link to={`/inspections?status=${filterKey}`} className="group block h-full">
      <Card className="p-3.5 sm:p-5 h-full flex flex-col justify-between hover:border-zinc-300 hover:shadow-md transition-all duration-200 cursor-pointer">
        <div className="flex items-center justify-between">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 leading-tight group-hover:text-[#1D3587] transition-colors">
            {label}
          </p>
          <ArrowUpRight
            size={13}
            className="text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
          />
        </div>
        <p className={`text-2xl sm:text-4xl font-black mt-1.5 sm:mt-2 tracking-tight ${tone}`}>
          {value}
        </p>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/inspections")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setInspections(res.data);
        } else {
          setInspections([]);
        }
      })
      .catch((err) => {
        console.warn("Could not load inspections:", err);
        setInspections([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const total = inspections.length;
  const compliant = inspections.filter(
    (i) => i.overall_result === "PASS" || i.overall_result === "COMPLIANT"
  ).length;
  const issues = inspections.filter(
    (i) => i.overall_result === "ISSUE" || i.overall_result === "NON_COMPLIANT"
  ).length;
  const review = inspections.filter((i) => i.overall_result === "REVIEW_REQUIRED").length;
  const pending = Math.max(total - compliant - issues - review, 0);

  const bars = [
    { label: "Compliant", count: compliant, color: "bg-emerald-500", key: "compliant" },
    { label: "Non-Compliant", count: issues, color: "bg-rose-500", key: "non_compliant" },
    { label: "Review Required", count: review, color: "bg-amber-500", key: "review" },
    { label: "Pending Processing", count: pending, color: "bg-[#1D3587]", key: "pending" },
  ];

  const recent = [...inspections]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="w-full flex flex-col gap-6 sm:gap-8">
      {/* Top Banner Section */}
      <section className="w-full flex flex-col gap-3 sm:gap-4 py-1">
        {/* Row 1: Title & PCR Card */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 items-stretch gap-3 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full flex flex-col justify-center text-left"
          >
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black leading-tight text-[#0A1329] uppercase tracking-tight m-0">
              Automated <br />
              <span className="text-[#1D3587]">Legal Metrology</span> <br />
              Compliance
            </h1>
          </motion.div>

          {/* External Link PCR Rules Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="w-full h-full flex"
          >
            <a
              href="https://wbconsumers.gov.in/writereaddata/ACT%20&%20RULES/Act%20&%20Rules/9%20The%20Legal%20Metrology%20(Package%20Commodities)%20Rules,%202011.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full block group cursor-pointer"
            >
              <Card className="w-full h-full px-4 sm:px-5 py-2.5 sm:py-3 border border-zinc-200/80 rounded-xl text-center flex flex-col items-center justify-center bg-white shadow-xs group-hover:border-[#1D3587]/40 group-hover:shadow-md transition-all duration-200 relative">
                <div className="absolute top-2.5 right-2.5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                  <ArrowUpRight size={14} />
                </div>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#0A1329] text-white flex items-center justify-center mb-1 sm:mb-1.5 shadow-xs group-hover:bg-[#1D3587] transition-colors">
                  <ShieldCheck size={16} className="text-[#5FA8FF]" />
                </div>
                <h2 className="text-xs sm:text-lg lg:text-xl font-black text-[#1D3587] tracking-tight uppercase leading-tight group-hover:underline">
                  PCR RULES 2011
                </h2>
                <p className="text-[9px] sm:text-[10px] font-bold tracking-wider text-zinc-400 mt-0.5 uppercase">
                  Packaged Commodities Verification
                </p>
              </Card>
            </a>
          </motion.div>
        </div>

        {/* Row 2: Subtitle & CTA Action Buttons */}
        <div className="w-full flex flex-col gap-3 sm:gap-4">
          <p className="text-[11px] sm:text-sm text-zinc-600 font-normal leading-relaxed max-w-2xl">
            AI-assisted verification for packaged commodities. Detect statutory declaration omissions, validate mandatory disclosures, and cross-reference standard weights and measures rules in seconds.
          </p>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link to="/inspections/new">
              <Button variant="primary" className="rounded-lg px-4 sm:px-5 py-2 text-xs tracking-wider">
                <Plus size={14} /> New Inspection
              </Button>
            </Link>
            <Link to="/inspections">
              <Button variant="ghost" className="text-xs uppercase font-bold tracking-wider px-3 py-2">
                All Audits <ChevronRight size={13} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Clickable Metrics Grid */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard label="Total Inspections" value={total} tone="text-[#0A1329]" filterKey="all" />
        <StatCard label="Compliant" value={compliant} tone="text-emerald-600" filterKey="compliant" />
        <StatCard label="Non-Compliant" value={issues} tone="text-rose-600" filterKey="non_compliant" />
        <StatCard label="Review Required" value={review} tone="text-amber-600" filterKey="review" />
      </div>

      {/* Breakdown and Recents */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-bold text-[#0A1329] uppercase tracking-tight mb-4 sm:mb-5">
            Statutory <span className="text-[#1D3587]">Breakdown</span>
          </h2>
          <div className="flex flex-col gap-3 sm:gap-4">
            {bars.map((bar) => (
              <Link
                key={bar.label}
                to={`/inspections?status=${bar.key}`}
                className="group block"
              >
                <div className="flex justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">
                  <span className="text-zinc-600 group-hover:text-[#1D3587] transition-colors">
                    {bar.label}
                  </span>
                  <span className="text-[#0A1329] font-bold group-hover:underline">
                    {bar.count}
                  </span>
                </div>
                <div className="w-full h-2 sm:h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full ${bar.color} rounded-full transition-all duration-500 group-hover:brightness-95`}
                    style={{ width: total > 0 ? `${(bar.count / total) * 100}%` : "0%" }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-5 pb-2 border-b border-zinc-100">
            <h2 className="text-sm sm:text-base font-bold text-[#0A1329] uppercase tracking-tight">
              Recent <span className="text-[#1D3587]">Audits</span>
            </h2>
            <Link
              to="/inspections"
              className="text-xs uppercase font-bold tracking-wider text-[#1D3587] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {recent.map((i) => (
              <Link
                key={i.id}
                to={`/inspections/${i.id}`}
                className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-100 transition duration-150"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#1D3587] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-[#0A1329] truncate">
                    {i.product_name || "Unnamed package"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <Badge value={i.overall_result || i.status} />
                  <ChevronRight size={14} className="text-zinc-400" />
                </div>
              </Link>
            ))}
            {recent.length === 0 && (
              <p className="text-xs text-zinc-400 py-5 text-center">
                {loading ? "Loading audits..." : "No audits recorded yet."}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}