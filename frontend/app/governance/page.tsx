"use client";

import { useState } from "react";
import Link from "next/link";
import { useCredChain } from "@/hooks/useCredChain";
import { useConnect } from "wagmi";
import { shortenAddress } from "@/lib/utils";
import {
  Vote,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Wallet,
} from "lucide-react";

export default function GovernancePage() {
  const {
    isConnected,
    realAddress,
    address,
    approveGovernance,
    rejectGovernance,
    isWritePending,
  } = useCredChain();

  const { connect, connectors } = useConnect();

  const [loanId, setLoanId] = useState("0");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.name === "MetaMask" || c.id === "injected");
    if (injected) {
      connect({ connector: injected });
    } else if (connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Vote className="h-6 w-6 text-primary" />
            Decentralized Authorization & Governance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Module 3 — Multi-party authorization required before smart contracts disburse funds.
          </p>
        </div>
        <Link
          href="/admin/approvals"
          className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          View Loan Approval Queue →
        </Link>
      </div>

      {/* Signer Mode Banner */}
      <div className="p-3.5 rounded-xl border bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          {isConnected ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground">Signer Mode:</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                MetaMask / Web3 Wallet ({shortenAddress(realAddress || address || "")})
              </span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="text-muted-foreground">Signer Mode:</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Direct Local Governance Signer (0xf39Fd6... Approver)
              </span>
              <span className="text-[11px] text-muted-foreground hidden md:inline">
                — Ready to sign on local node
              </span>
            </>
          )}
        </div>

        {!isConnected && (
          <button
            onClick={handleConnectWallet}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Connect Browser Wallet (Optional)
          </button>
        )}
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
                disabled={isWritePending}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isWritePending ? "Submitting..." : "Approve Loan"}
              </button>
              <button
                onClick={handleReject}
                disabled={isWritePending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <XCircle className="h-4 w-4" />
                {isWritePending ? "Submitting..." : "Reject Loan"}
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
