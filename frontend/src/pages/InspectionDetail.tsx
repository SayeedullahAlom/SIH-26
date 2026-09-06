import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Inspection, ExtractionField, ExtractionFields } from "../types";

const FIELD_LABELS: Record<keyof ExtractionFields, string> = {
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

function StatusBadge({ status }: { status?: ExtractionField["status"] }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    visible: "bg-green-100 text-green-800",
    not_visible: "bg-gray-100 text-gray-600",
    illegible: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${colors[status] || ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [fields, setFields] = useState<ExtractionFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const loadInspection = async () => {
    try {
      const res = await api.get(`/inspections/${id}`);
      setInspection(res.data);

      // Support either extraction key convention from GET response
      const existing = res.data.latest_extraction;
      if (existing) {
        setFields(existing.extraction || existing.extraction_data || null);
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
      // Target the exact response shape: res.data.extraction
      if (res.data?.extraction) {
        setFields(res.data.extraction);
      } else if (res.data?.extraction_data) {
        setFields(res.data.extraction_data);
      }
      await loadInspection();
    } catch (err) {
      console.error(err);
      setError("Extraction failed. Check the backend logs.");
    } finally {
      setExtracting(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!inspection) return <p className="p-6">Inspection not found.</p>;

  const hasFields = fields && Object.keys(fields).length > 0;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-xl font-bold">
            {inspection.product_name || "Unnamed product"}
          </h1>
          <p className="text-sm text-gray-600">Status: {inspection.status}</p>
        </div>
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
        <table className="w-full text-sm mb-8 border-collapse border rounded">
          <thead>
            <tr className="bg-gray-100 border-b text-left">
              <th className="py-2.5 px-3 font-semibold text-gray-700">Declaration Field</th>
              <th className="py-2.5 px-3 font-semibold text-gray-700">Extracted Value</th>
              <th className="py-2.5 px-3 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(FIELD_LABELS) as Array<keyof ExtractionFields>).map((key) => {
              const item = fields[key];
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

      {/* Compliance checklist — placeholder until Phase 5 */}
      <h2 className="text-lg font-semibold mb-2">Compliance Checklist</h2>
      <p className="text-sm text-gray-600 border rounded p-4 bg-gray-50">
        Compliance verdicts aren't available yet — this section will populate once
        Phase 5 (the verdict engine) is live on the backend.
      </p>
    </div>
  );
}