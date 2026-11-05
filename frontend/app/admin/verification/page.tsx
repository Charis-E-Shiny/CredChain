"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/auth/AdminGate";
import { useAccount } from "wagmi";
import { chainConfig } from "@/config/contracts";
import {
  AdminVerificationItem,
  VerificationStatusResponse,
  VerificationStatusType,
} from "@/types";
import {
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Search,
  CheckCircle2,
  FileText,
  RotateCcw,
  UserCheck,
} from "lucide-react";

const STATUS_BADGES: Record<
  VerificationStatusType,
  { label: string; bg: string; text: string; border: string }
> = {
  UNVERIFIED: {
    label: "UNVERIFIED",
    bg: "bg-[#B77B26]/10",
    text: "text-[#B77B26]",
    border: "border-[#B77B26]/30",
  },
  EVIDENCE_CHECKED: {
    label: "EVIDENCE CHECKED",
    bg: "bg-[#315B4C]/10",
    text: "text-[#315B4C]",
    border: "border-[#315B4C]/30",
  },
  SOURCE_VERIFIED: {
    label: "SOURCE VERIFIED",
    bg: "bg-[#34765A]/10",
    text: "text-[#34765A]",
    border: "border-[#34765A]/30",
  },
  MANUAL_REVIEW: {
    label: "MANUAL REVIEW",
    bg: "bg-[#B94B45]/10",
    text: "text-[#B94B45]",
    border: "border-[#B94B45]/30",
  },
};

