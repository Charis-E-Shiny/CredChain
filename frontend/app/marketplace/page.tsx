"use client";

import { useState } from "react";
import { useCredChain, LoanItem } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress, loanStatusLabels, loanStatusColors } from "@/lib/utils";
import { Store, Coins, CheckCircle, Clock, RotateCcw, AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function MarketplacePage() {
  const {
    address,
    isConnected,
    credBalance,
    marketplaceLoans,
    loadingLoans,
    activateLoan,
    isWritePending,
  } = useCredChain();

  const [fundingId, setFundingId] = useState<string | null>(null);
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFund = async (loanId: bigint) => {
    if (!isConnected) {
      setErrorMsg("Please connect your Web3 wallet to fund a loan.");
      return;
    }

    setFundingId(loanId.toString());
    setTxMessage(null);
    setErrorMsg(null);

    try {
      const hash = await activateLoan(loanId);
      setTxMessage(`Loan #${loanId.toString()} activated successfully! You are now the registered lender. Tx: ${hash}`);
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Failed to fund loan.");
    } finally {
      setFundingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Store className="h-3.5 w-3.5" />
            Decentralized Loan Marketplace
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Micro-Lending Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover peer-to-peer micro-loan requests verified by AI risk models and approved by smart-contract governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl border bg-card text-xs font-mono">
            <span className="text-muted-foreground">Available CRED: </span>
            <span className="font-bold text-foreground">{formatTokenAmount(credBalance)}</span>
          </div>
        </div>
      </div>

      {/* Transaction Feedback */}
      {txMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs flex items-center gap-2.5">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="font-mono">{txMessage}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Marketplace Table */}
      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
              Approved Opportunities Awaiting Funding
            </h2>
            <p className="text-xs text-muted-foreground">
              These loans have passed risk assessment & governance approval and are ready for liquidity activation.
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
            {marketplaceLoans.length} Live
          </span>
        </div>

        {loadingLoans ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RotateCcw className="h-4 w-4 animate-spin text-primary" />
            Querying active loan contracts on-chain...
          </div>
        ) : marketplaceLoans.length === 0 ? (
          <div className="p-14 text-center rounded-xl border border-dashed bg-card/30 space-y-3">
            <Store className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <div className="text-sm font-semibold">No Loans Currently Awaiting Funding</div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              All loan requests must first be requested by a borrower and approved via the on-chain governance queue.
              Once approved, loans appear here for liquidity providers to fund.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/apply-loan"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90"
              >
                Apply as Borrower
              </Link>
              <Link
                href="/admin/approvals"
                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-muted"
              >
                View Approval Queue
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Loan ID</th>
                  <th className="py-3 px-3">Borrower</th>
                  <th className="py-3 px-3">Principal</th>
                  <th className="py-3 px-3">Locked Collateral</th>
                  <th className="py-3 px-3">Yield (APR)</th>
                  <th className="py-3 px-3">Tenor</th>
                  <th className="py-3 px-3">Risk Assessment</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {marketplaceLoans.map((loan) => (
                  <tr key={loan.id.toString()} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-mono font-bold text-primary">#{loan.id.toString()}</td>
                    <td className="py-3 px-3 font-mono">{shortenAddress(loan.borrower)}</td>
                    <td className="py-3 px-3 font-semibold text-sm">{formatTokenAmount(loan.principal)} CRED</td>
                    <td className="py-3 px-3 font-mono text-sky-400 font-medium">
                      {formatTokenAmount(loan.collateralAmount)} CRED
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold text-sm">
                      {(loan.interestRateBps / 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {Math.round(Number(loan.duration) / 86400)} Days
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sky-950/40 text-sky-400 border border-sky-800/60 font-semibold" title={loan.riskAssessmentHash}>
                        ML Verified
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleFund(loan.id)}
                        disabled={isWritePending || fundingId === loan.id.toString()}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                      >
                        {fundingId === loan.id.toString() ? "Funding..." : "Fund Loan"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
