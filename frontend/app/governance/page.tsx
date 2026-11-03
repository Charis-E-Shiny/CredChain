"use client";

import { useState } from "react";
import { useCredChain } from "@/hooks/useCredChain";
import { Vote, CheckCircle2, XCircle, AlertCircle, ShieldAlert } from "lucide-react";

export default function GovernancePage() {
  const { isConnected, approveGovernance, rejectGovernance, isWritePending } = useCredChain();

  const [loanId, setLoanId] = useState("0");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    try {
      setError(null);
      setStatusMsg(null);
      const hash = await approveGovernance(BigInt(loanId));
      setStatusMsg(`Approval submitted for Loan #${loanId}! Tx: ${hash}`);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Governance action reverted.");
    }
  };

  const handleReject = async () => {
    try {
      setError(null);
      setStatusMsg(null);
      const hash = await rejectGovernance(BigInt(loanId));
      setStatusMsg(`Rejection recorded for Loan #${loanId}. Tx: ${hash}`);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Governance action reverted.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Vote className="h-6 w-6 text-primary" />
          Decentralized Authorization & Governance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Module 3 — Multi-party authorization required before smart contracts disburse funds.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800 text-emerald-400 font-mono text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-950/20 border border-red-800 text-red-400 font-mono text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <h2 className="text-base font-semibold">Authorized Reviewer Actions</h2>
          <p className="text-xs text-muted-foreground">
            Requires <span className="font-mono text-primary">APPROVER_ROLE</span> on LoanGovernance.sol.
          </p>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">Target Loan ID</label>
              <input
                type="number"
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                min="0"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleApprove}
                disabled={isWritePending || !isConnected}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Loan
              </button>
              <button
                onClick={handleReject}
                disabled={isWritePending || !isConnected}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Reject Loan
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card/60 space-y-4">
          <h2 className="text-base font-semibold">Governance Threshold Rules</h2>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg border bg-muted/20">
              <div className="font-semibold text-foreground">Standard Micro-Loans (&lt; 5,000 CRED)</div>
              <p>Requires 1 independent approver signature before transition to APPROVED state.</p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20">
              <div className="font-semibold text-foreground">High-Value Loans (&ge; 5,000 CRED)</div>
              <p>Requires multi-signature consensus (2 independent authorized approvers).</p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20">
              <div className="font-semibold text-foreground">Duplicate & Replay Resistance</div>
              <p>Approver signatures are stored per loan ID, preventing double approvals or unverified disbursement.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
