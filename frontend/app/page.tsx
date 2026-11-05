"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ShieldCheck, UserCheck, Briefcase, Award, Coins,
  TrendingUp, CheckCircle, BrainCircuit, FileText,
  Landmark, BarChart3, ChevronLeft, ChevronRight, Sparkles,
  Layers, Lock, Database, Cpu, Compass
} from "lucide-react";
import { useRole } from "@/context/RoleContext";

interface StepCard {
  step: string;
  title: string;
  badge: string;
  description: string;
  highlight: string;
  metric: string;
  metricLabel: string;
}

const BORROWER_STEPS: StepCard[] = [
  {
    step: "01",
    title: "On-Chain Identity Setup",
    badge: "Self-Sovereign Identity",
    description: "Connect your MetaMask wallet or use demo mode. Your on-chain address becomes your cryptographic identity with zero paperwork or invasive centralized bureaucracy.",
    highlight: "Privacy-first architecture: Zero personal documents stored on-chain.",
    metric: "100%",
    metricLabel: "Non-Custodial",
  },
  {
    step: "02",
    title: "AI Credit Risk Assessment",
    badge: "Consented Machine Learning",
    description: "Provide private financial indicators (income, debt-to-income, accounts). Our trained GradientBoosting model evaluates risk privately and computes a deterministic credit score.",
    highlight: "Deterministic scoring with transparent factor importances.",
    metric: "< 0.30",
    metricLabel: "Low Risk Target",
  },
  {
    step: "03",
    title: "Collateralized Loan Request",
    badge: "Smart Contract Escrow",
    description: "Originate loan requests in CRED tokens backed by ETH collateral calculated in real time through decentralized Chainlink ETH/USD oracle price feeds.",
    highlight: "Non-custodial locking handled directly by LoanEscrow.sol.",
    metric: "120%",
    metricLabel: "Collateral Ratio",
  },
  {
    step: "04",
    title: "Marketplace Funding & Disbursement",
    badge: "Direct Peer Disbursement",
    description: "Approved requests enter the peer-to-peer marketplace. Capital lenders fund the request, transferring CRED tokens directly into your wallet with no intermediary friction.",
    highlight: "Instant smart contract disbursement upon lender funding.",
    metric: "Instant",
    metricLabel: "Disbursement",
  },
  {
    step: "05",
    title: "Repayment & Credit Passport",
    badge: "Permanent Reputation Record",
    description: "Repay loans on time to automatically release locked collateral. Each completed cycle permanently elevates your on-chain reputation and verifiable Credit Passport.",
    highlight: "Generates an independently verifiable cryptographic Credit Passport.",
    metric: "0 - 100",
    metricLabel: "Reputation Score",
  },
];

