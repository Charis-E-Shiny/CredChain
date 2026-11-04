"use client";

import Link from "next/link";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";
import { Receipt, ArrowLeft, TrendingUp, CheckCircle2, Clock } from "lucide-react";

export default function LenderReturnsPage() {
  const { lenderInvestments, loadingLoans } = useCredChain();

  const active = lenderInvestments.filter((l) => l.status === 2);
  const repaid = lenderInvestments.filter((l) => l.status === 3);

  const totalCapitalReturned = repaid.reduce((acc, l) => acc + l.repaid, BigInt(0));
  const activeCapitalDeployed = active.reduce((acc, l) => acc + l.principal, BigInt(0));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="border-b pb-5">
        <Link href="/lender" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Lender Dashboard
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Returns & Repayment Settlement
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Track recovered principal, earned interest, and upcoming settlement schedules.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Returned</div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {formatTokenAmount(totalCapitalReturned)} CRED
          </div>
          <div className="text-xs text-muted-foreground">Recovered principal & yield</div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Capital</div>
          <div className="text-2xl font-black font-mono text-primary">
            {formatTokenAmount(activeCapitalDeployed)} CRED
          </div>
          <div className="text-xs text-muted-foreground">Currently accruing interest</div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Success Rate</div>
          <div className="text-2xl font-black font-mono text-sky-400">
            {lenderInvestments.length > 0
              ? `${((repaid.length / lenderInvestments.length) * 100).toFixed(0)}%`
              : "N/A"}
          </div>
          <div className="text-xs text-muted-foreground">
            {repaid.length} settled of {lenderInvestments.length} total
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Repayment Settlement Stream
        </h2>

        {loadingLoans ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading settlement data...</div>
        ) : lenderInvestments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No investment returns recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {lenderInvestments.map((loan) => (
              <div
                key={loan.id.toString()}
                className="p-4 rounded-xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span className="font-mono">Loan #{loan.id.toString()}</span>
                    <span>&bull;</span>
                    <span className="font-mono">{shortenAddress(loan.borrower)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Principal: {formatTokenAmount(loan.principal)} CRED | APR: {(loan.interestRateBps / 100).toFixed(1)}%
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-bold text-foreground">
                      Repaid: {formatTokenAmount(loan.repaid)} CRED
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {loan.status === 3 ? "Fully Settled" : "Active Settlement"}
                    </div>
                  </div>
                  {loan.status === 3 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
