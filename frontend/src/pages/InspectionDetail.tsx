import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileDown, Sparkles, ShieldCheck, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Inspection } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { generateComplianceReport } from "../lib/generatePdfReport";
import ProcessingTerminalModal, { type PipelineStage } from "../components/ui/ProcessingTerminalModal";

const FIELD_LABELS: Record<string, string> = {
  product_name: "Product Name",
  generic_name: "Generic Name",
  manufacturer_name: "Manufacturer Name",
  manufacturer_address: "Manufacturer Address",
  packer_name: "Packer Name",
  packer_address: "Packer Address",
  importer_name: "Importer Name",
  importer_address: "Importer Address",
  country_of_origin: "Country of Origin",
  net_quantity: "Net Quantity",
  net_quantity_unit: "Net Quantity Unit",
  dimensions: "Dimensions",
  mrp: "MRP",
  unit_sale_price: "Unit Sale Price",
  manufacture_date: "Manufacture Date",
  packing_date: "Packing Date",
  import_date: "Import Date",
  best_before_or_use_by: "Best Before / Use By",
  consumer_care: "Consumer Care",
  batch_or_lot_number: "Batch / Lot Number",
};

const CATEGORY_LABELS: Record<string, string> = {
  product_identity: "Product Identity",
  manufacturer_details: "Manufacturer Details",
  country_of_origin: "Country of Origin",
  net_quantity: "Net Quantity",
  mrp: "Maximum Retail Price (MRP)",
  unit_sale_price: "Unit Sale Price (USP)",
  manufacturing_date: "Manufacturing Date",
  expiry_date: "Expiry / Best Before Date",
  consumer_care: "Consumer Care Details",
  batch_or_lot: "Batch / Lot Number",
};

const EXTRACTION_STAGES_TEMPLATE: PipelineStage[] = [
  {
    label: "Multimodal Pre-Flight Ingestion",
    status: "pending",
    technicalDetail: "Generating Cloudflare R2 presigned artifact buffers...",
  },
  {
    label: "Vision AI Multimodal Inference",
    status: "pending",
    technicalDetail: "Executing Gemini 3.7 Vision pipeline (spatial token OCR & visual semantics)...",
  },
  {
    label: "AST Normalization & Declaration Parsing",
    status: "pending",
    technicalDetail: "Synthesizing unstructured key-values against PCR Rule 6 schema...",
  },
  {
    label: "Relational Persistence & State Commit",
    status: "pending",
    technicalDetail: "Purging stale extractions and flushing records to PostgreSQL...",
  },
];

