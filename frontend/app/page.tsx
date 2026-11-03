"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Cpu, Database, Award, ExternalLink, Coins } from "lucide-react";
import { useCredChain } from "@/hooks/useCredChain";
import { contracts, chainConfig } from "@/config/contracts";

export default function LandingPage() {
  const { isConnected, requestFaucet, isWritePending } = useCredChain();

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
          <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
          Next-Gen Decentralized Micro-Finance
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
          Trust. Verify. Borrow. Repay.
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
          CredChain bridges off-chain machine learning credit intelligence with Ethereum smart contract execution,
          transparent collateral escrow, Chainlink price oracles, and immutable on-chain reputation.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/credit-assessment"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
          >
            Start AI Credit Assessment
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg border font-semibold text-sm hover:bg-muted transition-colors"
          >
            View Live Dashboard
          </Link>
          {isConnected && (
            <button
              onClick={() => requestFaucet("1000")}
              disabled={isWritePending}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-cyan-500/30 text-cyan-400 bg-cyan-950/20 font-semibold text-sm hover:bg-cyan-950/40 transition-colors"
            >
              <Coins className="h-4 w-4" />
              {isWritePending ? "Minting..." : "Mint 1,000 Test CRED"}
            </button>
          )}
        </div>
      </section>

      {/* 4 Core Blockchain Modules */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Modular Smart Contract Architecture</h2>
          <p className="text-sm text-muted-foreground">
            Built as four independently verifiable modules with strict role-based separation of concerns.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl border bg-card space-y-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              M1
            </div>
            <h3 className="font-semibold text-base">Loan Lifecycle</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              State-machine enforced smart contract tracking loan requests, activations, partial repayments, and defaults.
            </p>
            <div className="text-xs font-mono text-primary">LoanManager.sol</div>
          </div>

          <div className="p-5 rounded-xl border bg-card space-y-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
              M2
            </div>
            <h3 className="font-semibold text-base">Token & Escrow</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ERC-20 test lending token with checks-effects-interactions collateral custody, release, and seizure.
            </p>
            <div className="text-xs font-mono text-cyan-400">CredToken + LoanEscrow.sol</div>
          </div>

          <div className="p-5 rounded-xl border bg-card space-y-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              M3
            </div>
            <h3 className="font-semibold text-base">Authorization</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Multi-signature governance approval for high-value loans with pause controls and role-based access control.
            </p>
            <div className="text-xs font-mono text-purple-400">LoanGovernance.sol</div>
          </div>

          <div className="p-5 rounded-xl border bg-card space-y-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              M4
            </div>
            <h3 className="font-semibold text-base">Oracle & Reputation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Chainlink ETH/USD real-time price feeds with staleness detection and deterministic on-chain borrower scoring.
            </p>
            <div className="text-xs font-mono text-emerald-400">CollateralOracle + Reputation.sol</div>
          </div>
        </div>
      </section>

      {/* Trust & Transparency */}
      <section className="p-6 rounded-2xl border bg-muted/20 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          System Verification & Transparency
        </h3>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="font-semibold text-foreground mb-1">Off-chain AI Underwriting</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              GradientBoosting classifier evaluates borrower financial features off-chain. Model outputs include calibrated confidence and SHAP factor contributions.
            </p>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1">On-chain Non-Custodial Custody</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Contracts manage collateral locks and token disbursements atomically. No central party can arbitrarily withdraw borrower collateral.
            </p>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1">Chainlink Live Valuation</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Collateral ratios are computed against decentralized oracles with staleness checks, preventing outdated price exploitation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
