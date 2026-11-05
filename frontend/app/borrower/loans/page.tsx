"use client";

import { useState } from "react";
import Link from "next/link";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress, loanStatusLabels, loanStatusColors } from "@/lib/utils";
import { Layers, FilePlus2, Receipt, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function BorrowerLoansPage() {
  const { borrowerLoans, allLoans, loadingLoans } = useCredChain();
  const [filter, setFilter] = useState<string>("ALL");
  const [scope, setScope] = useState<"mine" | "all">("mine");

  const sourceLoans = scope === "mine" && borrowerLoans.length > 0 ? borrowerLoans : allLoans;

  const filteredLoans = sourceLoans.filter((loan) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return loan.status === 2;
    if (filter === "PENDING") return loan.status === 0 || loan.status === 1;
    if (filter === "REPAID") return loan.status === 3;
    if (filter === "DEFAULTED") return loan.status === 4;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <Link href="/borrower" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Borrower Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            My Loan Portfolio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete on-chain history of all loan applications originated by your connected wallet.
          </p>
        </div>

        <Link
          href="/apply-loan"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
        >
          <FilePlus2 className="h-4 w-4" />
          New Loan Application
        </Link>
      </div>

      {/* Filter Tabs & Scope Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["ALL", "ACTIVE", "PENDING", "REPAID", "DEFAULTED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                filter === tab
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-muted/30 self-start sm:self-auto">
          <button
            onClick={() => setScope("mine")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              scope === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Loans ({borrowerLoans.length})
          </button>
          <button
            onClick={() => setScope("all")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              scope === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Protocol Loans ({allLoans.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        {loadingLoans && filteredLoans.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading on-chain records...</div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No loans match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Loan ID</th>
                  <th className="py-3 px-3">Borrower</th>
                  <th className="py-3 px-3">Principal</th>
                  <th className="py-3 px-3">Collateral</th>
                  <th className="py-3 px-3">Yield (APR)</th>
                  <th className="py-3 px-3">Term</th>
                  <th className="py-3 px-3">Deadline</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id.toString()} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-mono font-bold">#{loan.id.toString()}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{shortenAddress(loan.borrower)}</td>
                    <td className="py-3 px-3 font-semibold">{formatTokenAmount(loan.principal)} CRED</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{formatTokenAmount(loan.collateralAmount)} CRED</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      {(loan.interestRateBps / 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">{Math.round(Number(loan.duration) / 86400)} Days</td>
                    <td className="py-3 px-3">
                      {loan.status === 2 && loan.repaymentDeadline > BigInt(0)
                        ? new Date(Number(loan.repaymentDeadline) * 1000).toLocaleDateString()
                        : loan.status === 1
                        ? "Awaiting Funding"
                        : loan.status === 0
                        ? "Pending Approval"
                        : "Settled"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${loanStatusColors[loan.status]}`}>
                        {loanStatusLabels[loan.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {loan.status === 2 ? (
                        <Link
                          href={`/repayment?loanId=${loan.id.toString()}`}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Receipt className="h-3 w-3" />
                          Repay
                        </Link>
                      ) : loan.status === 3 ? (
                        <span className="text-emerald-500 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
