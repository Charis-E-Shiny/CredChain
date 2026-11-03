"use client";

import { useCredChain } from "@/hooks/useCredChain";
import { Award, CheckCircle2, XCircle, TrendingUp, ShieldCheck } from "lucide-react";
import { formatTokenAmount } from "@/lib/utils";

export default function ReputationPage() {
  const { address, isConnected, reputationScore, reputationRecord } = useCredChain();

  const totalLoans = reputationRecord ? Number(reputationRecord[0]) : 0;
  const repaidLoans = reputationRecord ? Number(reputationRecord[1]) : 0;
  const defaultedLoans = reputationRecord ? Number(reputationRecord[2]) : 0;
  const totalBorrowed = reputationRecord ? formatTokenAmount(reputationRecord[3]) : "0.00";
  const totalRepaid = reputationRecord ? formatTokenAmount(reputationRecord[4]) : "0.00";

  const completionRate = totalLoans > 0 ? ((repaidLoans / totalLoans) * 100).toFixed(1) : "100.0";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          On-Chain Borrower Reputation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Module 4 — Transparent, tamper-proof reputation recorded directly by verified smart contract state changes.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-card space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Reputation Score</div>
          <div className="text-4xl font-extrabold text-primary font-mono">{reputationScore}</div>
          <div className="text-xs text-muted-foreground">Deterministic scale (0 - 100)</div>
        </div>

        <div className="p-5 rounded-xl border bg-card space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Completion Rate</div>
          <div className="text-4xl font-extrabold text-emerald-400 font-mono">{completionRate}%</div>
          <div className="text-xs text-muted-foreground">{repaidLoans} of {totalLoans} loans repaid</div>
        </div>

        <div className="p-5 rounded-xl border bg-card space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Total Volume Settled</div>
          <div className="text-2xl font-bold font-mono">{totalRepaid} CRED</div>
          <div className="text-xs text-muted-foreground">Borrowed: {totalBorrowed} CRED</div>
        </div>
      </div>

      <div className="p-6 rounded-xl border bg-card space-y-4">
        <h2 className="text-base font-semibold">Deterministic Scoring Mechanism</h2>
        <div className="p-4 rounded-lg border bg-muted/20 font-mono text-xs space-y-2">
          <div className="text-primary font-bold">Formula: Score = (RepaidLoans × 100) / TotalLoans</div>
          <p className="text-muted-foreground font-sans text-xs leading-relaxed">
            New borrowers without historical on-chain loan activity receive a neutral baseline score of 50.
            Scores are strictly governed by smart contract callbacks upon verified repayment or default events.
            No user or third-party can artificially inflate their score.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 rounded-lg border bg-muted/10 space-y-2">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Verified Repayment (+Reputation)
            </div>
            <p className="text-muted-foreground leading-relaxed">
              When a loan enters the <span className="text-emerald-400 font-mono">REPAID</span> state in LoanManager,
              it triggers <span className="font-mono">recordRepayment()</span> in BorrowerReputation, incrementing the repaid counter and score.
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-muted/10 space-y-2">
            <div className="font-semibold text-red-400 flex items-center gap-1.5">
              <XCircle className="h-4 w-4" />
              Verified Default (-Reputation)
            </div>
            <p className="text-muted-foreground leading-relaxed">
              If the repayment deadline passes without satisfaction, anyone can trigger <span className="font-mono">markDefault()</span>,
              which executes <span className="font-mono">recordDefault()</span>, penalizing the borrower reputation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
