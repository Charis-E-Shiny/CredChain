"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ShieldCheck, UserCheck, Briefcase, Award, Coins,
  TrendingUp, Lock, CheckCircle, BrainCircuit, FileText,
  Landmark, BarChart3, ChevronLeft, ChevronRight, Sparkles,
  Layers, ShieldAlert, ArrowUpRight
} from "lucide-react";
import { useRole, UserRole } from "@/context/RoleContext";

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
    title: "On-Chain Identity & Consent",
    badge: "Identity Setup",
    description: "Connect your MetaMask wallet or enter in Demo mode. No bank account, Social Security Number, or centralized credentials required.",
    highlight: "Privacy-first: Zero personal documents stored on-chain.",
    metric: "100%",
    metricLabel: "Self-Sovereign",
  },
  {
    step: "02",
    title: "AI Credit Risk Assessment",
    badge: "Consented ML Scoring",
    description: "Provide private financial indicators (income, debt-to-income, accounts). Our GradientBoosting classifier computes a predictive default risk score.",
    highlight: "Deterministic scoring with transparent contributing factors.",
    metric: "< 0.30",
    metricLabel: "Low Risk Target",
  },
  {
    step: "03",
    title: "Collateralized Loan Request",
    badge: "Smart Contract Escrow",
    description: "Submit your loan amount in CRED tokens backed by ETH collateral calculated via real-time Chainlink price feeds.",
    highlight: "Non-custodial custody via LoanEscrow.sol.",
    metric: "120%",
    metricLabel: "Collateral Ratio",
  },
  {
    step: "04",
    title: "Marketplace Funding & Disbursement",
    badge: "Liquidity Access",
    description: "Peer lenders review approved requests on the decentralized marketplace and fund the loan, instantly transferring CRED to your wallet.",
    highlight: "Automated disbursal with zero intermediary delays.",
    metric: "Instant",
    metricLabel: "Funding Speed",
  },
  {
    step: "05",
    title: "Repayment & Credit Passport",
    badge: "Reputation Growth",
    description: "Make flexible or full repayments to unlock your collateral. Every successful loan permanently increases your on-chain reputation score.",
    highlight: "Generates an independently verifiable Credit Passport.",
    metric: "0 - 100",
    metricLabel: "Score Range",
  },
];

