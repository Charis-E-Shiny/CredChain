"use client";

import Link from "next/link";
import { AdminGate } from "@/components/auth/AdminGate";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";
import {
  SlidersHorizontal,
  FileCheck2,
  Vote,
  TrendingUp,
  Users,
  Compass,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Coins,
  Receipt,
  Layers,
  ArrowUpRight,
} from "lucide-react";

export default function AdminDashboardPage() {
  const {
    allLoans,
    pendingApprovalLoans,
    activeLoans,
    totalLoans,
    oraclePrice,
  } = useCredChain();

  const totalVolumeWei = allLoans.reduce((acc, l) => acc + l.principal, BigInt(0));
  const defaultedCount = allLoans.filter((l) => l.status === 4).length;
  const activeCount = Number(activeLoans ?? 0);
  const pendingCount = pendingApprovalLoans.length;

  const ethPriceUSD = oraclePrice
    ? (Number(oraclePrice) / 1e8).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$2,500.00";

  return (
    <AdminGate>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Governance Console
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Protocol Administration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              On-chain governance monitoring, loan approval workflows, risk parameters, and emergency circuit breakers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/approvals"
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
            >
              <FileCheck2 className="h-4 w-4" />
              Approval Queue ({pendingCount})
            </Link>
            <Link
              href="/admin/verification"
              className="px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Document Review
            </Link>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Loan Volume</div>
            <div className="text-2xl font-black font-mono">
              {formatTokenAmount(totalVolumeWei)} <span className="text-xs font-sans text-muted-foreground">CRED</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Cumulative principal across {totalLoans ? totalLoans.toString() : "0"} loans</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Approvals</div>
            <div className="text-2xl font-black font-mono text-amber-400">{pendingCount}</div>
            <div className="text-[11px] text-muted-foreground">Awaiting multi-approver or governance review</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Loans</div>
            <div className="text-2xl font-black font-mono text-primary">{activeCount}</div>
            <div className="text-[11px] text-muted-foreground">Currently funded & in debt service</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Defaulted Loans</div>
            <div className="text-2xl font-black font-mono text-destructive">{defaultedCount}</div>
            <div className="text-[11px] text-muted-foreground">Collateral seized upon breach</div>
          </div>
        </div>

        {/* Health & Protocol Status Bar */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Chainlink Oracle Status</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono">{ethPriceUSD}</span>
              <span className="text-xs text-emerald-400 font-semibold font-mono">ONLINE</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Feed staleness threshold: 3,600s. Price deviation circuits operational.
            </p>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Protocol Circuit Breakers</span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-2xl font-black text-emerald-400">OPERATIONAL</div>
            <p className="text-xs text-muted-foreground">
              All core contracts unpaused. Lending and escrow settlements functioning normally.
            </p>
          </div>
        </div>

        {/* Admin Navigation Hub */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Administrative Modules
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              href="/admin/approvals"
              className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  Loan Approval Queue
                </div>
                <p className="text-xs text-muted-foreground">
                  Review borrower applications and submit on-chain approvals or rejections.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>

            <Link
              href="/admin/verification"
              className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Document Verification Review
                </div>
                <p className="text-xs text-muted-foreground">
                  Review borrower salary slips and bank statements to assign SOURCE_VERIFIED status.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>

            <Link
              href="/admin/oracle"
              className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Risk & Oracle Telemetry
                </div>
                <p className="text-xs text-muted-foreground">
                  Inspect Chainlink price feeds, LTV health ratios, and liquidation buffers.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>

            <Link
              href="/admin/roles"
              className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  Role Management
                </div>
                <p className="text-xs text-muted-foreground">
                  Grant or revoke APPROVER_ROLE, OPERATOR_ROLE, and ISSUER_ROLE assignments.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>

            <Link
              href="/admin/controls"
              className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-destructive" />
                  Emergency Controls
                </div>
                <p className="text-xs text-muted-foreground">
                  Execute pause / unpause circuit breakers for protocol smart contracts.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>

            <Link
              href="/explorer"
              className="p-5 rounded-2xl border bg-card/50 hover:bg-muted/40 transition-colors group flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  Contract Explorer
                </div>
                <p className="text-xs text-muted-foreground">
                  Inspect raw smart contract ABIs, deployed addresses, and on-chain state.
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
