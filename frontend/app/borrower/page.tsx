"use client";

import Link from "next/link";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress, loanStatusLabels, loanStatusColors } from "@/lib/utils";
import {
  Wallet,
  Receipt,
  FilePlus2,
  Award,
  BrainCircuit,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Layers,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function BorrowerDashboardPage() {
  const {
    address,
    isConnected,
    credBalance,
    reputationScore,
    borrowerLoans,
    loadingLoans,
  } = useCredChain();

  // Active loans for borrower
  const activeLoans = borrowerLoans.filter((l) => l.status === 2);
  const pendingLoans = borrowerLoans.filter((l) => l.status === 0 || l.status === 1);

  // Total outstanding balance across active loans
  const totalOutstandingWei = activeLoans.reduce(
    (acc, l) => acc + (l.outstandingBalance ?? BigInt(0)),
    BigInt(0)
  );

  // Next repayment deadline
  const earliestDeadline = activeLoans.length > 0
    ? activeLoans.reduce((min, l) => (l.repaymentDeadline < min ? l.repaymentDeadline : min), activeLoans[0].repaymentDeadline)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Wallet className="h-3.5 w-3.5" />
            Borrower Perspective
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Borrower Financial Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your collateralized micro-loans, check outstanding balances, review reputation, and build credit history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/apply-loan"
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <FilePlus2 className="h-4 w-4" />
            Apply for Micro-Loan
          </Link>
          <Link
            href="/repayment"
            className="px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Receipt className="h-4 w-4" />
            Make Repayment
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available CRED */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Available Balance</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono">
            {formatTokenAmount(credBalance)}{" "}
            <span className="text-xs font-sans text-muted-foreground">CRED</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Wallet: {address ? shortenAddress(address) : "Not connected"}
          </div>
        </div>

        {/* Outstanding Loan Debt */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Outstanding Debt</span>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-500">
            {formatTokenAmount(totalOutstandingWei)}{" "}
            <span className="text-xs font-sans text-muted-foreground">CRED</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Across {activeLoans.length} active micro-loan{activeLoans.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Reputation Score */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Reputation Score</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {reputationScore}{" "}
            <span className="text-xs font-sans text-muted-foreground">/ 100</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Smart contract verified reputation
          </div>
        </div>

        {/* Next Due Date */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Next Repayment</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-base font-bold font-mono">
            {earliestDeadline ? new Date(Number(earliestDeadline) * 1000).toLocaleDateString() : "No Due Dates"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {activeLoans.length > 0 ? "Repay before deadline to protect score" : "All loans settled or none active"}
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href="/credit-assessment"
          className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
        >
          <div className="space-y-1">
            <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-sky-400" />
              AI Credit Assessment
            </div>
            <p className="text-xs text-muted-foreground">
              Run or renew your ML credit risk evaluation using consented financial parameters.
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/credit-passport"
          className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
        >
          <div className="space-y-1">
            <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Credit Passport
            </div>
            <p className="text-xs text-muted-foreground">
              Generate or download a cryptographically verifiable reputation credential.
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/repayment"
          className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
        >
          <div className="space-y-1">
            <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Loan Settlement
            </div>
            <p className="text-xs text-muted-foreground">
              Select any active loan to settle outstanding principal and interest to unlock collateral.
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>

      {/* Borrower Loans Table */}
      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              My Loan Commitments
            </h2>
            <p className="text-xs text-muted-foreground">
              Actual on-chain loan requests originated by your wallet ({borrowerLoans.length} total recorded).
            </p>
          </div>
          <Link
            href="/borrower/loans"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All &rarr;
          </Link>
        </div>

        {loadingLoans ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading on-chain loans...</div>
        ) : borrowerLoans.length === 0 ? (
          <div className="p-10 text-center rounded-xl border border-dashed bg-card/30 space-y-2">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="text-sm font-semibold">No Loan Requests Found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You have not requested any loans with this wallet address. Apply for a micro-loan above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Loan ID</th>
                  <th className="py-3 px-3">Principal</th>
                  <th className="py-3 px-3">Collateral</th>
                  <th className="py-3 px-3">Interest (APR)</th>
                  <th className="py-3 px-3">Deadline</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {borrowerLoans.slice(0, 5).map((loan) => (
                  <tr key={loan.id.toString()} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-mono font-bold">#{loan.id.toString()}</td>
                    <td className="py-3 px-3 font-semibold">{formatTokenAmount(loan.principal)} CRED</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{formatTokenAmount(loan.collateralAmount)} CRED</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      {(loan.interestRateBps / 100).toFixed(1)}%
                    </td>
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
                          className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                        >
                          Repay
                        </Link>
                      ) : loan.status === 3 ? (
                        <span className="text-emerald-500 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Repaid
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
