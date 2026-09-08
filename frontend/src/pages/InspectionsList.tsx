import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Inspection } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export default function InspectionsList() {
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
        console.warn("Failed to fetch inspections:", err);
        setInspections([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl uppercase tracking-tight text-[#0A1329]">
            All <span className="text-[#1D3587]">Inspections</span>
          </h1>
          <p className="text-zinc-600 text-sm mt-1">
            {inspections.length} recorded audit{inspections.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/inspections/new">
          <Button variant="primary" className="rounded-xl px-6 py-3 text-xs tracking-widest">
            <Plus size={15} /> New Inspection
          </Button>
        </Link>
      </div>

      {/* List Container */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 font-medium text-sm">
          Loading inspections...
        </div>
      ) : inspections.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0A1329] text-white flex items-center justify-center font-black text-lg">
            !
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0A1329]">No inspections found</h3>
            <p className="text-zinc-500 text-sm mt-1">
              Start by uploading your first package sample for automated verification.
            </p>
          </div>
          <Link to="/inspections/new" className="mt-2">
            <Button variant="secondary" className="text-xs px-6 py-2.5">
              Create Inspection
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3">
          {inspections.map((i) => (
            <Link key={i.id} to={`/inspections/${i.id}`}>
              <Card className="p-4 sm:p-5 flex justify-between items-center bg-white hover:bg-zinc-50/70 border border-zinc-100 transition-colors">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1D3587] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-bold text-[#0A1329] truncate">
                      {i.product_name || "Unnamed product"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(i.created_at).toLocaleDateString()} &middot;{" "}
                      <span className="font-mono text-zinc-400">ID: {i.id.slice(0, 8)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Badge value={i.overall_result || i.status} size="md" />
                  <ChevronRight size={16} className="text-zinc-400 hidden sm:block" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}