const LENDER_STEPS: StepCard[] = [
  {
    step: "01",
    title: "Capital Deployment",
    badge: "Open Liquidity Access",
    description: "Deploy capital into the lending protocol with zero minimum deposit thresholds, flexible allocations, and total liquidity custody.",
    highlight: "Deposit CRED tokens and manage active portfolio investments.",
    metric: "0 CRED",
    metricLabel: "Minimum Deposit",
  },
  {
    step: "02",
    title: "Marketplace Due Diligence",
    badge: "Transparent Risk Disclosures",
    description: "Browse verified borrower requests with complete visibility into AI risk categories, term lengths, fixed APR returns, and verified collateral escrow balances.",
    highlight: "Consent-governed risk verification for informed allocations.",
    metric: "8% - 15%",
    metricLabel: "Fixed APR Yield",
  },
  {
    step: "03",
    title: "Escrow-Protected Investment",
    badge: "Smart Contract Custody",
    description: "Fund eligible loans with automated smart contract escrow. Capital is only transferred once borrower collateral has been cryptographically secured.",
    highlight: "Smart contracts enforce collateral retention automatically.",
    metric: "100%",
    metricLabel: "Escrow Backed",
  },
  {
    step: "04",
    title: "Automated Yield Accrual",
    badge: "Direct Yield Routing",
    description: "Borrower repayments are automatically routed directly to your lender address, returning principal alongside predictable fixed interest earnings.",
    highlight: "Real-time portfolio return analytics and payment tracking.",
    metric: "Real-Time",
    metricLabel: "Return Payouts",
  },
  {
    step: "05",
    title: "Algorithmic Default Protection",
    badge: "Automated Liquidation",
    description: "If a loan exceeds its repayment deadline, the smart contract allows lenders to seize the borrower's ETH collateral to recover value, backed by Chainlink oracles.",
    highlight: "Decentralized default mitigation with zero legal red tape.",
    metric: "Chainlink",
    metricLabel: "Price Oracle",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn, role } = useRole();

  const [activeTab, setActiveTab] = useState<"borrower" | "lender">("borrower");
  const [activeStep, setActiveStep] = useState(0);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (role === "lender") router.push("/lender");
      else if (role === "admin") router.push("/admin");
      else router.push("/borrower");
    }
  }, [isLoggedIn, role, router]);

  const currentSteps = activeTab === "borrower" ? BORROWER_STEPS : LENDER_STEPS;
  const currentCard = currentSteps[activeStep];

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % currentSteps.length);
  };

  const handlePrev = () => {
    setActiveStep((prev) => (prev - 1 + currentSteps.length) % currentSteps.length);
  };

  return (
    <div className="space-y-28 py-6 pb-28 max-w-6xl mx-auto">
      {/* ── 3D HERO SECTION ── */}
      <section className="relative pt-8 pb-4">
        {/* Ambient 3D glow blobs in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#183B32]/10 via-[#D6A85F]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Headline and Call-to-Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-[#252C29]">
              Your financial reputation,{" "}
              <span className="text-[#183B32] block sm:inline">
                verified on-chain.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#777B73] leading-relaxed max-w-xl mx-auto lg:mx-0">
              CredChain bridges consented machine learning credit intelligence with
              transparent Ethereum smart contracts. Fair rates for borrowers, protected yields for lenders.
            </p>

            {/* Standard Clean Fintech CTA Buttons (No role access buttons) */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/login?tab=signup"
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/login"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border shadow-sm transition-all hover:bg-white text-[#252C29] hover:scale-105 active:scale-95"
                style={{ borderColor: "#E5E1D7", backgroundColor: "rgba(255, 255, 255, 0.8)" }}
              >
                <span>Sign In to Account</span>
              </Link>
            </div>
          </div>

          {/* Right Column: 3D Isometric Holographic Preview Card */}
          <div className="lg:col-span-5 flex justify-center perspective-[1200px]">
            <div
              className="relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl transition-transform duration-700 hover:rotate-0"
              style={{
                backgroundColor: "#fff",
                borderColor: "#E5E1D7",
                transform: "rotateY(-10deg) rotateX(8deg) rotateZ(1deg)",
                transformStyle: "preserve-3d",
                boxShadow: "20px 30px 60px -15px rgba(24, 59, 50, 0.15), 0 0 0 1px rgba(229, 225, 215, 0.8)",
              }}
            >
              {/* Floating 3D Badge */}
              <div
                className="absolute -top-3 -right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md border"
                style={{
                  backgroundColor: "#183B32",
                  color: "#D6A85F",
                  borderColor: "#315B4C",
                  transform: "translateZ(30px)",
                }}
              >
                Verified Passport
              </div>

              {/* Passport Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#E5E1D7]">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                >
                  CC
                </div>
                <div>
                  <div className="text-xs font-bold text-[#252C29]">CredChain Passport</div>
                  <div className="text-[10px] font-mono text-[#777B73]">0x7099...79C8</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs font-mono font-bold text-[#34765A]">SCORE 94</div>
                  <div className="text-[9px] text-[#777B73]">Tier A+</div>
                </div>
              </div>

              {/* 3D Visual Metric Bars */}
              <div className="py-4 space-y-3" style={{ transform: "translateZ(20px)" }}>
                <div className="p-3 rounded-xl bg-[#F4F1E8]/70 border border-[#E5E1D7] flex items-center justify-between">
                  <span className="text-xs text-[#777B73] font-medium">Repayment Rate</span>
                  <span className="text-xs font-bold text-[#252C29]">100% On-Time</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F1E8]/70 border border-[#E5E1D7] flex items-center justify-between">
                  <span className="text-xs text-[#777B73] font-medium">Collateral Lock</span>
                  <span className="text-xs font-mono font-bold text-[#183B32]">1.25 ETH ($3,125)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F1E8]/70 border border-[#E5E1D7] flex items-center justify-between">
                  <span className="text-xs text-[#777B73] font-medium">AI Risk Rating</span>
                  <span className="text-xs font-semibold text-[#34765A]">Low Risk (0.14)</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-[#777B73] border-t border-[#E5E1D7]">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-[#34765A]" />
                  <span>Chainlink Oracle Synced</span>
                </span>
                <span className="font-mono text-[10px]">Block #21049</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KEY METRICS STATS ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Loan Volume Originated", value: "$1.4M+", icon: TrendingUp, color: "#315B4C" },
          { label: "Average Fixed APR", value: "11.8%", icon: Coins, color: "#B77B26" },
          { label: "Credit Passports Minted", value: "3,200+", icon: Award, color: "#183B32" },
          { label: "On-Time Settlement", value: "96.4%", icon: CheckCircle, color: "#34765A" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="p-5 rounded-2xl border shadow-sm text-center space-y-2 bg-white transition-all hover:shadow-md hover:-translate-y-1"
            style={{ borderColor: "#E5E1D7" }}
          >
            <Icon className="h-5 w-5 mx-auto" style={{ color }} />
            <div className="text-2xl sm:text-3xl font-extrabold text-[#252C29]">{value}</div>
            <div className="text-xs text-[#777B73] font-medium">{label}</div>
          </div>
        ))}
      </section>

      {/* ── 3D INTERACTIVE PITCH DECK SECTION ── */}
      <section className="space-y-8" id="pitch-deck">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#183B32] bg-[#183B32]/10 border border-[#183B32]/20">
            <Sparkles className="h-3.5 w-3.5 text-[#D6A85F]" />
            <span>Interactive 3D Protocol Pitch Deck</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#252C29]">
            The Complete Lifecycle in 3D Action
          </h2>
          <p className="text-sm text-[#777B73] max-w-lg mx-auto">
            Interact with the step-by-step lending lifecycle. Toggle between Borrower and Lender perspectives.
          </p>
        </div>

        {/* Tab Toggle: Borrower vs Lender */}
        <div className="flex justify-center">
          <div
            className="flex p-1.5 rounded-2xl border shadow-sm bg-[#F4F1E8]"
            style={{ borderColor: "#E5E1D7" }}
          >
            <button
              onClick={() => {
                setActiveTab("borrower");
                setActiveStep(0);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "borrower"
                  ? "bg-[#183B32] text-[#D6A85F] shadow-md scale-[1.02]"
                  : "text-[#777B73] hover:text-[#252C29]"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Borrower Journey (5 Steps)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("lender");
                setActiveStep(0);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "lender"
                  ? "bg-[#B77B26] text-white shadow-md scale-[1.02]"
                  : "text-[#777B73] hover:text-[#252C29]"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Lender Journey (5 Steps)</span>
            </button>
          </div>
        </div>

        {/* 3D Pitch Deck Stage with stacked card depth */}
        <div
          className="relative max-w-4xl mx-auto py-4"
          style={{ perspective: "1400px" }}
        >
          {/* Card Deck with 3D Depth Shadow & Lighting */}
          <div
            className="relative min-h-[380px] sm:min-h-[340px] rounded-3xl p-8 sm:p-10 border shadow-2xl transition-all duration-500 overflow-hidden flex flex-col justify-between"
            style={{
              backgroundColor: activeTab === "borrower" ? "#183B32" : "#264840",
              borderColor: activeTab === "borrower" ? "#315B4C" : "#B77B26",
              transform: "rotateX(2deg) translateY(-4px)",
              transformStyle: "preserve-3d",
              boxShadow: "0 25px 60px -15px rgba(24, 59, 50, 0.35)",
            }}
          >
            {/* Background 3D Watermark */}
            <div
              className="absolute -right-6 -bottom-10 text-[180px] font-black opacity-10 select-none pointer-events-none font-mono"
              style={{ color: "#D6A85F" }}
            >
              {currentCard.step}
            </div>

            {/* Top row: Badge and Step Pill */}
            <div className="flex items-center justify-between z-10">
              <div
                className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm"
                style={{
                  backgroundColor: "rgba(214, 168, 95, 0.15)",
                  borderColor: "rgba(214, 168, 95, 0.4)",
                  color: "#D6A85F",
                }}
              >
                {currentCard.badge}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#F4F1E8]/70">
                  Step {activeStep + 1} of {currentSteps.length}
                </span>
                <span
                  className="h-8 w-8 rounded-lg flex items-center justify-center font-mono font-black text-sm shadow-sm"
                  style={{ backgroundColor: "#D6A85F", color: "#183B32" }}
                >
                  {currentCard.step}
                </span>
              </div>
            </div>

            {/* Middle: Title & Description */}
            <div className="space-y-3 my-4 z-10">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight">
                {currentCard.title}
              </h3>
              <p className="text-sm sm:text-base text-[#F4F1E8]/85 leading-relaxed max-w-2xl">
                {currentCard.description}
              </p>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  color: "#D6A85F",
                }}
              >
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{currentCard.highlight}</span>
              </div>
            </div>

            {/* Bottom Row: Key Metric & Navigation Arrows */}
            <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-white/10 z-10">
              <div>
                <div className="text-2xl font-black text-[#D6A85F]">{currentCard.metric}</div>
                <div className="text-[11px] uppercase tracking-wider text-[#F4F1E8]/60 font-semibold">
                  {currentCard.metricLabel}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="h-10 w-10 rounded-xl border flex items-center justify-center text-[#F4F1E8] transition-all hover:bg-white/15"
                  style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
                  title="Previous Step"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 h-10 rounded-xl font-bold text-xs shadow-md transition-all hover:opacity-90"
                  style={{ backgroundColor: "#D6A85F", color: "#183B32" }}
                  title="Next Step"
                >
                  <span>Next Step</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stepper Dots & Clickable Steps */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {currentSteps.map((s, index) => (
              <button
                key={s.step}
                onClick={() => setActiveStep(index)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: activeStep === index ? "#183B32" : "#fff",
                  color: activeStep === index ? "#D6A85F" : "#777B73",
                  borderColor: activeStep === index ? "#183B32" : "#E5E1D7",
                }}
              >
                <span>{s.step}</span>
                <span className="hidden sm:inline font-normal text-[11px]">
                  {s.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3D PROTOCOL ARCHITECTURE PILLARS ── */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#252C29]">
            Formally Verified Smart Contract Architecture
          </h2>
          <p className="text-xs sm:text-sm text-[#777B73]">
            Four purpose-built modules coordinating credit origination, escrow custody, and governance.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              module: "MODULE 1",
              name: "LoanManager.sol",
              title: "State Transition Engine",
              desc: "Formally verified finite state machine tracking REQUESTED, APPROVED, ACTIVE, REPAID, and DEFAULTED transitions.",
              icon: Layers,
              accent: "#183B32",
            },
            {
              module: "MODULE 2",
              name: "LoanEscrow.sol",
              title: "Non-Custodial Custody",
              desc: "Locks borrower ETH collateral, holds disbursed loan funds, and automatically executes release or liquidation.",
              icon: Lock,
              accent: "#315B4C",
            },
            {
              module: "MODULE 3",
              name: "CollateralOracle.sol",
              title: "Chainlink Price Feeds",
              desc: "Retrieves real-time ETH/USD prices with staleness validation (3600s heartbeat) ensuring precise collateral valuation.",
              icon: Cpu,
              accent: "#B77B26",
            },
            {
              module: "MODULE 4",
              name: "LoanGovernance.sol",
              title: "Multi-Approval & Controls",
              desc: "Threshold-based governance requiring multi-approvals for loans over $10,000 and OpenZeppelin pausable emergency breakers.",
              icon: ShieldCheck,
              accent: "#34765A",
            },
          ].map(({ module, name, title, desc, icon: Icon, accent }) => (
            <div
              key={name}
              className="p-5 rounded-2xl border shadow-sm space-y-2.5 bg-white transition-all hover:shadow-md hover:-translate-y-1"
              style={{ borderColor: "#E5E1D7" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold" style={{ color: accent }}>
                  {module}
                </span>
                <Icon className="h-4 w-4" style={{ color: accent }} />
              </div>
              <h3 className="font-bold text-sm text-[#252C29]">{title}</h3>
              <p className="text-xs text-[#777B73] leading-relaxed">{desc}</p>
              <div className="pt-1 text-[11px] font-mono text-[#777B73]/70">{name}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
