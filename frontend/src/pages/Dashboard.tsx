import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Inspection } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-5 flex flex-col justify-between">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 leading-tight">
        {label}
      </p>
      <p className={`text-3xl sm:text-4xl font-black mt-2 tracking-tight ${tone}`}>
        {value}
      </p>
    </Card>
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
    { label: "Compliant", count: compliant, color: "bg-emerald-500" },
    { label: "Non-Compliant", count: issues, color: "bg-rose-500" },
    { label: "Review Required", count: review, color: "bg-amber-500" },
    { label: "Pending Processing", count: pending, color: "bg-[#1D3587]" },
  ];

  const recent = [...inspections]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="w-full flex flex-col gap-10">
      {/* Relevant Legal Metrology Hero Banner */}
      <section className="w-full flex flex-col md:flex-row items-center justify-between gap-8 py-2">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full md:flex-1 text-left"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-[#0A1329] uppercase tracking-tight">
            Automated <br />
            <span className="text-[#1D3587]">Legal Metrology</span> <br />
            Compliance
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 font-normal leading-relaxed max-w-lg">
            AI-assisted verification for packaged commodities. Detect statutory declaration omissions, validate mandatory disclosures, and cross-reference standard weights and measures rules in seconds.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Link to="/inspections/new">
              <Button variant="primary" className="rounded-lg px-6 py-2.5 text-xs tracking-wider">
                <Plus size={15} /> New Inspection
              </Button>
            </Link>
            <Link to="/inspections">
              <Button variant="ghost" className="text-xs uppercase font-bold tracking-wider px-4 py-2.5">
                All Audits <ChevronRight size={14} />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Metrology Enforcement Spotlight Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="w-full md:w-[42%] max-w-sm"
        >
          <Card className="p-8 border border-white/90 rounded-2xl text-center flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-12 h-12 rounded-xl bg-[#0A1329] text-white flex items-center justify-center font-display font-black text-xl mb-3 shadow-xs">
              <ShieldCheck size={24} className="text-[#5FA8FF]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D3587] tracking-tight uppercase">
              PCR RULES 2011
            </h2>
            <p className="text-[11px] font-bold tracking-widest text-zinc-400 mt-1 uppercase">
              Packaged Commodities Verification
            </p>
          </Card>
        </motion.div>
      </section>

      {/* Metrics Row */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Inspections" value={total} tone="text-[#0A1329]" />
        <StatCard label="Compliant" value={compliant} tone="text-emerald-600" />
        <StatCard label="Non-Compliant" value={issues} tone="text-rose-600" />
        <StatCard label="Review Required" value={review} tone="text-amber-600" />
      </div>

      {/* Breakdown and Recents */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-bold text-[#0A1329] uppercase tracking-tight mb-5">
            Statutory <span className="text-[#1D3587]">Breakdown</span>
          </h2>
          <div className="flex flex-col gap-4">
            {bars.map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  <span className="text-zinc-600">{bar.label}</span>
                  <span className="text-[#0A1329] font-bold">{bar.count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full ${bar.color} rounded-full transition-all duration-500`}
                    style={{ width: total > 0 ? `${(bar.count / total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-5 pb-2 border-b border-zinc-100">
            <h2 className="text-base font-bold text-[#0A1329] uppercase tracking-tight">
              Recent <span className="text-[#1D3587]">Audits</span>
            </h2>
            <Link
              to="/inspections"
              className="text-xs uppercase font-bold tracking-wider text-[#1D3587] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {recent.map((i) => (
              <Link
                key={i.id}
                to={`/inspections/${i.id}`}
                className="flex justify-between items-center p-3 rounded-xl bg-zinc-50/70 hover:bg-zinc-100/80 border border-zinc-100 transition duration-150"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-2 h-2 rounded-full bg-[#1D3587] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-[#0A1329] truncate">
                    {i.product_name || "Unnamed package"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge value={i.overall_result || i.status} />
                  <ChevronRight size={15} className="text-zinc-400" />
                </div>
              </Link>
            ))}
            {recent.length === 0 && (
              <p className="text-xs text-zinc-400 py-6 text-center">
                {loading ? "Loading audits..." : "No audits recorded yet."}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200/80 pt-8 pb-4 text-center">
        <p className="text-xs font-medium text-zinc-500">
          © {new Date().getFullYear()} Legal Metrology Division. All rights reserved.
        </p>
      </footer>
    </div>
  );
}