const LENDER_STEPS: StepCard[] = [
  {
    step: "01",
    title: "Capital Deployment",
    badge: "Zero Minimum",
    description: "Enter the lender portal with CRED liquidity. No lockup period or high deposit thresholds to start investing.",
    highlight: "Direct peer-to-peer decentralized allocation.",
    metric: "0 CRED",
    metricLabel: "Min Deposit",
  },
  {
    step: "02",
    title: "Loan Marketplace Discovery",
    badge: "Transparent Due Diligence",
    description: "Filter through verified borrower requests with complete transparency into AI risk categories, duration, APR yields, and collateral backing.",
    highlight: "Consent-governed risk disclosures for every borrower.",
    metric: "8% - 15%",
    metricLabel: "Fixed APR",
  },
  {
    step: "03",
    title: "Escrow-Protected Investment",
    badge: "On-Chain Custody",
    description: "Fund eligible loans with a single transaction. Funds are escrowed and collateral is locked before capital is disbursed.",
    highlight: "Smart contracts enforce collateral retention automatically.",
    metric: "100%",
    metricLabel: "Escrow Guarded",
  },
  {
    step: "04",
    title: "Automated Yield Accrual",
    badge: "Yield Routing",
    description: "Borrower repayments are automatically routed directly to your lender address, returning principal and fixed interest yields.",
    highlight: "Real-time portfolio return analytics and payment tracking.",
    metric: "Real-Time",
    metricLabel: "Return Payouts",
  },
  {
    step: "05",
    title: "Smart Collateral Liquidation",
    badge: "Default Protection",
    description: "If a loan exceeds its repayment deadline, the smart contract allows the lender to seize the borrower's ETH collateral to recover value.",
    highlight: "Algorithmic default mitigation with zero legal friction.",
    metric: "Chainlink",
    metricLabel: "Price Oracle",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn, role, demoLogin } = useRole();

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

  const handleQuickDemo = (targetRole: UserRole) => {
    demoLogin(targetRole);
    if (targetRole === "borrower") router.push("/borrower");
    else if (targetRole === "lender") router.push("/lender");
    else router.push("/admin");
  };

  return (
    <div className="space-y-24 py-8 pb-24 max-w-6xl mx-auto">
      {/* ── HERO SECTION (Clean, warm, no unwanted badge) ── */}
      <section className="text-center space-y-6 pt-6">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-[#252C29]">
          Your financial reputation,{" "}
          <span className="text-[#183B32] block sm:inline">
            verified on-chain.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#777B73] leading-relaxed">
          CredChain unites machine learning credit scoring with Ethereum smart contracts.
          Borrow against verified reputation and invest capital with transparent collateral escrow.
        </p>

        {/* Hero CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            onClick={() => handleQuickDemo("borrower")}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
          >
            <span>Start as Borrower</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => handleQuickDemo("lender")}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm border shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: "#D6A85F",
              backgroundColor: "rgba(214, 168, 95, 0.08)",
              color: "#B77B26",
            }}
          >
            <Briefcase className="h-4 w-4" />
            <span>Enter as Lender</span>
          </button>

          <button
            onClick={() => handleQuickDemo("admin")}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm border transition-all hover:bg-white text-[#252C29]"
            style={{ borderColor: "#E5E1D7", backgroundColor: "#fff" }}
          >
            <ShieldCheck className="h-4 w-4 text-[#34765A]" />
            <span>Admin Portal</span>
          </button>
        </div>
      </section>

      {/* ── KEY METRICS STATS ROW ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Loan Volume Originated", value: "$1.4M+", icon: TrendingUp, color: "#315B4C" },
          { label: "Average APR Yield", value: "11.8%", icon: Coins, color: "#B77B26" },
          { label: "Credit Passports Minted", value: "3,200+", icon: Award, color: "#183B32" },
          { label: "On-Time Repayment Rate", value: "96.4%", icon: CheckCircle, color: "#34765A" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="p-5 rounded-2xl border shadow-sm text-center space-y-2 bg-white"
            style={{ borderColor: "#E5E1D7" }}
          >
            <Icon className="h-5 w-5 mx-auto" style={{ color }} />
            <div className="text-2xl sm:text-3xl font-extrabold text-[#252C29]">{value}</div>
            <div className="text-xs text-[#777B73] font-medium">{label}</div>
          </div>
        ))}
      </section>

      {/* ── 3D INTERACTIVE PITCH DECK SECTION ── */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#183B32] bg-[#183B32]/10 border border-[#183B32]/20">
            <Sparkles className="h-3.5 w-3.5 text-[#D6A85F]" />
            <span>Interactive Protocol Pitch Deck</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#252C29]">
            The Complete Lifecycle in Action
          </h2>
          <p className="text-sm text-[#777B73] max-w-lg mx-auto">
            Explore every phase of the lending protocol in 3D. Switch between borrower and lender journeys below.
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
                  ? "bg-[#183B32] text-[#D6A85F] shadow-md"
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
                  ? "bg-[#B77B26] text-white shadow-md"
                  : "text-[#777B73] hover:text-[#252C29]"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Lender Journey (5 Steps)</span>
            </button>
          </div>
        </div>

        {/* 3D Pitch Deck Stage */}
        <div
          className="relative max-w-4xl mx-auto py-6"
          style={{ perspective: "1400px" }}
        >
          {/* Main 3D Card Showcase */}
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
            {/* Background 3D Depth Watermarks */}
            <div
              className="absolute -right-8 -bottom-10 text-[180px] font-black opacity-10 select-none pointer-events-none font-mono"
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
                  className="h-8 w-8 rounded-lg flex items-center justify-center font-mono font-black text-sm"
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

            {/* Bottom Row: Metric Key Stat & Action Navigation */}
            <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-white/10 z-10">
              <div>
                <div className="text-2xl font-black text-[#D6A85F]">{currentCard.metric}</div>
                <div className="text-[11px] uppercase tracking-wider text-[#F4F1E8]/60 font-semibold">
                  {currentCard.metricLabel}
                </div>
              </div>

              {/* Step Navigation Arrows */}
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

          {/* Stepper Dots & Quick Navigation */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {currentSteps.map((s, index) => (
              <button
                key={s.step}
                onClick={() => setActiveStep(index)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
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

      {/* ── THREE ROLES OVERVIEW CARDS ── */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#252C29]">
            Three Tailored Fintech Portals
          </h2>
          <p className="text-xs sm:text-sm text-[#777B73]">
            Dedicated experiences built for borrowers, capital providers, and protocol governors.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Borrower */}
          <div
            className="p-6 rounded-2xl border shadow-sm space-y-4 flex flex-col justify-between transition-all hover:shadow-md bg-white"
            style={{ borderColor: "#E5E1D7" }}
          >
            <div className="space-y-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(49, 91, 76, 0.1)", color: "#315B4C" }}
              >
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-[#252C29]">Borrower Portal</h3>
              <p className="text-xs text-[#777B73] leading-relaxed">
                Assess credit profile through consented AI, originate collateralized micro-loans, and build an on-chain credit passport.
              </p>
              <ul className="text-xs space-y-1.5 pt-1 text-[#777B73]">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#315B4C]" />
                  <span>Consented ML Risk Scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#315B4C]" />
                  <span>Micro-Loan Origination</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#315B4C]" />
                  <span>Verifiable Credit Passport</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickDemo("borrower")}
              className="w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border"
              style={{
                borderColor: "#315B4C",
                color: "#315B4C",
                backgroundColor: "rgba(49, 91, 76, 0.05)",
              }}
            >
              <span>Launch Borrower Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Lender */}
          <div
            className="p-6 rounded-2xl border shadow-sm space-y-4 flex flex-col justify-between transition-all hover:shadow-md bg-white"
            style={{ borderColor: "#E5E1D7" }}
          >
            <div className="space-y-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(183, 123, 38, 0.1)", color: "#B77B26" }}
              >
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-[#252C29]">Lender Marketplace</h3>
              <p className="text-xs text-[#777B73] leading-relaxed">
                Deploy capital across verified loan requests, earn fixed APR returns, and protect investments via smart contract escrow.
              </p>
              <ul className="text-xs space-y-1.5 pt-1 text-[#777B73]">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#B77B26]" />
                  <span>Peer-to-Peer Loan Marketplace</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#B77B26]" />
                  <span>Transparent Fixed APR Yields</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#B77B26]" />
                  <span>Automated Repayment Routing</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickDemo("lender")}
              className="w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border"
              style={{
                borderColor: "#B77B26",
                color: "#B77B26",
                backgroundColor: "rgba(183, 123, 38, 0.05)",
              }}
            >
              <span>Launch Lender Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Admin */}
          <div
            className="p-6 rounded-2xl border shadow-sm space-y-4 flex flex-col justify-between transition-all hover:shadow-md bg-white"
            style={{ borderColor: "#E5E1D7" }}
          >
            <div className="space-y-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(52, 118, 90, 0.1)", color: "#34765A" }}
              >
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-[#252C29]">Governance & Admin</h3>
              <p className="text-xs text-[#777B73] leading-relaxed">
                Approve high-value loans, manage on-chain AccessControl roles, monitor Chainlink oracles, and trigger emergency controls.
              </p>
              <ul className="text-xs space-y-1.5 pt-1 text-[#777B73]">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#34765A]" />
                  <span>Loan Approval Queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#34765A]" />
                  <span>Role-Based Access Control</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#34765A]" />
                  <span>Oracle & Health Monitoring</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickDemo("admin")}
              className="w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border"
              style={{
                borderColor: "#34765A",
                color: "#34765A",
                backgroundColor: "rgba(52, 118, 90, 0.05)",
              }}
            >
              <span>Launch Admin Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