const COMPLIANCE_STAGES_TEMPLATE: PipelineStage[] = [
  {
    label: "Statutory Chunk Indexing",
    status: "pending",
    technicalDetail: "Retrieving authoritative PCR 2011 rule references from chunks...",
  },
  {
    label: "Legal Metrology Rules Engine",
    status: "pending",
    technicalDetail: "Validating MRP, Net Quantity (SI units), Manufacturer/Packer, & Consumer Care...",
  },
  {
    label: "Verdict Classification & Checkpoint Sync",
    status: "pending",
    technicalDetail: "Normalizing overall compliance enum constraints ('COMPLIANT' | 'NON_COMPLIANT')...",
  },
];

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<Inspection | any>(null);
  const [extraction, setExtraction] = useState<Record<string, any> | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [error, setError] = useState("");

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTitle, setTerminalTitle] = useState("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [attempt, setAttempt] = useState(1);
  const [isFailed, setIsFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [activeTask, setActiveTask] = useState<"extract" | "verdict" | null>(null);

  const extractAbortRef = useRef<AbortController | null>(null);
  const verdictAbortRef = useRef<AbortController | null>(null);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const updateStage = (index: number, status: PipelineStage["status"]) => {
    setStages((prev) =>
      prev.map((stage, idx) => (idx === index ? { ...stage, status } : stage))
    );
  };

  const loadInspection = async () => {
    try {
      const res = await api.get(`/inspections/${id}`);
      const data = res.data;
      setInspection(data);

      if (Array.isArray(data.extractions) && data.extractions.length > 0) {
        const latest = data.extractions[data.extractions.length - 1];
        setExtraction(latest.extraction_data || latest);
      } else if (data.extraction) {
        setExtraction(data.extraction);
      }

      if (Array.isArray(data.verdicts) && data.verdicts.length > 0) {
        setCategories(data.verdicts);
      } else if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }

      setOverallStatus(data.overall_result || data.status);
    } catch (err) {
      console.error("Failed to load inspection:", err);
      setError("Failed to load inspection details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspection();

    return () => {
      if (extractAbortRef.current) extractAbortRef.current.abort();
      if (verdictAbortRef.current) verdictAbortRef.current.abort();
    };
  }, [id]);

  const runExtraction = async (currentAttempt = 1) => {
    if (extractAbortRef.current) {
      extractAbortRef.current.abort();
    }
    const controller = new AbortController();
    extractAbortRef.current = controller;

    setActiveTask("extract");
    setTerminalTitle("Vision AI Extraction Pipeline");
    setStages(JSON.parse(JSON.stringify(EXTRACTION_STAGES_TEMPLATE)));
    setAttempt(currentAttempt);
    setIsFailed(false);
    setErrorMessage(undefined);
    setTerminalOpen(true);
    setError("");

    try {
      updateStage(0, "running");
      await delay(500);
      updateStage(0, "success");

      updateStage(1, "running");
      const res = await api.post(
        `/inspections/${id}/extract`,
        {},
        { signal: controller.signal }
      );
      updateStage(1, "success");

      updateStage(2, "running");
      await delay(400);
      updateStage(2, "success");

      updateStage(3, "running");
      const payload = res.data.extraction || res.data.extraction_data || res.data;
      setExtraction(payload);
      await loadInspection();
      await delay(400);
      updateStage(3, "success");

      await delay(600);
      setTerminalOpen(false);
    } catch (err: any) {
      if (err.name === "CanceledError" || err.name === "AbortError" || err?.code === "ERR_CANCELED") {
        setTerminalOpen(false);
        return;
      }
      console.error("Extraction pipeline error:", err);
      const activeIdx = stages.findIndex((s) => s.status === "running");
      if (activeIdx !== -1) updateStage(activeIdx, "error");

      if (currentAttempt < 2) {
        await delay(1200);
        runExtraction(currentAttempt + 1);
      } else {
        setIsFailed(true);
        setErrorMessage(
          err.response?.data?.detail || err.message || "Vision AI model inference error"
        );
      }
    } finally {
      extractAbortRef.current = null;
    }
  };

  const runVerdict = async (currentAttempt = 1) => {
    if (verdictAbortRef.current) {
      verdictAbortRef.current.abort();
    }
    const controller = new AbortController();
    verdictAbortRef.current = controller;

    setActiveTask("verdict");
    setTerminalTitle("Legal Metrology Statutory Audit Engine");
    setStages(JSON.parse(JSON.stringify(COMPLIANCE_STAGES_TEMPLATE)));
    setAttempt(currentAttempt);
    setIsFailed(false);
    setErrorMessage(undefined);
    setTerminalOpen(true);
    setError("");

    try {
      updateStage(0, "running");
      await delay(500);
      updateStage(0, "success");

      updateStage(1, "running");
      const res = await api.post(
        `/inspections/${id}/verdict`,
        {},
        { signal: controller.signal }
      );
      updateStage(1, "success");

      updateStage(2, "running");
      if (Array.isArray(res.data.categories)) {
        setCategories(res.data.categories);
      } else if (Array.isArray(res.data.verdicts)) {
        setCategories(res.data.verdicts);
      }
      if (res.data.overall_status) {
        setOverallStatus(res.data.overall_status);
      }
      await loadInspection();
      await delay(400);
      updateStage(2, "success");

      await delay(600);
      setTerminalOpen(false);
    } catch (err: any) {
      if (err.name === "CanceledError" || err.name === "AbortError" || err?.code === "ERR_CANCELED") {
        setTerminalOpen(false);
        return;
      }
      console.error("Compliance engine failure:", err);
      const activeIdx = stages.findIndex((s) => s.status === "running");
      if (activeIdx !== -1) updateStage(activeIdx, "error");

      if (currentAttempt < 2) {
        await delay(1200);
        runVerdict(currentAttempt + 1);
      } else {
        setIsFailed(true);
        setErrorMessage(
          err.response?.data?.detail || err.message || "Statutory audit evaluation fault"
        );
      }
    } finally {
      verdictAbortRef.current = null;
    }
  };

  const handleCancelPipeline = () => {
    if (extractAbortRef.current) {
      extractAbortRef.current.abort();
      extractAbortRef.current = null;
    }
    if (verdictAbortRef.current) {
      verdictAbortRef.current.abort();
      verdictAbortRef.current = null;
    }
    setActiveTask(null);
    setIsFailed(false);
    setTerminalOpen(false);
  };

  const handleDeleteInspection = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this inspection and all of its records?"
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/inspections/${id}`);
      navigate("/inspections");
    } catch (err: any) {
      console.error("Failed to delete inspection:", err);
      setError(err.response?.data?.detail || "Failed to delete inspection. Please try again.");
      setDeleting(false);
    }
  };

  const handleDownloadReport = async () => {
    setReportGenerating(true);
    setError("");
    try {
      await generateComplianceReport({
        inspection,
        extraction,
        categories,
        overallStatus,
        fieldLabels: FIELD_LABELS,
        categoryLabels: CATEGORY_LABELS,
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setError("Could not generate report certificate. Please check console logs.");
    } finally {
      setReportGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#1D3587]" />
      </div>
    );
  }

  if (!inspection) return <p className="text-zinc-500 font-medium">Inspection not found.</p>;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-8 max-w-6xl mx-auto w-full"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-[#0A1329]">
              {extraction?.product_name?.value || inspection.product_name || "Unnamed Product"}
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">
              Status: <span className="font-semibold text-[#0A1329] uppercase">{overallStatus}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {overallStatus && <Badge value={overallStatus} size="md" />}
            
            <Button
              variant="primary"
              onClick={handleDownloadReport}
              disabled={!extraction || reportGenerating}
              title={!extraction ? "Extract declarations first to generate a report" : "Export official audit certificate"}
            >
              {reportGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Preparing PDF...
                </>
              ) : (
                <>
                  <FileDown size={15} /> Download Report
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleDeleteInspection}
              disabled={deleting}
              title="Delete this inspection"
              className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              {deleting ? (
                <Loader2 size={16} className="animate-spin text-rose-600" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-xl p-4">
            {error}
          </p>
        )}

        {inspection.images && inspection.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {inspection.images.map((img: any, idx: number) => (
              <Card key={img.id || img.s3_url || idx} className="overflow-hidden p-0 bg-white">
                <img
                  id={`inspection-img-${idx}`}
                  crossOrigin="anonymous"
                  src={img.download_url || img.url}
                  alt={img.side}
                  className="w-full aspect-square object-cover"
                />
                <p className="text-xs text-center py-2.5 uppercase font-bold tracking-wider text-zinc-500 border-t border-zinc-100">
                  {img.side}
                </p>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
            <h2 className="text-lg md:text-xl flex items-center gap-2 text-[#0A1329]">
              <Sparkles size={20} className="text-[#1D3587]" /> Extracted Declarations
            </h2>
            <Button onClick={() => runExtraction(1)}>
              {extraction ? "Re-run Extraction" : "Run Extraction"}
            </Button>
          </div>

          {!extraction || Object.keys(extraction).length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">
              No extraction recorded yet. Click "Run Extraction" to analyze package labels.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {Object.entries(extraction)
                .filter(([key]) => !["id", "inspection_id", "extraction_id", "created_at", "updated_at"].includes(key))
                .map(([key, field]) => {
                  const displayVal =
                    typeof field === "object" && field !== null && "value" in field
                      ? field.value
                      : typeof field === "object"
                      ? JSON.stringify(field)
                      : String(field ?? "—");

                  const statusVal =
                    typeof field === "object" && field !== null && "status" in field
                      ? field.status
                      : null;

                  return (
                    <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 text-sm items-center">
                      <span className="text-zinc-500 font-medium">{FIELD_LABELS[key] || key.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-[#0A1329] break-words">
                        {displayVal !== null && displayVal !== "" ? displayVal : "—"}
                      </span>
                      <span className="sm:text-right">
                        {statusVal && <Badge value={statusVal} />}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        <Card className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
            <h2 className="text-lg md:text-xl flex items-center gap-2 text-[#0A1329]">
              <ShieldCheck size={20} className="text-[#1D3587]" /> Compliance Checklist
            </h2>
            {extraction && (
              <Button onClick={() => runVerdict(1)} variant={categories.length > 0 ? "primary" : "secondary"}>
                {categories.length > 0 ? "Re-run Check" : "Run Compliance Check"}
              </Button>
            )}
          </div>

          {!extraction ? (
            <p className="text-sm text-zinc-500 py-4">
              Run extraction first before conducting the compliance assessment.
            </p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">
              Compliance check pending. Click "Run Compliance Check" to evaluate regulations.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {categories.map((cat: any, idx: number) => (
                <div key={cat.id || cat.category || idx} className="rounded-2xl bg-zinc-50/70 border border-zinc-200/80 p-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm uppercase tracking-wider text-[#0A1329]">
                      {CATEGORY_LABELS[cat.category] || cat.category.replace(/_/g, " ")}
                    </span>
                    <Badge value={cat.verdict} />
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed">{cat.reasoning}</p>
                  {cat.rule_reference && (
                    <p className="text-xs font-medium text-zinc-400 mt-3 tracking-wider">
                      <span className="uppercase font-bold text-zinc-500">Rule Ref:</span> {cat.rule_reference}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      <ProcessingTerminalModal
        isOpen={terminalOpen}
        title={terminalTitle}
        stages={stages}
        currentAttempt={attempt}
        maxAttempts={2}
        isFailed={isFailed}
        errorMessage={errorMessage}
        onRetry={() => {
          if (activeTask === "extract") runExtraction(1);
          if (activeTask === "verdict") runVerdict(1);
        }}
        onClose={() => setTerminalOpen(false)}
        onCancel={handleCancelPipeline}
      />
    </>
  );
}