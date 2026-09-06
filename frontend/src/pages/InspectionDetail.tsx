import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Inspection, ExtractionField, Verdict } from "../types";

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
  mrp: "MRP",
  net_quantity: "Net Quantity",
  manufacturer_details: "Manufacturer Details",
  country_of_origin: "Country of Origin",
  consumer_care: "Consumer Care",
};

function StatusBadge({ status }: { status?: ExtractionField["status"] }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    visible: "bg-green-100 text-green-800",
    not_visible: "bg-gray-100 text-gray-600",
    illegible: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded capitalize ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    PASS: "bg-green-100 text-green-800",
    ISSUE: "bg-red-100 text-red-800",
    REVIEW_REQUIRED: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded ${colors[verdict] || "bg-gray-100 text-gray-800"}`}>
      {verdict.replace("_", " ")}
    </span>
  );
}

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [extraction, setExtraction] = useState<any | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [error, setError] = useState("");

  const loadInspection = async () => {
    try {
      const res = await api.get(`/inspections/${id}`);
      setInspection(res.data);
      if (res.data.latest_extraction) {
        setExtraction(res.data.latest_extraction);
      }
      if (res.data.latest_verdict) {
        setVerdict(res.data.latest_verdict);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load inspection.");
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
      // Explicitly set state from POST response so UI updates immediately
      if (res.data) {
        setExtraction(res.data);
      }
      await loadInspection();
    } catch (err) {
      console.error(err);
      setError("Extraction failed. Check the backend logs.");
    } finally {
      setExtracting(false);
    }
  };

  const runVerdict = async () => {
    setVerdictLoading(true);
    setError("");
    try {
      const res = await api.post(`/inspections/${id}/verdict`);
      setVerdict(res.data);
    } catch (err) {
      console.error(err);
      setError("Compliance check failed. Check the backend logs.");
    } finally {
      setVerdictLoading(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!inspection) return <p className="p-6">Inspection not found.</p>;

  // Safely resolve the extracted dictionary across both schema formats
  const extractedMap: Record<string, ExtractionField> =
    extraction?.extraction ||
    extraction?.extraction_data ||
    (extraction && !extraction.inspection_id && typeof extraction === "object" ? extraction : null);

  const hasFields = extractedMap && Object.keys(extractedMap).length > 0;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-xl font-bold">
            {inspection.product_name || "Unnamed product"}
          </h1>
          <p className="text-sm text-gray-600">Status: {inspection.status}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {verdict && <VerdictBadge verdict={verdict.overall_status} />}
          {!hasFields && (
            <button
              onClick={runExtraction}
              disabled={extracting}
              className="bg-black text-white px-3 py-2 rounded disabled:opacity-50"
            >
              {extracting ? "Extracting..." : "Run Extraction"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Package images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {inspection.images?.map((img) => (
          <div key={img.id} className="border rounded overflow-hidden">
            <img src={img.download_url} alt={img.side} className="w-full h-40 object-cover" />
            <p className="text-xs text-center py-1 capitalize bg-gray-50">{img.side}</p>
          </div>
        ))}
      </div>

      {/* Extracted declarations */}
      <h2 className="text-lg font-semibold mb-2">Extracted Declarations</h2>
      {!hasFields ? (
        <p className="text-sm text-gray-600 mb-8 border rounded p-4 bg-gray-50">
          No extraction yet — click "Run Extraction" above.
        </p>
      ) : (
        <table className="w-full text-sm mb-8 border-collapse border">
          <thead>
            <tr className="bg-gray-50 border-b text-left">
              <th className="py-2.5 px-3 font-semibold text-gray-700 w-1/3">Field</th>
              <th className="py-2.5 px-3 font-semibold text-gray-700">Extracted Value</th>
              <th className="py-2.5 px-3 font-semibold text-gray-700 w-28">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(FIELD_LABELS).map((key) => {
              const item = extractedMap[key];
              return (
                <tr key={key} className="border-b hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-800">
                    {FIELD_LABELS[key]}
                  </td>
                  <td className="py-2.5 px-3 text-gray-700 font-mono text-xs">
                    {item?.value ?? "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={item?.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Compliance checklist */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Compliance Checklist</h2>
        {hasFields && (
          <button
            onClick={runVerdict}
            disabled={verdictLoading}
            className="bg-black text-white px-3 py-2 rounded text-sm disabled:opacity-50"
          >
            {verdictLoading ? "Checking..." : verdict ? "Re-run Check" : "Run Compliance Check"}
          </button>
        )}
      </div>

      {!hasFields ? (
        <p className="text-sm text-gray-600 border rounded p-4 bg-gray-50">
          Run extraction first — the compliance check needs extracted declarations to evaluate.
        </p>
      ) : !verdict ? (
        <p className="text-sm text-gray-600 border rounded p-4 bg-gray-50">
          Not run yet — click "Run Compliance Check" above.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {verdict.categories?.map((cat) => (
            <div key={cat.category} className="border rounded p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{CATEGORY_LABELS[cat.category] || cat.category}</span>
                <VerdictBadge verdict={cat.verdict} />
              </div>
              <p className="text-sm text-gray-700">{cat.reasoning}</p>
              {cat.rule_reference && (
                <p className="text-xs text-gray-500 mt-1">Rule: {cat.rule_reference}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}