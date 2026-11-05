"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { chainConfig } from "@/config/contracts";
import {
  CreditAssessmentResponse,
  VerificationStatusResponse,
  VerificationStatusType,
  DiscrepancyReport,
} from "@/types";
import {
  BrainCircuit,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Upload,
  FileText,
  Trash2,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Info,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

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
      "Financial figures are self-declared without supporting evidence. Upload payroll or bank records to progress to verified lending.",
  },
  EVIDENCE_CHECKED: {
    label: "EVIDENCE CHECKED",
    bg: "bg-[#315B4C]/10",
    text: "text-[#315B4C]",
    border: "border-[#315B4C]/30",
    icon: FileCheck2,
    description:
      "Supporting documents uploaded and parsed. Extracted income matches declarations within ±5% tolerance. Note: Document issuer is not independently authenticated.",
  },
  SOURCE_VERIFIED: {
    label: "SOURCE VERIFIED",
    bg: "bg-[#34765A]/10",
    text: "text-[#34765A]",
    border: "border-[#34765A]/30",
    icon: ShieldCheck,
    description:
      "Financial profile confirmed by an authorized protocol verifier or accredited institution.",
  },
  MANUAL_REVIEW: {
    label: "MANUAL REVIEW",
    bg: "bg-[#B94B45]/10",
    text: "text-[#B94B45]",
    border: "border-[#B94B45]/30",
    icon: AlertTriangle,
    description:
      "Extracted document values diverge from declared figures by >5% or automated OCR requires human evaluation.",
  },
};