export default function AdminVerificationQueuePage() {
  const { address } = useAccount();
  const verifierWallet =
    address || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const [items, setItems] = useState<AdminVerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [detailData, setDetailData] =
    useState<VerificationStatusResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [sourceVerifierName, setSourceVerifierName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const url =
        filterStatus === "ALL"
          ? `${chainConfig.apiUrl}/api/verification/admin/list`
          : `${chainConfig.apiUrl}/api/verification/admin/list?status_filter=${filterStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch admin list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [filterStatus]);

  const openReview = async (wallet: string) => {
    setSelectedWallet(wallet);
    setLoadingDetail(true);
    setActionNotes("");
    setSourceVerifierName("");
    setFeedback(null);
    try {
      const res = await fetch(
        `${chainConfig.apiUrl}/api/verification/status/${wallet}`
      );
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
        setActionNotes(data.verifier_notes || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAssignStatus = async (targetStatus: VerificationStatusType) => {
    if (!selectedWallet) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        wallet_address: selectedWallet,
        target_status: targetStatus,
        notes: actionNotes || `Admin marked as ${targetStatus}`,
        verifier_address: verifierWallet,
        source_verifier_name:
          targetStatus === "SOURCE_VERIFIED"
            ? sourceVerifierName || "Mock Trusted Institutional Verifier"
            : null,
      };

      const res = await fetch(
        `${chainConfig.apiUrl}/api/verification/admin/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Failed");
      }
      const updated = await res.json();
      setDetailData(updated);
      setFeedback({
        type: "success",
        text: `Status updated to ${targetStatus}.`,
      });
      fetchList();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminGate>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1D7] pb-5">
          <div>
            <Link
              href="/admin"
              className="text-xs text-[#183B32] hover:underline flex items-center gap-1 mb-2 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#252C29] flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[#183B32]" />
              Borrower Verification Review Queue
            </h1>
            <p className="text-xs text-[#777B73] mt-0.5">
              Review flagged financial document discrepancies and authorize
              source verifications.
            </p>
          </div>
          <button
            onClick={fetchList}
            className="px-3.5 py-2 rounded-lg border border-[#E5E1D7] bg-white text-xs font-semibold text-[#252C29] hover:bg-[#F4F1E8] transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E1D7]">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              "ALL",
              "MANUAL_REVIEW",
              "EVIDENCE_CHECKED",
              "SOURCE_VERIFIED",
              "UNVERIFIED",
            ].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filterStatus === st
                    ? "bg-[#183B32] text-white"
                    : "bg-[#F4F1E8] text-[#777B73] hover:text-[#252C29]"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64 text-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#777B73]" />
            <input
              type="text"
              placeholder="Search wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/40 text-[#252C29] focus:outline-none focus:border-[#183B32]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E5E1D7] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F4F1E8] text-[#777B73] font-semibold border-b border-[#E5E1D7]">
                <tr>
                  <th className="py-3 px-4">Borrower Wallet</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Declared Monthly</th>
                  <th className="py-3 px-4 text-right">Extracted Monthly</th>
                  <th className="py-3 px-4 text-right">Variance (%)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D7]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#777B73]">
                      <RotateCcw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#183B32]" />
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#777B73]">
                      No verification requests match the current filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const badge = STATUS_BADGES[item.status];
                    return (
                      <tr
                        key={item.wallet_address}
                        className="hover:bg-[#F4F1E8]/30"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-[#252C29]">
                          {item.wallet_address.slice(0, 8)}...
                          {item.wallet_address.slice(-6)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.border} ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#252C29]">
                          $
                          {item.declared_monthly_income.toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 }
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#252C29]">
                          {item.extracted_monthly_income > 0
                            ? `$${item.extracted_monthly_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span
                            className={`font-semibold ${
                              item.discrepancy_percentage <= 5.0
                                ? "text-[#34765A]"
                                : "text-[#B94B45]"
                            }`}
                          >
                            {item.discrepancy_percentage.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openReview(item.wallet_address)}
                            className="px-3 py-1 rounded bg-[#183B32] text-white text-[11px] font-semibold hover:bg-[#315B4C]"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Modal */}
        {selectedWallet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E5E1D7] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-[#E5E1D7] pb-4">
                <div>
                  <div className="text-xs font-semibold text-[#777B73] uppercase tracking-wider">
                    Verification Case Review
                  </div>
                  <h2 className="text-lg font-bold text-[#252C29] font-mono mt-0.5">
                    {selectedWallet}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedWallet(null)}
                  className="p-1 rounded-lg hover:bg-[#F4F1E8] text-[#777B73] text-lg"
                >
                  ✕
                </button>
              </div>

              {loadingDetail ? (
                <div className="py-12 text-center text-[#777B73]">
                  <RotateCcw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#183B32]" />
                  Fetching case details...
                </div>
              ) : detailData ? (
                <div className="space-y-5">
                  {feedback && (
                    <div
                      className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                        feedback.type === "success"
                          ? "border-[#34765A]/30 bg-[#34765A]/10 text-[#34765A]"
                          : "border-[#B94B45]/30 bg-[#B94B45]/10 text-[#B94B45]"
                      }`}
                    >
                      {feedback.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                      )}
                      <span>{feedback.text}</span>
                    </div>
                  )}

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-[#E5E1D7] bg-[#F4F1E8]/30 text-xs">
                    <div>
                      <span className="text-[#777B73] block">
                        Declared Annual:
                      </span>
                      <span className="font-mono font-semibold text-[#252C29]">
                        ${detailData.declared_annual_income.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#777B73] block">
                        Declared Monthly:
                      </span>
                      <span className="font-mono font-semibold text-[#252C29]">
                        $
                        {detailData.declared_monthly_income.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#777B73] block">
                        Extracted Monthly (OCR):
                      </span>
                      <span className="font-mono font-semibold text-[#252C29]">
                        {detailData.extracted_monthly_income > 0
                          ? `$${detailData.extracted_monthly_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#777B73] block">Variance:</span>
                      <span
                        className={`font-mono font-bold ${
                          detailData.can_proceed_standard_lending
                            ? "text-[#34765A]"
                            : "text-[#B94B45]"
                        }`}
                      >
                        {detailData.discrepancy_percentage.toFixed(2)}%
                        (Tolerance ±{detailData.tolerance_percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#252C29] mb-2">
                      Attached Evidence ({detailData.documents.length})
                    </h3>
                    {detailData.documents.length === 0 ? (
                      <p className="text-xs text-[#777B73] italic">
                        No documents attached.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detailData.documents.map((d) => (
                          <div
                            key={d.id}
                            className="p-3 rounded-lg border border-[#E5E1D7] bg-white flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#183B32]" />
                              <div>
                                <span className="font-semibold text-[#252C29]">
                                  {d.file_name}
                                </span>
                                <span className="text-[10px] text-[#777B73] block">
                                  {d.document_type} •{" "}
                                  {(d.file_size_bytes / 1024).toFixed(1)} KB
                                  {d.extracted_income
                                    ? ` • Extracted: $${d.extracted_income.toLocaleString()}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Review Notes */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-semibold text-[#252C29]">
                      Officer Review Notes
                    </label>
                    <textarea
                      rows={3}
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Add compliance notes..."
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/50 text-[#252C29] focus:outline-none focus:border-[#183B32]"
                    />
                  </div>

                  {/* Source Verifier Name (for SOURCE_VERIFIED) */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-semibold text-[#252C29]">
                      Source Verifier Name (required for Source Verified)
                    </label>
                    <input
                      type="text"
                      value={sourceVerifierName}
                      onChange={(e) => setSourceVerifierName(e.target.value)}
                      placeholder="e.g. Equifax Integration, Authorized Bank Feed..."
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E1D7] bg-[#F4F1E8]/50 text-[#252C29] focus:outline-none focus:border-[#183B32]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#E5E1D7] flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => handleAssignStatus("MANUAL_REVIEW")}
                      disabled={submitting}
                      className="px-3.5 py-2 rounded-lg border border-[#B94B45]/30 bg-[#B94B45]/10 text-[#B94B45] text-xs font-semibold hover:bg-[#B94B45]/20 disabled:opacity-50"
                    >
                      Flag Manual Review
                    </button>
                    <button
                      onClick={() => handleAssignStatus("EVIDENCE_CHECKED")}
                      disabled={submitting}
                      className="px-3.5 py-2 rounded-lg border border-[#315B4C]/30 bg-[#315B4C]/10 text-[#315B4C] text-xs font-semibold hover:bg-[#315B4C]/20 disabled:opacity-50"
                    >
                      Approve Evidence Checked
                    </button>
                    <button
                      onClick={() => handleAssignStatus("SOURCE_VERIFIED")}
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg bg-[#34765A] text-white text-xs font-semibold hover:bg-[#315B4C] disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Authorize Source Verified
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
