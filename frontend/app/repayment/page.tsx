"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount } from "@/lib/utils";
import { Receipt, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { contracts } from "@/config/contracts";

export default function RepaymentPage() {
  const { isConnected, borrowerLoanIds, repayLoan, approveToken, isWritePending } = useCredChain();

  const [loanId, setLoanId] = useState("0");
  const [amount, setAmount] = useState("1050");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Please connect your wallet.");
      return;
    }

    setError(null);
    setStatusMsg(null);

    try {
      const repayWei = parseEther(amount);
      const lId = BigInt(loanId);

      // Step 1: Approve LoanEscrow to receive repayment tokens
      setStatusMsg("Step 1/2: Approving token transfer...");
      await approveToken(contracts.loanEscrow, repayWei);

      // Step 2: Call LoanManager repayLoan
      setStatusMsg("Step 2/2: Confirming repayment on-chain...");
      const hash = await repayLoan(lId, repayWei);
      setStatusMsg(`Repayment confirmed! Loan #${loanId} updated. Tx: ${hash}`);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Repayment transaction failed.");
      setStatusMsg(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Loan Repayment Portal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Repay outstanding micro-loans in CRED tokens to unlock collateral and build on-chain reputation.
        </p>
      </div>

      <div className="p-6 rounded-xl border bg-card space-y-5">
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

        <form onSubmit={handleRepay} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-muted-foreground font-medium">Select Loan ID</label>
            <input
              type="number"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              min="0"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground font-medium">Repayment Amount (CRED Tokens)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
              step="any"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Supports partial payments or full repayment (principal + basis points interest).
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20 space-y-1 text-muted-foreground">
            <div className="font-semibold text-foreground">Post-Repayment Effects</div>
            <p>• Escrow releases locked collateral back to your wallet.</p>
            <p>• BorrowerReputation records on-chain completed loan, increasing your trust score.</p>
          </div>

          <button
            type="submit"
            disabled={isWritePending || !isConnected}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {isWritePending ? "Executing Repayment..." : "Approve & Execute Repayment"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
