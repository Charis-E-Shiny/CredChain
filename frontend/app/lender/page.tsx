"use client";

import Link from "next/link";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress, loanStatusLabels, loanStatusColors } from "@/lib/utils";
import {
  Briefcase,
  Store,
  Coins,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function LenderDashboardPage() {
  const {
    address,
    isConnected,
    credBalance,
    lenderInvestments,
    marketplaceLoans,
    loadingLoans,
  } = useCredChain();

  // Active investments funded by this lender
  const activeInvestments = lenderInvestments.filter((l) => l.status === 2);
  const settledInvestments = lenderInvestments.filter((l) => l.status === 3);

  // Total capital deployed (sum of principals)
  const totalCapitalDeployed = lenderInvestments.reduce((acc, l) => acc + l.principal, BigInt(0));

  // Total interest earned (sum of interest on settled loans)
  const totalInterestEarned = settledInvestments.reduce(
    (acc, l) => acc + (l.principal * BigInt(l.interestRateBps)) / BigInt(10000),
    BigInt(0)
  );

  // Pending returns across active investments (principal + interest)
  const pendingReturns = activeInvestments.reduce(
    (acc, l) => acc + l.principal + (l.principal * BigInt(l.interestRateBps)) / BigInt(10000) - l.repaid,
    BigInt(0)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Briefcase className="h-3.5 w-3.5" />
            Lender Perspective
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Lender Liquidity Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deploy capital into verified on-chain micro-loans, monitor active investments, and track yield returns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/marketplace"
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <Store className="h-4 w-4" />
            Browse Marketplace ({marketplaceLoans.length})
          </Link>
          <Link
            href="/lender/investments"
            className="px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Coins className="h-4 w-4" />
            My Portfolio
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Capital Deployed */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Capital Deployed</span>
            <Coins className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono">
            {formatTokenAmount(totalCapitalDeployed)}{" "}
            <span className="text-xs font-sans text-muted-foreground">CRED</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Across {lenderInvestments.length} total loan investment{lenderInvestments.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Active Investments */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Active Investments</span>
            <Briefcase className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black font-mono text-sky-400">
            {activeInvestments.length}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {settledInvestments.length} loans successfully completed & settled
          </div>
        </div>

        {/* Interest Earned */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Interest Yield Earned</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {formatTokenAmount(totalInterestEarned)}{" "}
            <span className="text-xs font-sans text-muted-foreground">CRED</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Settled interest returns to date
          </div>
        </div>

        {/* Pending Returns */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Pending Returns</span>
            <Receipt className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {formatTokenAmount(pendingReturns)}{" "}
            <span className="text-xs font-sans text-muted-foreground">CRED</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Expected principal + interest returns
          </div>
        </div>
      </div>

      {/* Available Opportunities Teaser */}
      <div className="p-6 rounded-2xl border bg-gradient-to-r from-sky-950/40 via-card/60 to-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold text-base text-foreground flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Approved Funding Opportunities Ready on Marketplace
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            There are currently <span className="font-mono text-foreground font-bold">{marketplaceLoans.length}</span> governance-approved
            loan request{marketplaceLoans.length !== 1 ? "s" : ""} awaiting liquidity activation.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 hover:opacity-90 flex items-center gap-2 shadow-sm"
        >
          View Marketplace
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Lender Investments Table */}
      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight">Active Investment Commitments</h2>
            <p className="text-xs text-muted-foreground">
              Loans funded by your connected wallet ({lenderInvestments.length} total).
            </p>
          </div>
          <Link
            href="/lender/investments"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View Full Portfolio &rarr;
          </Link>
        </div>

        {loadingLoans ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading investments...</div>
        ) : lenderInvestments.length === 0 ? (
          <div className="p-10 text-center rounded-xl border border-dashed bg-card/30 space-y-2">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="text-sm font-semibold">No Investments Funded Yet</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You haven't funded any loans with this wallet. Browse the Loan Marketplace to activate approved borrower loans.
            </p>
            <div className="pt-2">
              <Link
                href="/marketplace"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-block hover:opacity-90"
              >
                Go to Marketplace
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
                  <th className="py-3 px-3">Capital Funded</th>
                  <th className="py-3 px-3">Locked Collateral</th>
                  <th className="py-3 px-3">Yield (APR)</th>
                  <th className="py-3 px-3">Maturity</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lenderInvestments.slice(0, 5).map((loan) => (
                  <tr key={loan.id.toString()} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-mono font-bold">#{loan.id.toString()}</td>
                    <td className="py-3 px-3 font-mono">{shortenAddress(loan.borrower)}</td>
                    <td className="py-3 px-3 font-semibold">{formatTokenAmount(loan.principal)} CRED</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{formatTokenAmount(loan.collateralAmount)} CRED</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      {(loan.interestRateBps / 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      {loan.repaymentDeadline > BigInt(0)
                        ? new Date(Number(loan.repaymentDeadline) * 1000).toLocaleDateString()
                        : "Active"}
                    </td>
                    <td className="py-3 px-3">
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
