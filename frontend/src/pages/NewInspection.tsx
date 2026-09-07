import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Loader2, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

interface ImageSlot {
  side: "front" | "back" | "left" | "right" | "top" | "bottom";
  label: string;
  file: File | null;
  preview: string | null;
}

const INITIAL_SLOTS: ImageSlot[] = [
  { side: "front", label: "Front Face (MRP / Brand)", file: null, preview: null },
  { side: "back", label: "Back Panel (Declarations / Address)", file: null, preview: null },
  { side: "left", label: "Left Panel", file: null, preview: null },
  { side: "right", label: "Right Panel", file: null, preview: null },
  { side: "top", label: "Top Flap", file: null, preview: null },
  { side: "bottom", label: "Bottom Flap", file: null, preview: null },
];

export default function NewInspection() {
  const navigate = useNavigate();
  const [productName, setProductName] = useState("");
  const [manufacturerHint, setManufacturerHint] = useState("");
  const [slots, setSlots] = useState<ImageSlot[]>(INITIAL_SLOTS);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleFileSelect = (side: string, file: File | null) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setSlots((prev) =>
      prev.map((slot) =>
        slot.side === side ? { ...slot, file, preview: previewUrl } : slot
      )
    );
  };

  const handleRemoveImage = (side: string) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.side === side) {
          if (slot.preview) URL.revokeObjectURL(slot.preview);
          return { ...slot, file: null, preview: null };
        }
        return slot;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const selectedImages = slots.filter((slot) => slot.file !== null);
    if (selectedImages.length === 0) {
      setError("Please attach at least one package label image (e.g., Front or Back).");
      return;
    }

    setSubmitting(true);

    try {
      const uploadedImagesPayload: { file_key: string; side: string }[] = [];

      // Upload each image via presigned URL to R2
      for (let i = 0; i < selectedImages.length; i++) {
        const slot = selectedImages[i];
        const file = slot.file!;
        
        setStatusMessage(`Requesting upload ticket for ${slot.label}...`);

        // 1. Send filename and content_type to satisfy PresignedUrlRequest
        const presignedRes = await api.post("/inspections/presigned-url", {
          filename: file.name,
          content_type: file.type || "image/jpeg",
        });

        const { upload_url, file_key } = presignedRes.data;

        setStatusMessage(`Uploading image ${i + 1} of ${selectedImages.length} to storage...`);

        // 2. Direct binary upload to R2
        const uploadRes = await fetch(upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "image/jpeg",
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${file.name} to storage.`);
        }

        uploadedImagesPayload.push({
          file_key,
          side: slot.side,
        });
      }

      setStatusMessage("Registering audit record...");

      // 3. Create inspection record in database
      const inspectionRes = await api.post("/inspections", {
        product_name: productName || null,
        manufacturer_hint: manufacturerHint || null,
        images: uploadedImagesPayload,
      });

      // 4. Redirect directly to inspection detail view
      navigate(`/inspections/${inspectionRes.data.id}`);
    } catch (err: any) {
      console.error("Failed to create inspection:", err);
      setError(
        err.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : err.message || "Failed to create inspection. Please try again."
      );
      setSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto flex flex-col gap-6"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white border border-zinc-200/80 text-zinc-600 hover:text-black hover:bg-zinc-50 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0A1329]">
            New <span className="text-[#1D3587]">Inspection</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
            Upload commodity packaging faces to initiate statutory verification.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs sm:text-sm font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Product Information Card */}
        <Card className="p-6 sm:p-8 flex flex-col gap-4">
          <h2 className="text-base font-bold uppercase tracking-tight text-[#0A1329] border-b border-zinc-100 pb-3">
            Commodity Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Product Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Aqualens Lens Cleaner"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#1D3587]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Manufacturer / Packer Hint (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Stericon Pharma Pvt. Ltd."
                value={manufacturerHint}
                onChange={(e) => setManufacturerHint(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#1D3587]"
              />
            </div>
          </div>
        </Card>

        {/* Package Faces Upload Card */}
        <Card className="p-6 sm:p-8 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold uppercase tracking-tight text-[#0A1329]">
                Package Label Panels
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                At least one face with mandatory declarations is required.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {slots.map((slot) => (
              <div
                key={slot.side}
                className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-50/70 border border-zinc-200/80 text-center relative group"
              >
                <input
                type="file"
  accept="image/*"
  ref={(el) => {
    fileInputRefs.current[slot.side] = el;
  }}
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(slot.side, file);
  }}
  disabled={submitting}
/>

                {slot.preview ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-black/5">
                    <img
                      src={slot.preview}
                      alt={slot.label}
                      className="w-full h-full object-cover"
                    />
                    {!submitting && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(slot.side)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[slot.side]?.click()}
                    disabled={submitting}
                    className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 hover:border-[#1D3587] flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-[#1D3587] transition-colors p-3"
                  >
                    <ImageIcon size={28} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Upload Panel
                    </span>
                  </button>
                )}

                <span className="text-xs font-bold text-[#0A1329] truncate">
                  {slot.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <p className="text-xs font-medium text-zinc-500">
            {statusMessage || "Direct encrypted upload via Cloudflare R2"}
          </p>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3 text-xs tracking-widest uppercase font-bold"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Upload size={16} /> Submit for Inspection
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}