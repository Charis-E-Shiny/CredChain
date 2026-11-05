"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { chainConfig } from "@/config/contracts";
import {
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Hash,
  RefreshCw,
  ChevronRight,
  Info,
  Trash2,
  BrainCircuit,
} from "lucide-react";
import {
  VerificationStatusResponse,
  VerificationStatusType,
  DiscrepancyReport,
} from "@/types";
import Link from "next/link";

const STATUS_CONFIG: Record<
  VerificationStatusType,
  { label: string; bg: string; text: string; border: string; icon: any; description: string }
> = {
  UNVERIFIED: {
    label: "UNVERIFIED",
    bg: "bg-[#B77B26]/10",
    text: "text-[#B77B26]",
    border: "border-[#B77B26]/30",
    icon: Clock,
    description:
      "Financial values are self-declared without documentary evidence. Upload supporting documents to proceed.",
  },
  EVIDENCE_CHECKED: {
    label: "EVIDENCE CHECKED",
    bg: "bg-[#315B4C]/10",
    text: "text-[#315B4C]",
    border: "border-[#315B4C]/30",
    icon: FileCheck2,
    description:
      "Supporting documents uploaded and parsed. Extracted values reconciled within 5% tolerance. Document issuer is NOT independently authenticated.",
  },
  SOURCE_VERIFIED: {
    label: "SOURCE VERIFIED",
    bg: "bg-[#34765A]/10",
    text: "text-[#34765A]",
    border: "border-[#34765A]/30",
    icon: ShieldCheck,
    description:
      "Income and employment independently confirmed by an authorized protocol verifier or accredited institution.",
  },
  MANUAL_REVIEW: {
    label: "MANUAL REVIEW",
    bg: "bg-[#B94B45]/10",
    text: "text-[#B94B45]",
    border: "border-[#B94B45]/30",
    icon: AlertTriangle,
    description:
      "Extracted document values diverge from declared figures by more than 5%, or automated parsing requires human verification.",
  },
};

