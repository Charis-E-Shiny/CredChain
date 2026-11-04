"use client";

import Link from "next/link";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress, loanStatusLabels, loanStatusColors } from "@/lib/utils";
import { Coins, ArrowLeft, Store, CheckCircle2 } from "lucide-react";

export default function LenderInvestmentsPage() {
  const { lenderInvestments, loadingLoans } = useCredChain();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <Link href="/lender" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Lender Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            My Investment Portfolio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active and settled micro-loans funded by your connected liquidity provider wallet.
          </p>
        </div>

        <Link
          href="/marketplace"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90"
        >
          <Store className="h-4 w-4" />
          Browse Marketplace
        </Link>
      </div>

      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        {loadingLoans ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading investments...</div>
        ) : lenderInvestments.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-3">
            <div>You have not funded any loans yet.</div>
            <Link
              href="/marketplace"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold inline-block"
            >
              Explore Opportunities
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Loan ID</th>
                  <th className="py-3 px-3">Borrower</th>
                  <th className="py-3 px-3">Principal Funded</th>
                  <th className="py-3 px-3">Locked Collateral</th>
                  <th className="py-3 px-3">Yield (APR)</th>
                  <th className="py-3 px-3">Amount Repaid</th>
                  <th className="py-3 px-3">Deadline</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lenderInvestments.map((loan) => (
                  <tr key={loan.id.toString()} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-mono font-bold">#{loan.id.toString()}</td>
                    <td className="py-3 px-3 font-mono">{shortenAddress(loan.borrower)}</td>
                    <td className="py-3 px-3 font-semibold">{formatTokenAmount(loan.principal)} CRED</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{formatTokenAmount(loan.collateralAmount)} CRED</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      {(loan.interestRateBps / 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400">
                      {formatTokenAmount(loan.repaid)} CRED
                    </td>
                    <td className="py-3 px-3">
                      {loan.repaymentDeadline > BigInt(0)
                        ? new Date(Number(loan.repaymentDeadline) * 1000).toLocaleDateString()
                        : "Active"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${loanStatusColors[loan.status]}`}>
                        {loanStatusLabels[loan.status]}
                      </span>
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
