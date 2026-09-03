import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";

type PanelSide = "front" | "back" | "top" | "bottom" | "left" | "right";

const SIDES: { label: string; value: PanelSide }[] = [
  { label: "Front Panel", value: "front" },
  { label: "Back Panel", value: "back" },
  { label: "Top Panel", value: "top" },
  { label: "Bottom Panel", value: "bottom" },
  { label: "Left Panel", value: "left" },
  { label: "Right Panel", value: "right" },
];

export default function NewInspection() {
  const navigate = useNavigate();
  const [productName, setProductName] = useState("");
  const [manufacturerHint, setManufacturerHint] = useState("");
  const [files, setFiles] = useState<Partial<Record<PanelSide, File>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (side: PanelSide, e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({ ...prev, [side]: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const activeEntries = Object.entries(files) as [PanelSide, File][];
    if (activeEntries.length === 0) {
      setError("Please select at least one panel image.");
      return;
    }

    setSubmitting(true);

    try {
      const uploadedImages: { side: string; file_key: string }[] = [];

      for (const [side, file] of activeEntries) {
        // 1. Request presigned URL (Includes filename and content_type)
        const presignedRes = await api.post("/inspections/presigned-url", {
          filename: file.name,
          content_type: file.type || "image/jpeg",
        });

        const { upload_url, file_key } = presignedRes.data;

        // 2. Direct PUT upload to storage
        await axios.put(upload_url, file, {
          headers: {
            "Content-Type": file.type || "image/jpeg",
          },
        });

        uploadedImages.push({
          side,
          file_key,
        });
      }

      // 3. Finalize inspection record in backend
      await api.post("/inspections", {
        product_name: productName,
        manufacturer_hint: manufacturerHint || null,
        images: uploadedImages,
      });

      navigate("/inspections");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to submit inspection. Please verify image upload settings.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white border rounded shadow-sm">
      <h1 className="text-2xl font-bold mb-6">New Metrology Inspection</h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Product Name *</label>
          <input
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g., Basmati Rice 5kg"
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Manufacturer Hint (Optional)</label>
          <input
            type="text"
            value={manufacturerHint}
            onChange={(e) => setManufacturerHint(e.target.value)}
            placeholder="e.g., ABC Foods Ltd."
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <h2 className="text-sm font-medium mb-2">Upload Package Panels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SIDES.map(({ label, value }) => (
              <div key={value} className="border p-3 rounded">
                <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                  {label}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(value, e)}
                  className="text-sm w-full"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white py-2 px-4 rounded hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Uploading & Creating Inspection..." : "Submit Inspection"}
        </button>
      </form>
    </div>
  );
}