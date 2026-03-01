"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import Link from "next/link";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 60; // 2 min timeout

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (checksum: string) => {
    pollAttemptsRef.current = 0;
    setState("processing");
    setMessage("Workbook uploaded. ETL pipeline is processing...");

    pollRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;

      if (pollAttemptsRef.current > POLL_MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setState("error");
        setMessage("Processing timed out. Please try again.");
        return;
      }

      try {
        const res = await fetch(`/api/upload/status/${checksum}`);
        const data = await res.json();

        if (data.status === "complete") {
          clearInterval(pollRef.current!);
          setRowCount(data.rowCount);
          setState("success");
          setMessage(
            `Successfully imported ${data.rowCount.toLocaleString()} journal entries. Dashboards are now populated.`
          );
        } else if (data.status === "error") {
          clearInterval(pollRef.current!);
          setState("error");
          setMessage(data.errorMessage || "ETL processing failed. Please try again.");
        }
        // status === "processing" or "pending" → keep polling
      } catch {
        // Network blip — keep polling
      }
    }, POLL_INTERVAL_MS);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      setState("error");
      setMessage("Only .xlsx Excel files are supported.");
      return;
    }

    setState("uploading");
    setMessage("Uploading workbook...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setState("error");
        setMessage(result.error || "Upload failed. Please try again.");
        return;
      }

      // Start polling the ETL status using the full checksum
      startPolling(result.checksum);
    } catch {
      setState("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setState("idle");
    setMessage("");
    setRowCount(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-1">
          Upload Workbook
        </h1>
        <p className="text-muted-foreground mb-8">
          Upload the Lansport accounting workbook (.xlsx) to refresh all
          dashboards with the latest financial data.
        </p>

        {/* Drop zone */}
        <div
          className={`rounded-xl border-2 border-dashed p-14 text-center transition-colors ${
            state === "idle"
              ? `cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/10"
                }`
              : "border-border"
          }`}
          onClick={() => state === "idle" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (state === "idle") setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (state === "idle") {
              const file = e.dataTransfer.files[0];
              if (file) handleUpload(file);
            }
          }}
        >
          {state === "idle" && (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">
                Drag & drop your workbook here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Supported format: .xlsx (Excel workbook)
              </p>
            </>
          )}

          {state === "uploading" && (
            <>
              <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-foreground font-medium">{message}</p>
            </>
          )}

          {state === "processing" && (
            <>
              <Clock className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
              <p className="text-foreground font-medium">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Parsing all worksheets and loading into database...
              </p>
            </>
          )}

          {state === "success" && (
            <>
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">{message}</p>
              {rowCount !== null && (
                <p className="text-sm text-muted-foreground mb-5">
                  {rowCount.toLocaleString()} entries · all dashboards updated
                </p>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
              >
                View Dashboard
              </Link>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
              <p className="text-foreground font-medium mb-4">{message}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="inline-flex items-center gap-2 border border-border px-6 py-2.5 rounded-md font-medium hover:bg-muted transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Data is processed locally — your workbook never leaves your machine.
        </p>
      </div>
    </div>
  );
}