export default function VerificationPage() {
  const { address } = useAccount();
  const activeAddress =
    address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verData, setVerData] = useState<VerificationStatusResponse | null>(null);
  const [discrepancy, setDiscrepancy] = useState<DiscrepancyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    annual_income: "75000",
    monthly_debt: "800",
    employment_length_years: "4",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("salary_slip");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteDocument = async (docId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to remove "${fileName}"?`)) return;

    setDeletingDocId(docId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(
        `${chainConfig.apiUrl}/api/verification/document/${docId}?wallet_address=${activeAddress}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to remove document");
      }

      setSuccessMsg(`"${fileName}" was removed successfully.`);
      await fetchStatus();
      setDiscrepancy(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  // Fetch verification status from backend
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${chainConfig.apiUrl}/api/verification/status/${activeAddress}`
      );
      if (res.ok) {
        const data: VerificationStatusResponse = await res.json();
        setVerData(data);
        if (data.declared_annual_income > 0) {
          setFormData({
            annual_income: String(data.declared_annual_income),
            monthly_debt: String(data.declared_monthly_debt),
            employment_length_years: String(data.declared_employment_years),
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching verification:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [activeAddress]);

  // Upload document
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Select a document (PDF, JPG, PNG) to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("wallet_address", activeAddress);
    fd.append("document_type", docType);

    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/verification/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const errJ = await res.json();
        throw new Error(errJ.detail || "Upload failed");
      }
      const result = await res.json();
      setSuccessMsg(result.message || "Document uploaded successfully.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Run verification analysis
  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        wallet_address: activeAddress,
        declared_annual_income: parseFloat(formData.annual_income) || 0,
        declared_monthly_debt: parseFloat(formData.monthly_debt) || 0,
        declared_employment_years:
          parseFloat(formData.employment_length_years) || 0,
        tolerance_percentage: 5.0,
      };

      const res = await fetch(
        `${chainConfig.apiUrl}/api/verification/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const errJ = await res.json();
        throw new Error(errJ.detail || "Verification analysis failed");
      }
      const report: DiscrepancyReport = await res.json();
      setDiscrepancy(report);
      setSuccessMsg(
        report.is_within_tolerance
          ? "Reconciliation passed: extracted values match declarations within tolerance."
          : "Discrepancy detected: flagged for manual review."
      );
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const currentStatus: VerificationStatusType = verData?.status || "UNVERIFIED";
  const cfg = STATUS_CONFIG[currentStatus];
  const StatusIcon = cfg.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E1D7] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#183B32]/10 text-[#183B32] text-xs font-semibold mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Financial Trust Layer
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#252C29]">
            Borrower Financial Verification
          </h1>
          <p className="text-sm text-[#777B73] mt-1">
            Reconcile declared income against uploaded payroll statements, tax
            returns, and bank credits.
          </p>
        </div>

        <div
          className={`flex flex-col items-end p-3 rounded-xl border ${cfg.border} ${cfg.bg}`}
        >
          <div className="text-[10px] uppercase font-bold text-[#777B73] tracking-wider">
            Verification Standing
          </div>
          <div
            className={`text-base font-extrabold flex items-center gap-1.5 mt-0.5 ${cfg.text}`}
          >
            <StatusIcon className="h-4 w-4" />
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Educational Advisory */}
      <div className="p-4 rounded-xl border border-[#E5E1D7] bg-white shadow-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-[#315B4C] shrink-0 mt-0.5" />
        <div className="text-xs text-[#252C29] leading-relaxed">
          <span className="font-semibold text-[#183B32]">
            Tier Verification Model:
          </span>{" "}
          Document matching assigns{" "}
          <strong className="text-[#315B4C]">EVIDENCE_CHECKED</strong> to
          confirm mathematical reconciliation within a 5% tolerance window. To
          prevent forged paper risks, only authorized verifiers or banking API
          feeds can award{" "}
          <strong className="text-[#34765A]">SOURCE_VERIFIED</strong> status.
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl border border-[#B94B45]/30 bg-[#B94B45]/10 text-xs text-[#B94B45] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl border border-[#34765A]/30 bg-[#34765A]/10 text-xs text-[#34765A] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* A. Declared Financial Profile */}
          <div className="p-6 rounded-xl border border-[#E5E1D7] bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#252C29]">
                  Declared Financial Information
                </h2>
                <p className="text-xs text-[#777B73]">
                  Values submitted during AI credit assessment.
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-[#F4F1E8] rounded border border-[#E5E1D7] text-[#252C29]">
                {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div className="space-y-1.5">
                <label className="font-medium text-[#777B73]">
                  Annual Income ($)
                </label>
                <input
                  type="number"
                  value={formData.annual_income}
                  onChange={(e) =>
                    setFormData({ ...formData, annual_income: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/50 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                />
                <span className="text-[10px] text-[#777B73]">
                  Monthly: $
                  {(
                    parseFloat(formData.annual_income || "0") / 12
                  ).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#777B73]">
                  Monthly Debt ($)
                </label>
                <input
                  type="number"
                  value={formData.monthly_debt}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_debt: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/50 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#777B73]">
                  Employment Duration (Years)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.employment_length_years}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employment_length_years: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/50 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                />
              </div>

              {/* Lending Route Indicator */}
              <div className="space-y-1.5">
                <label className="font-medium text-[#777B73]">
                  Lending Eligibility
                </label>
                <div
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                    verData?.can_proceed_standard_lending
                      ? "border-[#34765A]/30 bg-[#34765A]/10 text-[#34765A]"
                      : "border-[#B77B26]/30 bg-[#B77B26]/10 text-[#B77B26]"
                  }`}
                >
                  {verData?.lending_route?.replace(/_/g, " ") ||
                    "UNVERIFIED RESTRICTED"}
                </div>
              </div>
            </div>
          </div>

          {/* B. Document Upload */}
          <div className="p-6 rounded-xl border border-[#E5E1D7] bg-white shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#252C29]">
                Upload Supporting Financial Documents
              </h2>
              <p className="text-xs text-[#777B73]">
                Upload PDF salary slips, bank statements, or scanned employment
                letters (Max 10MB).
              </p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-xs">
                  <label className="font-medium text-[#777B73]">
                    Document Category
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/50 text-[#252C29] focus:outline-none focus:border-[#183B32]"
                  >
                    <option value="salary_slip">Salary Slip / Pay Stub</option>
                    <option value="bank_statement">Bank Statement</option>
                    <option value="employment_letter">
                      Employment Letter / Contract
                    </option>
                    <option value="tax_return">Tax Return (W-2 / Form 16)</option>
                    <option value="other">Other Proof</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="font-medium text-[#777B73]">
                    Select File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-xs text-[#777B73] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#E5E1D7] file:bg-[#183B32] file:text-white file:text-xs hover:file:opacity-90 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 rounded-lg bg-[#183B32] text-white text-xs font-semibold hover:bg-[#315B4C] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Uploaded Documents List */}
            <div className="pt-2 border-t border-[#E5E1D7]">
              <h3 className="text-xs font-semibold text-[#252C29] mb-3">
                Uploaded Evidence Files ({verData?.documents?.length || 0})
              </h3>
              {!verData?.documents?.length ? (
                <div className="p-4 rounded-lg border border-dashed border-[#E5E1D7] text-center text-xs text-[#777B73]">
                  No financial documents uploaded yet. Upload a salary slip or
                  bank statement to proceed.
                </div>
              ) : (
                <div className="space-y-2">
                  {verData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-[#183B32]" />
                        <div>
                          <div className="font-medium text-[#252C29]">
                            {doc.file_name}
                          </div>
                          <div className="text-[10px] text-[#777B73]">
                            {doc.document_type} •{" "}
                            {(doc.file_size_bytes / 1024).toFixed(1)} KB •{" "}
                            {new Date(doc.upload_timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          {doc.extracted_gross_income ? (
                            <div className="text-[10px] font-semibold text-[#34765A]">
                              Gross: ${doc.extracted_gross_income.toLocaleString()}
                            </div>
                          ) : doc.extracted_income ? (
                            <div className="text-[10px] font-semibold text-[#34765A]">
                              Gross: ${doc.extracted_income.toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#B77B26]/10 text-[#B77B26]">
                              Manual Review
                            </span>
                          )}
                          {doc.extracted_net_income && (
                            <div className="text-[10px] text-[#777B73]">
                              Net: ${doc.extracted_net_income.toLocaleString()}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                          disabled={deletingDocId === doc.id}
                          title="Remove uploaded document"
                          className="p-1.5 rounded-lg border border-[#B94B45]/30 text-[#B94B45] hover:bg-[#B94B45]/10 transition-colors disabled:opacity-50 flex items-center gap-1 text-[11px]"
                        >
                          {deletingDocId === doc.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Analysis Action */}
            <div className="pt-4 border-t border-[#E5E1D7] flex items-center justify-between">
              <span className="text-xs text-[#777B73]">
                Tolerance configured to{" "}
                <strong className="text-[#252C29]">±5.0%</strong>
              </span>
              <button
                onClick={handleProcess}
                disabled={processing || !verData?.documents?.length}
                className="px-5 py-2.5 rounded-lg bg-[#315B4C] text-white text-xs font-semibold hover:bg-[#183B32] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Extracting & Reconciling...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run Verification Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Discrepancy Breakdown */}
          <div className="p-6 rounded-xl border border-[#E5E1D7] bg-white shadow-sm space-y-5">
            <h2 className="text-base font-semibold text-[#252C29]">
              Automated Discrepancy Analysis
            </h2>

            {discrepancy ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[#E5E1D7] bg-[#F4F1E8]/40 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#777B73] font-medium">Declared Gross Monthly Income:</span>
                    <span className="font-mono font-semibold text-[#252C29]">
                      $
                      {(discrepancy.declared_monthly_income).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#777B73] font-medium">Extracted Gross Monthly Income:</span>
                    <span className="font-mono font-semibold text-[#34765A]">
                      $
                      {(discrepancy.extracted_gross_monthly_income || discrepancy.extracted_monthly_income).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                  {discrepancy.extracted_net_monthly_income ? (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#777B73]">Extracted Net Monthly Income:</span>
                      <span className="font-mono font-medium text-[#252C29]">
                        ${discrepancy.extracted_net_monthly_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : null}

                  {/* Component Breakdown */}
                  {(discrepancy.basic_salary || discrepancy.allowances || discrepancy.total_deductions) && (
                    <div className="pt-2 border-t border-[#E5E1D7]/60 grid grid-cols-3 gap-2 text-[10px] text-center">
                      <div className="p-1.5 rounded bg-white border border-[#E5E1D7]">
                        <span className="text-[#777B73] block">Basic Salary</span>
                        <span className="font-mono font-bold text-[#252C29]">
                          ${(discrepancy.basic_salary || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E5E1D7]">
                        <span className="text-[#777B73] block">Allowances</span>
                        <span className="font-mono font-bold text-[#34765A]">
                          +${(discrepancy.allowances || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E5E1D7]">
                        <span className="text-[#777B73] block">Deductions</span>
                        <span className="font-mono font-bold text-[#B94B45]">
                          -${(discrepancy.total_deductions || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#E5E1D7] pt-2 flex justify-between items-center text-xs">
                    <span className="text-[#777B73] font-medium">Reconciliation Variance:</span>
                    <span
                      className={`font-mono font-bold ${
                        discrepancy.is_within_tolerance
                          ? "text-[#34765A]"
                          : "text-[#B94B45]"
                      }`}
                    >
                      {discrepancy.discrepancy_percentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#777B73]">Tolerance Window:</span>
                    <span className="font-mono text-[#777B73]">
                      ±{discrepancy.tolerance_percentage}%
                    </span>
                  </div>
                </div>

                {/* Detected Credits */}
                {discrepancy.detected_credits.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-[#777B73] uppercase tracking-wider">
                      Detected Payroll Line Items
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {discrepancy.detected_credits.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-[#F4F1E8] text-[#252C29] font-mono text-[11px] border border-[#E5E1D7]"
                        >
                          ${c.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict & Evidence Verification Status */}
                {discrepancy.is_within_tolerance ? (
                  <div className="p-3.5 rounded-lg border border-[#34765A]/20 bg-[#34765A]/10 text-xs text-[#34765A] space-y-1.5">
                    <div className="font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Evidence Verification Status
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#34765A] text-white text-[10px] font-bold">
                        {discrepancy.status}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#252C29]">
                      {discrepancy.explanation}
                    </p>
                    <div className="pt-1.5 border-t border-[#34765A]/20 flex justify-end">
                      <Link
                        href="/credit-assessment"
                        className="text-[11px] font-bold text-[#183B32] hover:underline flex items-center gap-1"
                      >
                        View AI Assessment Risk Discount <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg border border-[#B94B45]/20 bg-[#B94B45]/10 text-xs text-[#B94B45] space-y-1">
                    <div className="font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        Evidence Verification Status
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#B94B45] text-white text-[10px] font-bold">
                        {discrepancy.status}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#252C29]">
                      {discrepancy.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : verData && verData.extracted_monthly_income > 0 ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-[#E5E1D7] bg-[#F4F1E8]/40 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#777B73] font-medium">Declared Gross Monthly Income:</span>
                    <span className="font-mono font-semibold text-[#252C29]">
                      $
                      {verData.declared_monthly_income.toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#777B73] font-medium">Extracted Gross Monthly Income:</span>
                    <span className="font-mono font-semibold text-[#34765A]">
                      $
                      {(verData.extracted_gross_monthly_income || verData.extracted_monthly_income).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                  {verData.extracted_net_monthly_income ? (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#777B73]">Extracted Net Monthly Income:</span>
                      <span className="font-mono font-medium text-[#252C29]">
                        ${verData.extracted_net_monthly_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : null}

                  {/* Component Breakdown */}
                  {(verData.basic_salary || verData.allowances || verData.total_deductions) && (
                    <div className="pt-2 border-t border-[#E5E1D7]/60 grid grid-cols-3 gap-2 text-[10px] text-center">
                      <div className="p-1.5 rounded bg-white border border-[#E5E1D7]">
                        <span className="text-[#777B73] block">Basic Salary</span>
                        <span className="font-mono font-bold text-[#252C29]">
                          ${(verData.basic_salary || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E5E1D7]">
                        <span className="text-[#777B73] block">Allowances</span>
                        <span className="font-mono font-bold text-[#34765A]">
                          +${(verData.allowances || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E5E1D7]">
                        <span className="text-[#777B73] block">Deductions</span>
                        <span className="font-mono font-bold text-[#B94B45]">
                          -${(verData.total_deductions || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#E5E1D7] pt-2 flex justify-between items-center text-xs">
                    <span className="text-[#777B73] font-medium">Reconciliation Variance:</span>
                    <span
                      className={`font-mono font-bold ${
                        verData.can_proceed_standard_lending
                          ? "text-[#34765A]"
                          : "text-[#B94B45]"
                      }`}
                    >
                      {verData.discrepancy_percentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#777B73]">
                  {verData.verifier_notes}
                </p>
                {verData.can_proceed_standard_lending && (
                  <div className="pt-1 flex justify-end">
                    <Link
                      href="/credit-assessment"
                      className="text-[11px] font-bold text-[#183B32] hover:underline flex items-center gap-1"
                    >
                      View AI Assessment Risk Discount <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-[#E5E1D7] rounded-xl text-xs text-[#777B73] space-y-2">
                <FileCheck2 className="h-8 w-8 text-[#777B73]/40 mx-auto" />
                <p>No discrepancy check performed yet.</p>
                <p className="text-[11px]">
                  Upload evidence and click &quot;Run Verification Analysis&quot;.
                </p>
              </div>
            )}
          </div>

          {/* On-Chain Record */}
          <div className="p-6 rounded-xl border border-[#E5E1D7] bg-white shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-[#183B32]" />
              <h2 className="text-base font-semibold text-[#252C29]">
                On-Chain Verification Record
              </h2>
            </div>
            <p className="text-xs text-[#777B73]">
              Raw documents remain off-chain. Only a SHA-256 cryptographic
              digest of the verification record is anchored on-chain.
            </p>

            <div className="p-3 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 text-xs font-mono break-all space-y-2">
              <div>
                <span className="text-[10px] text-[#777B73] block uppercase tracking-wider">
                  Verification Digest
                </span>
                <span className="text-[#252C29]">
                  {verData?.record_hash ||
                    "0x0000000000000000000000000000000000000000000000000000000000000000"}
                </span>
              </div>
              {verData?.verifier_address && (
                <div className="pt-2 border-t border-[#E5E1D7]">
                  <span className="text-[10px] text-[#777B73] block uppercase tracking-wider">
                    Attesting Verifier
                  </span>
                  <span className="text-[#183B32]">
                    {verData.verifier_address}
                  </span>
                </div>
              )}
              {verData?.source_verifier_name && (
                <div className="pt-2 border-t border-[#E5E1D7]">
                  <span className="text-[10px] text-[#777B73] block uppercase tracking-wider">
                    Verification Provider
                  </span>
                  <span className="text-[#183B32]">
                    {verData.source_verifier_name}
                  </span>
                </div>
              )}
            </div>

            {/* Status Description */}
            <div className="p-3 rounded-lg bg-[#F4F1E8]/40 text-xs text-[#777B73] leading-relaxed">
              {cfg.description}
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/apply-loan"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#183B32] hover:underline"
              >
                Proceed to Loan Application
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
