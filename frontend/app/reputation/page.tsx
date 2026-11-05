"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useCredChain } from "@/hooks/useCredChain";
import { chainConfig } from "@/config/contracts";
import { Award, CheckCircle2, XCircle, TrendingUp, ShieldCheck, ArrowRight, Info, FileCheck2, AlertTriangle, Clock } from "lucide-react";
import { formatTokenAmount } from "@/lib/utils";
import Link from "next/link";

export default function ReputationPage() {
  const { address, isConnected, reputationScore, reputationRecord } = useCredChain();

  const [verificationStatus, setVerificationStatus] = useState<string>("UNVERIFIED");
  const [verRecordHash, setVerRecordHash] = useState<string | null>(null);
  const [verLendingRoute, setVerLendingRoute] = useState<string>("UNVERIFIED_RESTRICTED");

  useEffect(() => {
    if (!address) return;
    fetch(`${chainConfig.apiUrl}/api/verification/status/${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setVerificationStatus(data.status || "UNVERIFIED");
          setVerRecordHash(data.record_hash || null);
          setVerLendingRoute(data.lending_route || "UNVERIFIED_RESTRICTED");
        }
      })
      .catch(() => {});
  }, [address]);

  const rec = reputationRecord as any;
  const totalLoans = rec ? Number(rec.totalLoans ?? rec[0] ?? 0) : 0;
  const repaidLoans = rec ? Number(rec.repaidLoans ?? rec[1] ?? 0) : 0;
  const defaultedLoans = rec ? Number(rec.defaultedLoans ?? rec[2] ?? 0) : 0;
  const totalBorrowed = rec ? formatTokenAmount(rec.totalBorrowed ?? rec[3] ?? BigInt(0)) : "0.00";
  const totalRepaid = rec ? formatTokenAmount(rec.totalRepaid ?? rec[4] ?? BigInt(0)) : "0.00";

  // Fix: Do not show 100% completion rate if zero loans have been taken!
  const hasHistory = totalLoans > 0;
  const completionRate = hasHistory
    ? ((repaidLoans / totalLoans) * 100).toFixed(1) + "%"
    : "No history yet";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Award className="h-3.5 w-3.5" />
          Reputation Engine
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">On-Chain Borrower Reputation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Module 4 — Transparent, tamper-proof borrower reputation governed by verifiable smart contract state transitions.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Score */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Reputation Score</div>
          <div className="text-4xl font-extrabold text-primary font-mono">{reputationScore}</div>
          <div className="text-xs text-muted-foreground">
            {!hasHistory ? "Neutral baseline (50) for new borrowers" : "Deterministic score on scale of 0 to 100"}
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Completion Rate</div>
          <div className={`text-3xl font-extrabold font-mono ${hasHistory ? "text-emerald-400" : "text-muted-foreground"}`}>
            {completionRate}
          </div>
          <div className="text-xs text-muted-foreground">
            {hasHistory ? `${repaidLoans} of ${totalLoans} loans repaid in full` : "No loan repayments recorded yet"}
          </div>
        </div>

        {/* Volume */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Volume Settled</div>
          <div className="text-2xl font-bold font-mono">{totalRepaid} CRED</div>
          <div className="text-xs text-muted-foreground">Total Borrowed: {totalBorrowed} CRED</div>
        </div>
      </div>

      {/* Credit Passport Integration Banner */}
      <div className="p-5 rounded-2xl border bg-gradient-to-r from-sky-950/40 via-card/60 to-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold text-sm text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Export Your Reputation as a Verifiable Credit Passport
          </div>
          <p className="text-xs text-muted-foreground max-w-lg">
            Create an immutable, cryptographically anchored Credit Passport that external lenders can independently audit without connecting a wallet.
          </p>
        </div>
        <Link
          href="/credit-passport"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 hover:opacity-90 flex items-center gap-1.5"
        >
          View Credit Passport
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Financial Verification Status Section */}
      <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Financial Verification Status
          </h2>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
            verificationStatus === "SOURCE_VERIFIED" ? "bg-[#34765A]/15 border border-[#34765A]/30 text-[#34765A]" :
            verificationStatus === "EVIDENCE_CHECKED" ? "bg-[#315B4C]/15 border border-[#315B4C]/30 text-[#315B4C]" :
            verificationStatus === "MANUAL_REVIEW" ? "bg-[#B94B45]/15 border border-[#B94B45]/30 text-[#B94B45]" :
            "bg-[#B77B26]/15 border border-[#B77B26]/30 text-[#B77B26]"
          }`}>
            {verificationStatus.replace("_", " ")}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {verificationStatus === "UNVERIFIED" && "Self-declared financial information with no supporting evidence. Upload documents via Financial Verification to progress."}
          {verificationStatus === "EVIDENCE_CHECKED" && "Declared income reconciled against uploaded documents within ±5% tolerance. Document issuer not independently authenticated."}
          {verificationStatus === "SOURCE_VERIFIED" && "Financial information independently confirmed by an authorized institutional verifier."}
          {verificationStatus === "MANUAL_REVIEW" && "Document extraction revealed discrepancies exceeding tolerance threshold. Pending credit officer review."}
        </p>

        {verRecordHash && (
          <div className="p-3 rounded-lg border bg-muted/20 text-xs font-mono break-all text-muted-foreground">
            <span className="text-[10px] font-sans uppercase tracking-wider block mb-0.5 text-muted-foreground">Record Hash</span>
            <span className="text-foreground text-[11px]">{verRecordHash}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/verification" className="text-primary font-semibold hover:underline flex items-center gap-1">
            Manage Verification <ArrowRight className="h-3 w-3" />
          </Link>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{verLendingRoute.replace(/_/g, " ")}</span>
        </div>
      </div>

      {/* Deterministic Scoring Explanation */}
      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Deterministic Scoring Algorithm
        </h2>
        <div className="p-4 rounded-xl border bg-muted/20 font-mono text-xs space-y-2">
          <div className="text-primary font-bold">Formula: Score = (RepaidLoans × 100) / TotalLoans</div>
          <p className="text-muted-foreground font-sans text-xs leading-relaxed">
            New borrowers without historical on-chain loan activity receive a neutral baseline score of 50.
            Scores are strictly governed by smart contract callbacks in <span className="font-mono text-foreground">BorrowerReputation.sol</span> upon verified repayment or default events.
            No user or administrator can arbitrarily alter their score.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              On-Time Repayment
            </div>
            <p className="text-muted-foreground">
              Every loan repaid in full before the repayment deadline strengthens your reputation score towards 100.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1">
            <div className="font-bold text-destructive flex items-center gap-1.5">
              <XCircle className="h-4 w-4" />
              Loan Default
            </div>
            <p className="text-muted-foreground">
              Failing to repay before the deadline results in collateral seizure and reduces your score towards 0.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
