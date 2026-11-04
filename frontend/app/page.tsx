"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, UserCheck, Briefcase, Award, Coins, Store, FilePlus2, Receipt } from "lucide-react";
import { useCredChain } from "@/hooks/useCredChain";
import { useRole } from "@/context/RoleContext";
import { formatTokenAmount } from "@/lib/utils";

export default function LandingPage() {
  const { isConnected, credBalance, requestFaucet, isWritePending } = useCredChain();
  const { setRole } = useRole();

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-8 pb-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
          <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
          AI-Powered Decentralized Micro-Lending Protocol
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
          Trust. Verify. Borrow. Repay.
        </h1>
        <p className="max-w-2xl mx-auto text-base text-muted-foreground leading-relaxed">
          CredChain bridges off-chain machine learning credit intelligence with Ethereum smart contract execution,
          transparent collateral escrow, Chainlink price feeds, and verifiable reputation passports.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/credit-assessment"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
          >
            Start AI Credit Assessment
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/borrower"
            onClick={() => setRole("borrower")}
            className="px-6 py-3 rounded-xl border bg-card font-semibold text-xs hover:bg-muted transition-colors"
          >
            Open Borrower Hub
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setRole("lender")}
            className="px-6 py-3 rounded-xl border border-sky-500/30 text-sky-400 bg-sky-950/20 font-semibold text-xs hover:bg-sky-950/40 transition-colors"
          >
            Loan Marketplace
          </Link>
          {isConnected && (
            <button
              onClick={() => requestFaucet("1000")}
              disabled={isWritePending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-950/20 font-semibold text-xs hover:bg-emerald-950/40 transition-colors"
            >
              <Coins className="h-4 w-4" />
              {isWritePending ? "Minting..." : "Mint 1,000 Test CRED"}
            </button>
          )}
        </div>
      </section>

      {/* Role Experiences Showcase */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Tailored FinTech Experiences</h2>
          <p className="text-xs text-muted-foreground">
            Switch seamlessly between borrower, lender, and governance perspectives with on-chain role enforcement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Borrower */}
          <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Borrower Hub</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Run consenting AI credit assessments, apply for micro-loans with collateral escrow, settle debt to unlock collateral, and build an on-chain reputation.
              </p>
              <div className="text-xs space-y-1 font-mono text-muted-foreground pt-1">
                <div>&bull; Consented ML Risk Scoring</div>
                <div>&bull; Micro-Loan Origination</div>
                <div>&bull; Verifiable Credit Passport</div>
              </div>
            </div>
            <Link
              href="/borrower"
              onClick={() => setRole("borrower")}
              className="w-full py-2.5 rounded-xl bg-muted/40 hover:bg-primary hover:text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border"
            >
              Enter Borrower Portal &rarr;
            </Link>
          </div>

          {/* Lender */}
          <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Lender Liquidity Hub</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Browse verified peer-to-peer loan requests in the marketplace, fund approved opportunities, track capital deployment, and earn transparent interest yields.
              </p>
              <div className="text-xs space-y-1 font-mono text-muted-foreground pt-1">
                <div>&bull; Peer-to-Peer Marketplace</div>
                <div>&bull; Transparent Fixed APR Yields</div>
                <div>&bull; Automatic Repayment Routing</div>
              </div>
            </div>
            <Link
              href="/lender"
              onClick={() => setRole("lender")}
              className="w-full py-2.5 rounded-xl bg-muted/40 hover:bg-primary hover:text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border"
            >
              Enter Lender Portal &rarr;
            </Link>
          </div>

          {/* Admin */}
          <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Protocol Governance</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review pending loan queues, configure multi-signature high-value thresholds, manage on-chain AccessControl roles, and trigger circuit breakers.
              </p>
              <div className="text-xs space-y-1 font-mono text-muted-foreground pt-1">
                <div>&bull; Loan Approval Queue</div>
                <div>&bull; Multi-Approver Thresholds</div>
                <div>&bull; OpenZeppelin Pausable Controls</div>
              </div>
            </div>
            <Link
              href="/admin"
              onClick={() => setRole("admin")}
              className="w-full py-2.5 rounded-xl bg-muted/40 hover:bg-primary hover:text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border"
            >
              Enter Admin Portal &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Blockchain Modules Overview */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Four Core Blockchain Modules</h2>
          <p className="text-xs text-muted-foreground">
            Formally tested state machines with strict separation of concerns across Solidity contracts.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border bg-card/60 space-y-2">
            <div className="text-xs font-mono font-bold text-sky-400">MODULE 1</div>
            <h3 className="font-bold text-sm">Loan Lifecycle</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              State-machine contract tracking loan requests, approvals, activations, partial repayments, and defaults.
            </p>
            <div className="text-[11px] font-mono text-muted-foreground">LoanManager.sol</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-400">MODULE 2</div>
            <h3 className="font-bold text-sm">Escrow & Custody</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Non-custodial collateral lock, automatic borrower release upon full repayment, and lender default seizure.
            </p>
            <div className="text-[11px] font-mono text-muted-foreground">LoanEscrow.sol</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 space-y-2">
            <div className="text-xs font-mono font-bold text-purple-400">MODULE 3</div>
            <h3 className="font-bold text-sm">Governance</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Role-based approvals, multi-approver threshold for high-value loans, and pause circuit breakers.
            </p>
            <div className="text-[11px] font-mono text-muted-foreground">LoanGovernance.sol</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-400">MODULE 4</div>
            <h3 className="font-bold text-sm">Oracle & Reputation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Chainlink ETH/USD real-time price feeds with staleness checks, deterministic borrower reputation, and credit passports.
            </p>
            <div className="text-[11px] font-mono text-muted-foreground">CollateralOracle + Reputation</div>
          </div>
        </div>
      </section>
    </div>
  );
}
