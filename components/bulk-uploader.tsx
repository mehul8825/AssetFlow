"use client";

import { useState, useCallback } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BulkUploader({ onSuccess }: { onSuccess: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
      } else {
        toast.error("Please upload a valid CSV file");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processCSV = async () => {
    if (!file) return;
    setIsUploading(true);
    setResults(null);
    
    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
      
      // Skip header row if it exists (assuming it starts with "Asset" or "Employee")
      const dataRows = rows[0].toLowerCase().includes('asset') ? rows.slice(1) : rows;
      
      const allocations = dataRows.map(row => {
        // Handle basic comma separated values (AssetTag, EmployeeEmail)
        const cols = row.split(',').map(c => c.trim());
        return {
          assetTag: cols[0],
          employeeEmail: cols[1],
        };
      }).filter(a => a.assetTag && a.employeeEmail);

      if (allocations.length === 0) {
        toast.error("No valid allocations found in the CSV");
        setIsUploading(false);
        return;
      }

      const res = await fetch("/api/allocations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations })
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Failed to process bulk upload");
      } else {
        setResults(data);
        if (data.success > 0) {
          toast.success(`Successfully allocated ${data.success} assets!`);
          onSuccess();
        }
      }
    } catch (err) {
      toast.error("An error occurred while parsing the CSV");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div 
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/5 hover:border-primary/50'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".csv" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {file ? file.name : "Drag & Drop your CSV file here"}
            </h3>
            <p className="text-sm text-muted-foreground">
              or click to browse from your computer
            </p>
          </div>
          {!file && (
            <p className="text-xs text-muted-foreground pt-4">
              Format: AssetTag, EmployeeEmail (e.g., AF-0001, john@example.com)
            </p>
          )}
        </div>
      </div>

      {file && !results && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setFile(null)} disabled={isUploading}>Cancel</Button>
          <Button onClick={processCSV} disabled={isUploading} className="min-w-[140px]">
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              "Upload & Allocate"
            )}
          </Button>
        </div>
      )}

      {results && (
        <div className="p-6 rounded-xl border bg-card space-y-4 animate-in slide-in-from-bottom-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Upload Results
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex flex-col items-center justify-center">
              <CheckCircle2 className="w-6 h-6 mb-2" />
              <span className="text-2xl font-bold">{results.success}</span>
              <span className="text-xs uppercase tracking-wider font-medium">Successful</span>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex flex-col items-center justify-center">
              <AlertCircle className="w-6 h-6 mb-2" />
              <span className="text-2xl font-bold">{results.failed}</span>
              <span className="text-xs uppercase tracking-wider font-medium">Failed</span>
            </div>
          </div>
          
          {results.errors && results.errors.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Error Details:</p>
              <div className="max-h-40 overflow-y-auto text-xs space-y-1 bg-destructive/5 p-3 rounded-md border border-destructive/10 text-destructive">
                {results.errors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            </div>
          )}
          
          <Button variant="outline" className="w-full mt-4" onClick={() => { setFile(null); setResults(null); }}>
            Upload Another File
          </Button>
        </div>
      )}
    </div>
  );
}
