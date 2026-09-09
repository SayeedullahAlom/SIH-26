import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, ChevronRight, Search, Trash2, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Inspection } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

const FILTER_TABS = [
  { key: "all", label: "All Audits" },
  { key: "compliant", label: "Compliant" },
  { key: "non_compliant", label: "Non-Compliant" },
  { key: "review", label: "Review Required" },
  { key: "pending", label: "Pending" },
];

export default function InspectionsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStatus = searchParams.get("status") || "all";

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInspections = async (query: string = "") => {
    setLoading(true);
    try {
      const res = await api.get("/inspections", {
        params: query.trim() ? { search: query.trim() } : {},
      });
      if (Array.isArray(res.data)) {
        setInspections(res.data);
      } else {
        setInspections([]);
      }
    } catch (err) {
      console.warn("Failed to fetch inspections:", err);
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInspections(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this inspection record and all associated images/data?"
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await api.delete(`/inspections/${id}`);
      setInspections((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete inspection:", err);
      alert("Failed to delete inspection. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTabChange = (key: string) => {
    if (key === "all") {
      searchParams.delete("status");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), status: key });
    }
  };

  // Filter list by category from query params
  const filteredInspections = useMemo(() => {
    if (currentStatus === "all") return inspections;

    return inspections.filter((i) => {
      const res = (i.overall_result || "").toUpperCase();
      const status = (i.status || "").toUpperCase();

      switch (currentStatus) {
        case "compliant":
          return res === "PASS" || res === "COMPLIANT";
        case "non_compliant":
          return res === "ISSUE" || res === "NON_COMPLIANT";
        case "review":
          return res === "REVIEW_REQUIRED";
        case "pending":
          return (
            res !== "PASS" &&
            res !== "COMPLIANT" &&
            res !== "ISSUE" &&
            res !== "NON_COMPLIANT" &&
            res !== "REVIEW_REQUIRED"
          ) || status === "PENDING";
        default:
          return true;
      }
    });
  }, [inspections, currentStatus]);

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
          <h1 className="text-3xl sm:text-4xl uppercase tracking-tight text-[#0A1329] font-black">
            All <span className="text-[#1D3587]">Inspections</span>
          </h1>
          <p className="text-zinc-600 text-sm mt-1">
            {filteredInspections.length} audit{filteredInspections.length === 1 ? "" : "s"} shown
            {currentStatus !== "all" && (
              <span className="text-zinc-400"> (filtered by {currentStatus.replace("_", " ")})</span>
            )}
          </p>
        </div>
        <Link to="/inspections/new">
          <Button variant="primary" className="rounded-xl px-6 py-3 text-xs tracking-widest">
            <Plus size={15} /> New Inspection
          </Button>
        </Link>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {FILTER_TABS.map((tab) => {
            const active = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                  active
                    ? "bg-[#0A1329] text-white shadow-xs"
                    : "bg-white border border-zinc-200/80 text-zinc-600 hover:text-black hover:border-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search audits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-white border border-zinc-200/90 rounded-xl text-xs text-[#0A1329] placeholder-zinc-400 focus:outline-none focus:border-[#1D3587] transition shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 font-medium text-sm gap-2">
          <Loader2 size={20} className="animate-spin text-[#1D3587]" />
          <span>Loading inspections...</span>
        </div>
      ) : filteredInspections.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0A1329] text-white flex items-center justify-center font-black text-lg">
            !
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0A1329]">
              {searchTerm || currentStatus !== "all"
                ? "No matching inspections found"
                : "No inspections found"}
            </h3>
            <p className="text-zinc-500 text-sm mt-1">
              {searchTerm || currentStatus !== "all"
                ? "Try clearing the search query or status filter."
                : "Start by uploading your first package sample for automated verification."}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {(searchTerm || currentStatus !== "all") && (
              <Button
                variant="secondary"
                className="text-xs px-5 py-2"
                onClick={() => {
                  setSearchTerm("");
                  handleTabChange("all");
                }}
              >
                Reset Filters
              </Button>
            )}
            <Link to="/inspections/new">
              <Button variant="primary" className="text-xs px-5 py-2">
                New Inspection
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredInspections.map((i) => (
            <Link key={i.id} to={`/inspections/${i.id}`}>
              <Card className="p-4 sm:p-5 flex justify-between items-center bg-white hover:bg-zinc-50/70 border border-zinc-100 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1D3587] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-bold text-[#0A1329] truncate">
                      {i.product_name || "Unnamed product"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(i.created_at).toLocaleDateString()} &middot;{" "}
                      <span className="font-mono text-zinc-400">ID: {i.id.slice(0, 8)}</span>
                      {i.manufacturer_hint && (
                        <span className="hidden md:inline text-zinc-400">
                          {" "}&middot; {i.manufacturer_hint}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Badge value={i.overall_result || i.status} size="md" />

                  {/* Inline Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(i.id, e)}
                    disabled={deletingId === i.id}
                    title="Delete Inspection"
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    {deletingId === i.id ? (
                      <Loader2 size={16} className="animate-spin text-rose-600" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>

                  <ChevronRight
                    size={16}
                    className="text-zinc-400 hidden sm:block group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}