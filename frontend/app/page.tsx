"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, ShieldCheck, UserCheck, Briefcase, Award, Coins, TrendingUp, Zap, Lock, CheckCircle } from "lucide-react";
import { useCredChain } from "@/hooks/useCredChain";
import { useRole } from "@/context/RoleContext";
import { useAccount } from "wagmi";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { role, setRole } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      if (role === "lender") router.push("/lender");
      else if (role === "admin") router.push("/admin");
      else router.push("/borrower");
    }
  }, [isConnected, role, router]);

  const stats = [
    { label: "Loans Processed", value: "2,400+", icon: TrendingUp },
    { label: "Total Value Locked", value: "$1.2M", icon: Coins },
    { label: "Reputation Scores", value: "1,800+", icon: Award },
    { label: "On-time Repayments", value: "94%", icon: CheckCircle },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-20 py-10 pb-20">
      {/* Hero */}
      <section className="text-center space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
          style={{ borderColor: "#D6A85F", backgroundColor: "rgba(214,168,95,0.12)", color: "#B77B26" }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#D6A85F" }} />
          Blockchain-Powered Credit & Lending
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight" style={{ color: "#252C29" }}>
          Your reputation is{" "}
          <span style={{ color: "#183B32" }}>your credit score.</span>
        </h1>

        <p className="max-w-xl mx-auto text-base leading-relaxed" style={{ color: "#777B73" }}>
          CredChain uses AI credit assessment and blockchain reputation to give everyone access to fair lending — no bank required.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/login?tab=signup"
            onClick={() => setRole("borrower")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md"
            style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setRole("lender")}
            className="px-6 py-3 rounded-xl border font-semibold text-sm transition-colors"
            style={{ borderColor: "#E5E1D7", backgroundColor: "#fff", color: "#252C29" }}
          >
            Browse Loan Market
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-5 rounded-2xl border text-center space-y-2 shadow-sm"
            style={{ borderColor: "#E5E1D7", backgroundColor: "#fff" }}>
            <Icon className="h-5 w-5 mx-auto" style={{ color: "#315B4C" }} />
            <div className="text-2xl font-extrabold" style={{ color: "#252C29" }}>{value}</div>
            <div className="text-xs" style={{ color: "#777B73" }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Role Cards */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold" style={{ color: "#252C29" }}>Pick your experience</h2>
          <p className="text-sm mt-1" style={{ color: "#777B73" }}>
            Whether you need funds or want to invest, CredChain has a tailored portal for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Borrower */}
          <div className="p-6 rounded-2xl border shadow-sm space-y-4 flex flex-col transition-all hover:shadow-md"
            style={{ borderColor: "#E5E1D7", backgroundColor: "#fff" }}>
            <div className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(49,91,76,0.1)", color: "#315B4C" }}>
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-lg" style={{ color: "#252C29" }}>Borrow</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#777B73" }}>
                Get an AI credit assessment, apply for micro-loans with collateral, and build a verified on-chain credit history.
              </p>
              <ul className="text-xs space-y-1.5 pt-1">
                {["AI credit assessment", "Micro-loan applications", "Verifiable credit passport"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 shrink-0" style={{ color: "#315B4C" }} />
                    <span style={{ color: "#777B73" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login?tab=signup"
              onClick={() => setRole("borrower")}
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all border"
              style={{ borderColor: "#315B4C", color: "#315B4C", backgroundColor: "rgba(49,91,76,0.05)" }}
            >
              Start Borrowing →
            </Link>
          </div>

          {/* Lender */}
          <div className="p-6 rounded-2xl border shadow-sm space-y-4 flex flex-col transition-all hover:shadow-md"
            style={{ borderColor: "#E5E1D7", backgroundColor: "#fff" }}>
            <div className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(183,123,38,0.1)", color: "#B77B26" }}>
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-lg" style={{ color: "#252C29" }}>Lend</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#777B73" }}>
                Fund vetted loan requests in the marketplace, earn interest returns, and track your portfolio performance.
              </p>
              <ul className="text-xs space-y-1.5 pt-1">
                {["Browse loan marketplace", "Fixed APR returns", "Automatic repayment routing"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 shrink-0" style={{ color: "#B77B26" }} />
                    <span style={{ color: "#777B73" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login?tab=signup"
              onClick={() => setRole("lender")}
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all border"
              style={{ borderColor: "#B77B26", color: "#B77B26", backgroundColor: "rgba(183,123,38,0.05)" }}
            >
              Start Lending →
            </Link>
          </div>

          {/* Admin */}
          <div className="p-6 rounded-2xl border shadow-sm space-y-4 flex flex-col transition-all hover:shadow-md"
            style={{ borderColor: "#E5E1D7", backgroundColor: "#fff" }}>
            <div className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(52,118,90,0.1)", color: "#34765A" }}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-lg" style={{ color: "#252C29" }}>Govern</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#777B73" }}>
                Review loan approval queues, manage roles, monitor oracle health, and maintain protocol integrity.
              </p>
              <ul className="text-xs space-y-1.5 pt-1">
                {["Loan approval queue", "On-chain role management", "Oracle & risk monitoring"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 shrink-0" style={{ color: "#34765A" }} />
                    <span style={{ color: "#777B73" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all border"
              style={{ borderColor: "#34765A", color: "#34765A", backgroundColor: "rgba(52,118,90,0.05)" }}
            >
              <Lock className="h-3.5 w-3.5" />
              Admin Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold" style={{ color: "#252C29" }}>How it works</h2>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Connect Wallet", desc: "Link your MetaMask wallet to create your on-chain identity." },
            { step: "02", title: "AI Assessment", desc: "Complete a credit assessment — our ML model evaluates your profile privately." },
            { step: "03", title: "Get Funded", desc: "Approved loans are funded by lenders in the marketplace with escrow collateral." },
            { step: "04", title: "Build Reputation", desc: "Every repayment improves your on-chain credit passport score." },
          ].map(({ step, title, desc }, i) => (
            <div key={step} className="p-5 rounded-2xl border shadow-sm space-y-2 relative"
              style={{ borderColor: "#E5E1D7", backgroundColor: "#fff" }}>
              <div className="text-xs font-mono font-bold" style={{ color: "#D6A85F" }}>{step}</div>
              <h3 className="font-bold text-sm" style={{ color: "#252C29" }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#777B73" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
