import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileDown, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Inspection } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { generateComplianceReport } from "../lib/generatePdfReport";

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

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | any>(null);
  const [extraction, setExtraction] = useState<Record<string, any> | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadInspection = async () => {
    try {
      const res = await api.get(`/inspections/${id}`);
      const data = res.data;
      setInspection(data);

      // 1. Read extraction directly from database 'extractions' array
      if (Array.isArray(data.extractions) && data.extractions.length > 0) {
        const latest = data.extractions[data.extractions.length - 1];
        setExtraction(latest.extraction_data || latest);
      } else if (data.extraction) {
        setExtraction(data.extraction);
      }

      // 2. Read checklist from database 'verdicts' array
      if (Array.isArray(data.verdicts) && data.verdicts.length > 0) {
        setCategories(data.verdicts);
      } else if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }

      // 3. Sync status
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runExtraction = async () => {
    setExtracting(true);
    setError("");
    try {
      const res = await api.post(`/inspections/${id}/extract`);
      const payload = res.data.extraction || res.data.extraction_data || res.data;
      setExtraction(payload);
      await loadInspection();
    } catch (err) {
      console.error("Extraction error:", err);
      setError("Extraction failed. Check backend logs.");
    } finally {
      setExtracting(false);
    }
  };

  const runVerdict = async () => {
    setVerdictLoading(true);
    setError("");
    try {
      const res = await api.post(`/inspections/${id}/verdict`);
      if (Array.isArray(res.data.categories)) {
        setCategories(res.data.categories);
      } else if (Array.isArray(res.data.verdicts)) {
        setCategories(res.data.verdicts);
      }
      if (res.data.overall_status) {
        setOverallStatus(res.data.overall_status);
      }
      await loadInspection();
    } catch (err) {
      console.error("Verdict error:", err);
      setError("Compliance check failed. Check backend logs.");
    } finally {
      setVerdictLoading(false);
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-8 max-w-6xl mx-auto w-full"
    >
      {/* Header */}
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
          
          {/* Working PDF Report Download Button */}
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
        </div>
      </div>

      {error && (
        <p className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-xl p-4">
          {error}
        </p>
      )}

      {/* Package Images */}
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

      {/* Extracted Declarations */}
      <Card className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
          <h2 className="text-lg md:text-xl flex items-center gap-2 text-[#0A1329]">
            <Sparkles size={20} className="text-[#1D3587]" /> Extracted Declarations
          </h2>
          <Button onClick={runExtraction} disabled={extracting}>
            {extracting ? "Extracting..." : extraction ? "Re-run Extraction" : "Run Extraction"}
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

      {/* Compliance Checklist */}
      <Card className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100">
          <h2 className="text-lg md:text-xl flex items-center gap-2 text-[#0A1329]">
            <ShieldCheck size={20} className="text-[#1D3587]" /> Compliance Checklist
          </h2>
          {extraction && (
            <Button onClick={runVerdict} disabled={verdictLoading} variant={categories.length > 0 ? "primary" : "secondary"}>
              {verdictLoading ? "Checking..." : categories.length > 0 ? "Re-run Check" : "Run Compliance Check"}
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
  );
}