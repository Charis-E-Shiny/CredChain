"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Award,
  Coins,
  TrendingUp,
  Zap,
  Lock,
  CheckCircle,
} from "lucide-react";
import { useCredChain } from "@/hooks/useCredChain";
import { useRole } from "@/context/RoleContext";
import { useAccount } from "wagmi";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { requestFaucet, isWritePending, credBalance } = useCredChain();
  const { setRole, role } = useRole();
  const router = useRouter();

  // Auto-redirect logged-in users to their dashboard
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-primary/10 text-primary text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Blockchain-Powered Credit & Lending
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Your reputation is{" "}
          <span className="bg-gradient-to-r from-violet-500 to-indigo-400 bg-clip-text text-transparent">
            your credit score.
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-base text-muted-foreground leading-relaxed">
          CredChain uses AI credit assessment and blockchain reputation to give everyone access to fair lending — no bank required.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/login?tab=signup"
            onClick={() => setRole("borrower")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setRole("lender")}
            className="px-6 py-3 rounded-xl border font-semibold text-sm hover:bg-muted/40 transition-colors"
          >
            Browse Loan Market
          </Link>
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-5 rounded-2xl border bg-card text-center space-y-2">
            <Icon className="h-5 w-5 text-primary mx-auto" />
            <div className="text-2xl font-extrabold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </section>

      {/* Role Cards */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Pick your experience</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Whether you need funds or want to invest — CredChain has a tailored portal for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Borrower */}
          <div className="p-6 rounded-2xl border bg-card space-y-4 hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/5 transition-all group flex flex-col">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-lg">Borrow</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get an AI credit assessment, apply for micro-loans with collateral, and build a verified on-chain credit history.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                {["AI credit assessment", "Micro-loan applications", "Verifiable credit passport"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-indigo-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login?tab=signup"
              onClick={() => setRole("borrower")}
              className="w-full py-2.5 rounded-xl bg-indigo-500/10 hover:bg-primary hover:text-primary-foreground text-indigo-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-indigo-500/20"
            >
              Start Borrowing →
            </Link>
          </div>

          {/* Lender */}
          <div className="p-6 rounded-2xl border bg-card space-y-4 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/5 transition-all group flex flex-col">
            <div className="h-11 w-11 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-lg">Lend</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fund vetted loan requests in the marketplace, earn interest returns, and track your portfolio performance.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                {["Browse loan marketplace", "Fixed APR returns", "Automatic repayment routing"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-violet-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login?tab=signup"
              onClick={() => setRole("lender")}
              className="w-full py-2.5 rounded-xl bg-violet-500/10 hover:bg-primary hover:text-primary-foreground text-violet-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-violet-500/20"
            >
              Start Lending →
            </Link>
          </div>

          {/* Admin */}
          <div className="p-6 rounded-2xl border bg-card space-y-4 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 transition-all group flex flex-col">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-lg">Govern</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Review the loan approval queue, manage roles, monitor oracle health, and maintain protocol integrity.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                {["Loan approval queue", "On-chain role management", "Oracle & risk monitoring"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-primary hover:text-primary-foreground text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-emerald-500/20"
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
          <h2 className="text-2xl font-bold">How it works</h2>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Connect Wallet", desc: "Link your MetaMask wallet to create your on-chain identity." },
            { step: "02", title: "AI Assessment", desc: "Complete a credit assessment — our ML model evaluates your profile privately." },
            { step: "03", title: "Get Funded", desc: "Approved loans are funded by lenders in the marketplace with escrow collateral." },
            { step: "04", title: "Build Reputation", desc: "Every repayment improves your on-chain credit passport score." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="p-5 rounded-2xl border bg-card/60 space-y-2">
              <div className="text-xs font-mono font-bold text-primary">{step}</div>
              <h3 className="font-bold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
