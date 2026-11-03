"use client";

import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";
import {
  Wallet,
  Coins,
  TrendingUp,
  Award,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const {
    address,
    isConnected,
    chain,
    credBalance,
    totalLoans,
    activeLoans,
    reputationScore,
    oraclePrice,
    requestFaucet,
    isWritePending,
  } = useCredChain();

  const formattedBalance = credBalance ? formatTokenAmount(credBalance) : "0.00";
  const ethPriceUSD = oraclePrice ? (Number(oraclePrice) / 1e8).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "$2,500.00";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FinTech Overview</h1>
          <p className="text-sm text-muted-foreground">
            Live telemetry connected to Ethereum Sepolia smart contracts and off-chain AI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => requestFaucet("1000")}
            disabled={!isConnected || isWritePending}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Coins className="h-4 w-4" />
            {isWritePending ? "Processing..." : "Get 1,000 CRED Faucet"}
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>CRED Test Token</span>
            <Coins className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight">{formattedBalance} CRED</div>
          <div className="text-xs text-muted-foreground">Available test balance</div>
        </div>

        <div className="p-4 rounded-xl border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Active Platform Loans</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight">{activeLoans ? activeLoans.toString() : "0"}</div>
          <div className="text-xs text-muted-foreground">Total: {totalLoans ? totalLoans.toString() : "0"} initiated</div>
        </div>

        <div className="p-4 rounded-xl border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Borrower Reputation</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight">{reputationScore} / 100</div>
          <div className="text-xs text-emerald-500 font-medium">On-chain deterministic score</div>
        </div>

        <div className="p-4 rounded-xl border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Chainlink ETH / USD</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight">{ethPriceUSD}</div>
          <div className="text-xs text-muted-foreground">Decentralized price feed</div>
        </div>
      </div>

      {/* Account Info / Connection Status */}
      <div className="p-5 rounded-xl border bg-card/60 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
            Connected Wallet Status
          </h2>
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Wallet Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-950/40 text-yellow-400 border border-yellow-800">
              <AlertCircle className="h-3 w-3" />
              Not Connected
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-sm font-mono">
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="text-xs text-muted-foreground font-sans">Wallet Address</div>
            <div className="font-semibold truncate">{address || "Connect wallet to view"}</div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="text-xs text-muted-foreground font-sans">Network</div>
            <div className="font-semibold">{chain?.name || "Sepolia Testnet"}</div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="text-xs text-muted-foreground font-sans">Chain ID</div>
            <div className="font-semibold">{chain?.id || 11155111}</div>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href="/credit-assessment"
          className="p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors group flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">
              Run AI Risk Assessment
            </div>
            <p className="text-xs text-muted-foreground">Generate ML risk scores before borrowing</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/apply-loan"
          className="p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors group flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">
              Apply for Micro-Loan
            </div>
            <p className="text-xs text-muted-foreground">Request testnet funds with collateral locking</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/marketplace"
          className="p-5 rounded-xl border bg-card hover:bg-muted/50 transition-colors group flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">
              Browse Marketplace
            </div>
            <p className="text-xs text-muted-foreground">Fund approved loan requests as a lender</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