export default function MergedAssessmentVerificationPage() {
  const { address } = useAccount();
  const activeAddress = address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  // Active view tab: "assessment", "verification", or "all"
  const [activeTab, setActiveTab] = useState<"all" | "ai" | "verification">("all");

  // Form State
  const [formData, setFormData] = useState({
    annual_income: "75000",
    monthly_debt: "800",
    employment_length_years: "4",
    home_ownership: "RENT",
    loan_amount: "2500",
    loan_purpose: "PERSONAL",
    credit_history_length_years: "6",
    num_open_accounts: "4",
    num_delinquencies: "0",
    debt_to_income_ratio: "0.15",
    consent: true,
  });

  // AI Assessment State
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [assessment, setAssessment] = useState<CreditAssessmentResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Verification State
  const [loadingVer, setLoadingVer] = useState(true);
  const [verData, setVerData] = useState<VerificationStatusResponse | null>(null);
  const [discrepancy, setDiscrepancy] = useState<DiscrepancyReport | null>(null);
  const [verProcessing, setVerProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("salary_slip");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verError, setVerError] = useState<string | null>(null);
  const [verSuccessMsg, setVerSuccessMsg] = useState<string | null>(null);

  // Fetch initial verification state and past assessment
  const fetchVerificationStatus = async () => {
    try {
      setLoadingVer(true);
      const res = await fetch(`${chainConfig.apiUrl}/api/verification/status/${activeAddress}`);
      if (res.ok) {
        const data: VerificationStatusResponse = await res.json();
        setVerData(data);
        if (data.declared_annual_income > 0) {
          setFormData((prev) => ({
            ...prev,
            annual_income: String(data.declared_annual_income),
            monthly_debt: String(data.declared_monthly_debt || prev.monthly_debt),
            employment_length_years: String(data.declared_employment_years || prev.employment_length_years),
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load verification status:", e);
    } finally {
      setLoadingVer(false);
    }
  };

  useEffect(() => {
    fetchVerificationStatus();

    // Check if prior assessment exists
    fetch(`${chainConfig.apiUrl}/api/credit/history/${activeAddress}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((history) => {
        if (history && history.length > 0) {
          const latest = history[0];
          setAssessment({
            risk_score: latest.risk_score,
            risk_category: latest.risk_category,
            confidence: latest.confidence,
            contributing_factors: [],
            eligibility: `Loaded previous assessment (${latest.risk_category} Risk)`,
            model_version: "1.0.0",
            assessment_id: latest.id,
            timestamp: latest.created_at,
            disclaimer: "Academic prototype only.",
          });
        }
      })
      .catch(() => {});
  }, [activeAddress]);

  // Handle AI Assessment Submission
  const handleRunAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAssessment(true);
    setAiError(null);

    const payload = {
      annual_income: parseFloat(formData.annual_income) || 0,
      monthly_debt: parseFloat(formData.monthly_debt) || 0,
      employment_length_years: parseFloat(formData.employment_length_years) || 0,
      home_ownership: formData.home_ownership,
      loan_amount: parseFloat(formData.loan_amount) || 0,
      loan_purpose: formData.loan_purpose,
      credit_history_length_years: parseFloat(formData.credit_history_length_years) || 0,
      num_open_accounts: parseInt(formData.num_open_accounts) || 0,
      num_delinquencies: parseInt(formData.num_delinquencies) || 0,
      debt_to_income_ratio:
        parseFloat(formData.annual_income) > 0
          ? (parseFloat(formData.monthly_debt) * 12) / parseFloat(formData.annual_income)
          : 0.15,
      wallet_address: activeAddress,
      consent: formData.consent,
    };

    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/credit/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Credit assessment evaluation failed.");
      }

      const data = await res.json();
      setAssessment(data);
    } catch (err: any) {
      setAiError(err.message || "Failed to connect to AI credit scoring backend.");
    } finally {
      setLoadingAssessment(false);
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setVerError("Please select a document (PDF, PNG, JPG) to upload.");
      return;
    }

    setUploading(true);
    setVerError(null);
    setVerSuccessMsg(null);

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
        throw new Error(errJ.detail || "Document upload failed");
      }

      const resData = await res.json();
      setVerSuccessMsg(resData.message || "Document uploaded and parsed successfully.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchVerificationStatus();
    } catch (err: any) {
      setVerError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Handle Document Deletion (Remove uploaded file)
  const handleDeleteDocument = async (docId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to remove "${fileName}"?`)) return;

    setDeletingDocId(docId);
    setVerError(null);
    setVerSuccessMsg(null);

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

      setVerSuccessMsg(`"${fileName}" was removed successfully.`);
      // Refresh verification state
      await fetchVerificationStatus();
      setDiscrepancy(null);
    } catch (err: any) {
      setVerError(err.message || "Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  // Run Verification Reconciler
  const handleRunVerification = async () => {
    setVerProcessing(true);
    setVerError(null);
    setVerSuccessMsg(null);

    try {
      const payload = {
        wallet_address: activeAddress,
        declared_annual_income: parseFloat(formData.annual_income) || 0,
        declared_monthly_debt: parseFloat(formData.monthly_debt) || 0,
        declared_employment_years: parseFloat(formData.employment_length_years) || 0,
        tolerance_percentage: 5.0,
      };

      const res = await fetch(`${chainConfig.apiUrl}/api/verification/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Verification analysis failed");
      }

      const report: DiscrepancyReport = await res.json();
      setDiscrepancy(report);
      setVerSuccessMsg(
        report.is_within_tolerance
          ? "Reconciliation passed: extracted values match declarations within 5% tolerance (EVIDENCE CHECKED)."
          : "Discrepancy detected: variance exceeds 5% threshold (flagged for MANUAL REVIEW)."
      );
      await fetchVerificationStatus();
    } catch (err: any) {
      setVerError(err.message || "Failed to execute verification analysis");
    } finally {
      setVerProcessing(false);
    }
  };

  const currentStatus: VerificationStatusType = verData?.status || "UNVERIFIED";
  const statusCfg = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-14">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E1D7] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#183B32]/10 text-[#183B32] text-xs font-semibold mb-2">
            <BrainCircuit className="h-3.5 w-3.5 text-[#183B32]" />
            Unified Credit Underwriting & Verification
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#252C29]">
            AI Assessment & Financial Verification
          </h1>
          <p className="text-sm text-[#777B73] mt-1">
            Machine learning default probability evaluation combined with automated documentary evidence reconciliation.
          </p>
        </div>

        {/* Unified Status Pill */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${statusCfg.border} ${statusCfg.bg} flex flex-col items-end`}>
            <span className="text-[10px] uppercase font-bold text-[#777B73] tracking-wider">
              Verification Standing
            </span>
            <span className={`text-sm font-extrabold flex items-center gap-1.5 mt-0.5 ${statusCfg.text}`}>
              <StatusIcon className="h-4 w-4" />
              {statusCfg.label}
            </span>
          </div>
          {assessment && (
            <div className="p-3 rounded-xl border border-[#E5E1D7] bg-white shadow-sm flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-[#777B73] tracking-wider">
                AI Risk Tier
              </span>
              <span
                className={`text-sm font-extrabold mt-0.5 ${
                  assessment.risk_category === "LOW"
                    ? "text-[#34765A]"
                    : assessment.risk_category === "MEDIUM"
                    ? "text-[#B77B26]"
                    : "text-[#B94B45]"
                }`}
              >
                {assessment.risk_category} RISK
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E1D7] pb-3 text-xs">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === "all"
              ? "bg-[#183B32] text-white"
              : "bg-[#F4F1E8] text-[#777B73] hover:text-[#252C29]"
          }`}
        >
          Unified View (Both)
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === "ai"
              ? "bg-[#183B32] text-white"
              : "bg-[#F4F1E8] text-[#777B73] hover:text-[#252C29]"
          }`}
        >
          1. AI Risk Model
        </button>
        <button
          onClick={() => setActiveTab("verification")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
            activeTab === "verification"
              ? "bg-[#183B32] text-white"
              : "bg-[#F4F1E8] text-[#777B73] hover:text-[#252C29]"
          }`}
        >
          2. Document Verification
        </button>
      </div>

      {/* Unified Underwriting & Lending Eligibility Banner */}
      <div className="p-5 rounded-2xl border border-[#E5E1D7] bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#777B73] uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-[#183B32]" />
            Consolidated Protocol Lending Eligibility
          </div>
          <div className="text-base font-extrabold text-[#252C29]">
            {currentStatus === "SOURCE_VERIFIED"
              ? "Source Verified: Eligible for Prime Uncollateralized Lending Route"
              : currentStatus === "EVIDENCE_CHECKED"
              ? "Evidence Checked: Eligible for Standard Loan Origination with Collateral"
              : currentStatus === "MANUAL_REVIEW"
              ? "Manual Review Flagged: Pending Compliance Officer Resolution"
              : "Unverified Declaration: Preliminary Scoring Only (Requires Document Evidence)"}
          </div>
          <p className="text-xs text-[#777B73]">
            Borrower Wallet: <span className="font-mono text-[#252C29]">{activeAddress}</span>
            {verData?.record_hash && ` • Hash: ${verData.record_hash.slice(0, 14)}...`}
          </p>
        </div>

        <Link
          href="/apply-loan"
          className="px-5 py-2.5 rounded-xl bg-[#183B32] text-white text-xs font-semibold hover:bg-[#315B4C] transition-colors flex items-center gap-1.5 self-start md:self-auto shrink-0 shadow-sm"
        >
          Proceed to Loan Application
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ================= LEFT SECTION: AI CREDIT UNDERWRITING ================= */}
        {(activeTab === "all" || activeTab === "ai") && (
          <div className={`${activeTab === "all" ? "lg:col-span-6" : "lg:col-span-12"} space-y-6`}>
            <div className="p-6 rounded-2xl border border-[#E5E1D7] bg-white shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#E5E1D7] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#252C29] flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-[#183B32]" />
                    1. Financial Profile & ML Assessment
                  </h2>
                  <p className="text-xs text-[#777B73]">
                    GradientBoosting calibrated default estimation.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F4F1E8] text-[#777B73]">
                  v1.0.0
                </span>
              </div>

              {aiError && (
                <div className="p-3 rounded-lg border border-[#B94B45]/30 bg-[#B94B45]/10 text-xs text-[#B94B45] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <form onSubmit={handleRunAssessment} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Annual Income ($)</label>
                    <input
                      type="number"
                      value={formData.annual_income}
                      onChange={(e) => setFormData({ ...formData, annual_income: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                      required
                    />
                    <span className="text-[10px] text-[#777B73]">
                      Monthly: ${(parseFloat(formData.annual_income || "0") / 12).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Monthly Debt ($)</label>
                    <input
                      type="number"
                      value={formData.monthly_debt}
                      onChange={(e) => setFormData({ ...formData, monthly_debt: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Requested Micro-Loan ($)</label>
                    <input
                      type="number"
                      value={formData.loan_amount}
                      onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Home Ownership</label>
                    <select
                      value={formData.home_ownership}
                      onChange={(e) => setFormData({ ...formData, home_ownership: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 text-[#252C29] focus:outline-none focus:border-[#183B32]"
                    >
                      <option value="RENT">Rent</option>
                      <option value="MORTGAGE">Mortgage</option>
                      <option value="OWN">Own (Outright)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Employment (Yrs)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.employment_length_years}
                      onChange={(e) => setFormData({ ...formData, employment_length_years: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Credit History</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.credit_history_length_years}
                      onChange={(e) => setFormData({ ...formData, credit_history_length_years: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Past Delinquencies</label>
                    <input
                      type="number"
                      value={formData.num_delinquencies}
                      onChange={(e) => setFormData({ ...formData, num_delinquencies: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 font-mono text-[#252C29] focus:outline-none focus:border-[#183B32]"
                      required
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consent}
                      onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                      className="mt-0.5 rounded border-[#E5E1D7] text-[#183B32]"
                      required
                    />
                    <span className="text-[#777B73] text-[11px] leading-tight">
                      I consent to off-chain automated ML credit analysis for educational research purposes.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loadingAssessment}
                  className="w-full py-2.5 rounded-lg bg-[#183B32] text-white font-semibold text-xs hover:bg-[#315B4C] disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {loadingAssessment ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Evaluating Risk Vectors...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="h-3.5 w-3.5" />
                      Run AI Risk Assessment
                    </>
                  )}
                </button>
              </form>

              {/* Assessment Output Display */}
              {assessment && (
                <div className="pt-4 border-t border-[#E5E1D7] space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-[#E5E1D7] bg-[#F4F1E8]/40 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#777B73] uppercase tracking-wider font-semibold">
                        Predicted Default Probability
                      </div>
                      <div className="text-2xl font-black font-mono text-[#252C29]">
                        {(assessment.risk_score * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#777B73] uppercase tracking-wider font-semibold">
                        Classification
                      </div>
                      <div
                        className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-0.5 ${
                          assessment.risk_category === "LOW"
                            ? "bg-[#34765A]/15 text-[#34765A] border border-[#34765A]/30"
                            : assessment.risk_category === "MEDIUM"
                            ? "bg-[#B77B26]/15 text-[#B77B26] border border-[#B77B26]/30"
                            : "bg-[#B94B45]/15 text-[#B94B45] border border-[#B94B45]/30"
                        }`}
                      >
                        {assessment.risk_category} RISK
                      </div>
                    </div>
                  </div>

                  {assessment.contributing_factors?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-[#777B73] uppercase tracking-wider">
                        Top Contributing Factors (SHAP)
                      </span>
                      <div className="space-y-1">
                        {assessment.contributing_factors.slice(0, 3).map((f, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-2 rounded-lg bg-[#F4F1E8]/30 border border-[#E5E1D7] text-[11px]"
                          >
                            <span className="font-mono text-[#252C29]">{f.feature_name}</span>
                            <span
                              className={`font-semibold ${
                                f.direction === "positive" ? "text-[#B94B45]" : "text-[#34765A]"
                              }`}
                            >
                              {(f.importance_value * 100).toFixed(1)}% ({f.direction})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= RIGHT SECTION: DOCUMENT VERIFICATION LAYER ================= */}
        {(activeTab === "all" || activeTab === "verification") && (
          <div className={`${activeTab === "all" ? "lg:col-span-6" : "lg:col-span-12"} space-y-6`}>
            <div className="p-6 rounded-2xl border border-[#E5E1D7] bg-white shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#E5E1D7] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#252C29] flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-[#315B4C]" />
                    2. Document Evidence & OCR Reconciliation
                  </h2>
                  <p className="text-xs text-[#777B73]">
                    Upload payroll records or bank statements to reconcile declarations.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F4F1E8] text-[#777B73]">
                  Tolerance: ±5.0%
                </span>
              </div>

              {verError && (
                <div className="p-3 rounded-lg border border-[#B94B45]/30 bg-[#B94B45]/10 text-xs text-[#B94B45] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{verError}</span>
                </div>
              )}

              {verSuccessMsg && (
                <div className="p-3 rounded-lg border border-[#34765A]/30 bg-[#34765A]/10 text-xs text-[#34765A] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{verSuccessMsg}</span>
                </div>
              )}

              {/* Upload Form */}
              <form onSubmit={handleUploadDocument} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Document Category</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 text-[#252C29] focus:outline-none focus:border-[#183B32]"
                    >
                      <option value="salary_slip">Salary Slip / Pay Stub</option>
                      <option value="bank_statement">Bank Statement</option>
                      <option value="employment_letter">Employment Contract</option>
                      <option value="tax_return">Tax Return (W-2 / 1040)</option>
                      <option value="other">Other Proof</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#777B73] font-medium">Choose File (PDF/Image)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-[#777B73] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-[#E5E1D7] file:bg-[#183B32] file:text-white file:text-[11px] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="px-4 py-2 rounded-lg bg-[#183B32] text-white text-xs font-semibold hover:bg-[#315B4C] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Uploading & Scanning...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Upload Evidence
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Uploaded Documents List with DELETE / REMOVE BUTTON */}
              <div className="border-t border-[#E5E1D7] pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#252C29]">
                    Uploaded Evidence Documents ({verData?.documents?.length || 0})
                  </span>
                  <span className="text-[11px] text-[#777B73]">Stored off-chain</span>
                </div>

                {!verData?.documents?.length ? (
                  <div className="p-4 rounded-lg border border-dashed border-[#E5E1D7] text-center text-xs text-[#777B73]">
                    No documents uploaded yet. Upload a salary slip or bank statement to check reconciliation.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {verData.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/30 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <FileText className="h-4 w-4 text-[#183B32] shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-[#252C29] truncate">{doc.file_name}</div>
                            <div className="text-[10px] text-[#777B73]">
                              {doc.document_type} • {(doc.file_size_bytes / 1024).toFixed(1)} KB
                              {doc.extracted_income
                                ? ` • Extracted: $${doc.extracted_income.toLocaleString()}/mo`
                                : ""}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons: Status badge + Remove button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {doc.extracted_income ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#34765A]/10 text-[#34765A]">
                              OCR Ready
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#B77B26]/10 text-[#B77B26]">
                              Manual
                            </span>
                          )}

                          {/* REMOVE BUTTON */}
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

              {/* Run Verification Reconciler */}
              <div className="border-t border-[#E5E1D7] pt-4 flex items-center justify-between">
                <span className="text-[11px] text-[#777B73]">
                  Declared: <strong className="text-[#252C29]">${(parseFloat(formData.annual_income || "0") / 12).toFixed(2)}/mo</strong>
                </span>

                <button
                  onClick={handleRunVerification}
                  disabled={verProcessing || !verData?.documents?.length}
                  className="px-4 py-2 rounded-lg bg-[#315B4C] text-white text-xs font-semibold hover:bg-[#183B32] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {verProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Reconciling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Run Verification Analysis
                    </>
                  )}
                </button>
              </div>

              {/* Discrepancy Report Result */}
              {(discrepancy || (verData && verData.extracted_monthly_income > 0)) && (
                <div className="p-4 rounded-xl border border-[#E5E1D7] bg-[#F4F1E8]/40 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#777B73]">Declared Monthly:</span>
                    <span className="font-mono font-semibold text-[#252C29]">
                      ${(discrepancy ? discrepancy.declared_monthly_income : verData?.declared_monthly_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#777B73]">Extracted Monthly (OCR):</span>
                    <span className="font-mono font-semibold text-[#252C29]">
                      ${(discrepancy ? discrepancy.extracted_monthly_income : verData?.extracted_monthly_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-[#E5E1D7] pt-2 flex justify-between items-center">
                    <span className="text-[#777B73]">Reconciliation Variance:</span>
                    <span
                      className={`font-mono font-bold ${
                        (discrepancy ? discrepancy.is_within_tolerance : verData?.can_proceed_standard_lending)
                          ? "text-[#34765A]"
                          : "text-[#B94B45]"
                      }`}
                    >
                      {(discrepancy ? discrepancy.discrepancy_percentage : verData?.discrepancy_percentage || 0).toFixed(2)}% (Tolerance ±5.0%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}