import { useEffect, useState } from "react";
import { Terminal, CheckCircle2, AlertTriangle, RefreshCw, X, Ban } from "lucide-react";
import { motion } from "framer-motion";

export type PipelineStage = {
  label: string;
  status: "pending" | "running" | "success" | "error";
  technicalDetail?: string;
};

interface ProcessingTerminalModalProps {
  isOpen: boolean;
  title: string;
  stages: PipelineStage[];
  currentAttempt: number;
  maxAttempts: number;
  isFailed: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onClose: () => void;
  onCancel?: () => void;
}

export default function ProcessingTerminalModal({
  isOpen,
  title,
  stages,
  currentAttempt,
  maxAttempts,
  isFailed,
  errorMessage,
  onRetry,
  onClose,
  onCancel,
}: ProcessingTerminalModalProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const runningStage = stages.find((s) => s.status === "running");
    if (runningStage?.technicalDetail) {
      setLogs((prev) => [...prev.slice(-5), runningStage.technicalDetail!]);
    }
  }, [stages]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden flex flex-col font-sans"
      >
        {/* Soft Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#1D3587]/10 flex items-center justify-center text-[#1D3587]">
              <Terminal size={13} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1329]">
                {title}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wide text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
              ATTEMPT {currentAttempt}/{maxAttempts}
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
              title="Cancel and close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="p-5 flex flex-col gap-3.5 bg-white">
          <div className="flex flex-col gap-2.5">
            {stages.map((stage, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {stage.status === "running" && (
                    <RefreshCw size={13} className="animate-spin text-[#1D3587]" />
                  )}
                  {stage.status === "success" && (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  )}
                  {stage.status === "error" && (
                    <AlertTriangle size={13} className="text-rose-500" />
                  )}
                  {stage.status === "pending" && (
                    <div className="w-3 h-3 rounded-full border border-slate-300 bg-slate-100" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs ${
                      stage.status === "running"
                        ? "text-[#0A1329] font-bold"
                        : stage.status === "success"
                        ? "text-slate-700 font-medium"
                        : stage.status === "error"
                        ? "text-rose-600 font-semibold"
                        : "text-slate-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                  {stage.technicalDetail && stage.status === "running" && (
                    <span className="text-[11px] font-mono text-[#1D3587] mt-0.5 animate-pulse truncate">
                      ↳ {stage.technicalDetail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Soft Console Telemetry Box */}
          <div className="mt-1 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl flex flex-col gap-1.5 font-mono text-[11px] min-h-[75px] max-h-[105px] overflow-y-auto">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
              <span>Telemetry Feed</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                ACTIVE
              </span>
            </div>

            {logs.map((log, i) => (
              <p key={i} className="text-slate-600 truncate leading-relaxed">
                <span className="text-[#1D3587] font-semibold mr-1.5">[SYS]</span>
                {log}
              </p>
            ))}

            {errorMessage && (
              <p className="text-rose-600 font-medium">
                <span className="font-bold mr-1.5">[ERR]</span>
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <Ban size={12} />
            <span>Cancel</span>
          </button>

          {isFailed ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-bold bg-[#1D3587] hover:bg-[#152763] text-white px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Processing statutory analysis...
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}