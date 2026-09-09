import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileDown, Sparkles, ShieldCheck, Loader2, Trash2, Edit3, CheckSquare, X } from "lucide-react";
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
  { label: "Multimodal Pre-Flight Ingestion", status: "pending", technicalDetail: "Generating Cloudflare R2 presigned artifact buffers..." },
  { label: "Vision AI Multimodal Inference", status: "pending", technicalDetail: "Executing Gemini Vision pipeline (spatial token OCR)..." },
  { label: "AST Normalization & Declaration Parsing", status: "pending", technicalDetail: "Synthesizing unstructured key-values against PCR Rule 6 schema..." },
  { label: "Relational Persistence & State Commit", status: "pending", technicalDetail: "Purging stale extractions and flushing records to PostgreSQL..." },
];

const COMPLIANCE_STAGES_TEMPLATE: PipelineStage[] = [
  { label: "Statutory Chunk Indexing", status: "pending", technicalDetail: "Retrieving authoritative PCR 2011 rule references from chunks..." },
  { label: "Legal Metrology Rules Engine", status: "pending", technicalDetail: "Validating final values for MRP, Net Quantity, Packer, etc..." },
  { label: "Verdict Classification & Checkpoint Sync", status: "pending", technicalDetail: "Normalizing overall compliance enum constraints..." },
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

  // Terminal telemetry state
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTitle, setTerminalTitle] = useState("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [attempt, setAttempt] = useState(1);
  const [isFailed, setIsFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [activeTask, setActiveTask] = useState<"extract" | "verdict" | null>(null);

  // Declaration Edit Modal State
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editStatus, setEditStatus] = useState("visible");
  const [savingEdit, setSavingEdit] = useState(false);

  // Verdict Override Modal State
  const [overrideCategory, setOverrideCategory] = useState<string | null>(null);
  const [officerVerdictChoice, setOfficerVerdictChoice] = useState("PASS");
  const [officerRemarks, setOfficerRemarks] = useState("");
  const [savingVerdictOverride, setSavingVerdictOverride] = useState(false);

  const extractAbortRef = useRef<AbortController | null>(null);
  const verdictAbortRef = useRef<AbortController | null>(null);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const updateStage = (index: number, status: PipelineStage["status"]) => {
    setStages((prev) => prev.map((s, idx) => (idx === index ? { ...s, status } : s)));
  };

  const loadInspection = async () => {
    try {
      const res = await api.get(`/inspections/${id}`);
      const data = res.data;
      setInspection(data);

      // Parse latest extraction into fresh object
      if (Array.isArray(data.extractions) && data.extractions.length > 0) {
        const latest = data.extractions[data.extractions.length - 1];
        const rawExtraction = latest.extraction_data || latest;
        setExtraction({ ...rawExtraction });
      } else if (data.extraction) {
        setExtraction({ ...data.extraction });
      }

      // Parse verdicts into fresh array
      if (Array.isArray(data.verdicts) && data.verdicts.length > 0) {
        setCategories([...data.verdicts]);
      } else if (Array.isArray(data.categories)) {
        setCategories([...data.categories]);
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
    if (extractAbortRef.current) extractAbortRef.current.abort();
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
      const res = await api.post(`/inspections/${id}/extract`, {}, { signal: controller.signal });
      updateStage(1, "success");

      updateStage(2, "running");
      await delay(400);
      updateStage(2, "success");

      updateStage(3, "running");
      const payload = res.data.extraction || res.data.extraction_data || res.data;
      setExtraction({ ...payload });
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
      const activeIdx = stages.findIndex((s) => s.status === "running");
      if (activeIdx !== -1) updateStage(activeIdx, "error");

      if (currentAttempt < 2) {
        await delay(1200);
        runExtraction(currentAttempt + 1);
      } else {
        setIsFailed(true);
        setErrorMessage(err.response?.data?.detail || err.message || "Vision AI model inference error");
      }
    } finally {
      extractAbortRef.current = null;
    }
  };

  const runVerdict = async (currentAttempt = 1) => {
    if (verdictAbortRef.current) verdictAbortRef.current.abort();
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
      const res = await api.post(`/inspections/${id}/verdict`, {}, { signal: controller.signal });
      updateStage(1, "success");

      updateStage(2, "running");
      if (Array.isArray(res.data.categories)) {
        setCategories([...res.data.categories]);
      } else if (Array.isArray(res.data.verdicts)) {
        setCategories([...res.data.verdicts]);
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
      const activeIdx = stages.findIndex((s) => s.status === "running");
      if (activeIdx !== -1) updateStage(activeIdx, "error");

      if (currentAttempt < 2) {
        await delay(1200);
        runVerdict(currentAttempt + 1);
      } else {
        setIsFailed(true);
        setErrorMessage(err.response?.data?.detail || err.message || "Statutory audit evaluation fault");
      }
    } finally {
      verdictAbortRef.current = null;
    }
  };

  const handleSaveFieldEdit = async () => {
    if (!editField) return;
    setSavingEdit(true);
    try {
      const res = await api.patch(`/inspections/${id}/extraction`, {
        field_name: editField,
        edited_value: editValue,
        status: editStatus,
      });

      // Update state directly from payload
      if (res.data?.extraction) {
        setExtraction({ ...res.data.extraction });
      }

      setEditField(null);
      await loadInspection();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not save declaration edit");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveVerdictOverride = async () => {
    if (!overrideCategory) return;
    if (!officerRemarks.trim()) {
      alert("Please provide an auditor justification / remark for this verdict override.");
      return;
    }
    setSavingVerdictOverride(true);
    try {
      const res = await api.patch(`/inspections/${id}/verdicts/override`, {
        category: overrideCategory,
        officer_verdict: officerVerdictChoice,
        officer_remarks: officerRemarks,
      });

      // Update categories state directly
      setCategories((prev) =>
        prev.map((cat) =>
          cat.category === overrideCategory
            ? {
                ...cat,
                officer_verdict: officerVerdictChoice,
                officer_remarks: officerRemarks,
              }
            : cat
        )
      );

      if (res.data?.overall_status) {
        setOverallStatus(res.data.overall_status);
      }

      setOverrideCategory(null);
      await loadInspection();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save override verdict");
    } finally {
      setSavingVerdictOverride(false);
    }
  };

  const handleCancelPipeline = () => {
    if (extractAbortRef.current) extractAbortRef.current.abort();
    if (verdictAbortRef.current) verdictAbortRef.current.abort();
    setActiveTask(null);
    setIsFailed(false);
    setTerminalOpen(false);
  };

  const handleDeleteInspection = async () => {
    if (!id || !window.confirm("Permanently delete this audit?")) return;
    setDeleting(true);
    try {
      await api.delete(`/inspections/${id}`);
      navigate("/inspections");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete inspection.");
      setDeleting(false);
    }
  };

  const handleDownloadReport = async () => {
    setReportGenerating(true);
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
      console.error("Report PDF generation error:", err);
      setError("Failed to generate PDF.");
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
              className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              {deleting ? <Loader2 size={16} className="animate-spin text-rose-600" /> : <Trash2 size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-xl p-4">
            {error}
          </p>
        )}

        {/* Product Images */}
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

        {/* Declarations Table with Original + Edited Display */}
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
                  const isDict = typeof field === "object" && field !== null;
                  const finalVal = isDict && "value" in field ? field.value : String(field ?? "—");
                  const rawVal = isDict && "raw_value" in field ? field.raw_value : finalVal;
                  const isEdited = isDict && Boolean(field.is_edited);
                  const statusVal = isDict && "status" in field ? field.status : null;

                  return (
                    <div key={key} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 py-3 text-sm items-center">
                      <span className="text-zinc-500 font-medium">
                        {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                      </span>

                      <div className="flex flex-col sm:col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0A1329] break-words">
                            {finalVal !== null && finalVal !== "" ? finalVal : "—"}
                          </span>
                          {isEdited && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1D3587] px-2 py-0.5 rounded-md border border-blue-200">
                              Officer Edited
                            </span>
                          )}
                        </div>

                        {/* Always display original Vision AI data if edited */}
                        {isEdited && (
                          <span className="text-xs text-zinc-400 font-mono mt-0.5">
                            Vision AI Original: <span className="text-zinc-600">{rawVal || "not detected"}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        {statusVal && <Badge value={statusVal} />}
                        <button
                          type="button"
                          onClick={() => {
                            setEditField(key);
                            setEditValue(finalVal !== "—" ? finalVal : "");
                            setEditStatus(statusVal || "visible");
                          }}
                          className="p-1.5 rounded-lg text-[#1D3587] hover:bg-slate-100 transition cursor-pointer"
                          title="Edit declaration"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Compliance Checklist with Officer Overrides */}
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

          {categories.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">Click "Run Compliance Check" to evaluate regulations.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {categories.map((cat: any, idx: number) => {
                const effectiveVerdict = cat.officer_verdict || cat.verdict;
                return (
                  <div key={cat.id || cat.category || idx} className="rounded-2xl bg-zinc-50/70 border border-zinc-200/80 p-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm uppercase tracking-wider text-[#0A1329]">
                        {CATEGORY_LABELS[cat.category] || cat.category.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        {cat.officer_verdict && (
                          <span className="text-[10px] font-bold uppercase text-zinc-400">
                            (AI: {cat.verdict})
                          </span>
                        )}
                        <Badge value={effectiveVerdict} />
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideCategory(cat.category);
                            setOfficerVerdictChoice(effectiveVerdict);
                            setOfficerRemarks(cat.officer_remarks || "");
                          }}
                          className="p-1.5 rounded-lg text-[#1D3587] hover:bg-zinc-200 transition cursor-pointer"
                          title="Override verdict"
                        >
                          <CheckSquare size={15} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600 leading-relaxed">{cat.reasoning}</p>
                    {cat.officer_remarks && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Officer Remarks: </span>
                        {cat.officer_remarks}
                      </div>
                    )}
                    {cat.rule_reference && (
                      <p className="text-xs font-medium text-zinc-400 mt-3 tracking-wider">
                        <span className="uppercase font-bold text-zinc-500">Rule Ref:</span> {cat.rule_reference}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Edit Declaration Modal Dialog */}
      {editField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl flex flex-col gap-4 border border-zinc-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase text-[#0A1329]">
                Edit {FIELD_LABELS[editField] || editField}
              </h3>
              <button
                type="button"
                onClick={() => setEditField(null)}
                className="text-zinc-400 hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Corrected Value:</label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-2.5 text-sm border border-zinc-300 rounded-xl focus:outline-hidden focus:border-[#1D3587]"
                placeholder="Enter corrected text..."
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-zinc-600">Visibility Status:</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="text-xs p-2 border border-zinc-200 rounded-lg bg-zinc-50 cursor-pointer"
              >
                <option value="visible">Visible</option>
                <option value="not_visible">Not Visible</option>
                <option value="illegible">Illegible</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditField(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveFieldEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Change"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Override Verdict Modal Dialog */}
      {overrideCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl flex flex-col gap-4 border border-zinc-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase text-[#0A1329]">
                Verdict Override: {CATEGORY_LABELS[overrideCategory] || overrideCategory}
              </h3>
              <button
                type="button"
                onClick={() => setOverrideCategory(null)}
                className="text-zinc-400 hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Officer Decision:</label>
              <div className="flex gap-2">
                {(["PASS", "ISSUE", "REVIEW_REQUIRED"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setOfficerVerdictChoice(v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      officerVerdictChoice === v
                        ? "bg-[#1D3587] text-white border-[#1D3587]"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Justification / Auditor Remarks:</label>
              <textarea
                rows={3}
                value={officerRemarks}
                onChange={(e) => setOfficerRemarks(e.target.value)}
                placeholder="Provide statutory justification for override..."
                className="w-full p-2.5 text-xs border border-zinc-300 rounded-xl focus:outline-hidden focus:border-[#1D3587]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOverrideCategory(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveVerdictOverride}
                disabled={savingVerdictOverride}
              >
                {savingVerdictOverride ? "Saving..." : "Apply Override"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Technical Telemetry Modal */}
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