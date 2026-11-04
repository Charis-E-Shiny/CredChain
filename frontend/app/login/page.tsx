"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRole } from "@/context/RoleContext";
import {
  Wallet,
  UserCheck,
  Briefcase,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  CheckCircle2,
  Zap,
  TrendingUp,
  Shield,
} from "lucide-react";

// Demo credentials
const DEMO_ADMIN_PASSWORD = "admin123";
const DEMO_ADMIN_EMAIL = "admin@credchain.io";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { setRole, isAdmin, isApprover } = useRole();

  const [tab, setTab] = useState<"signin" | "signup">(initialTab as "signin" | "signup");
  const [signupRole, setSignupRole] = useState<"borrower" | "lender" | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [signInMode, setSignInMode] = useState<"wallet" | "admin">("wallet");
  const [name, setName] = useState("");

  // If already connected, redirect to appropriate dashboard
  useEffect(() => {
    if (isConnected && address) {
      const savedRole = localStorage.getItem("credchain_user_role");
      if (savedRole === "borrower") router.push("/borrower");
      else if (savedRole === "lender") router.push("/lender");
      else if (savedRole === "admin" && (isAdmin || isApprover)) router.push("/admin");
    }
  }, [isConnected, address, isAdmin, isApprover, router]);

  const connectWallet = () => {
    const injected = connectors.find((c) => c.name === "MetaMask" || c.id === "injected");
    if (injected) connect({ connector: injected });
    else if (connectors[0]) connect({ connector: connectors[0] });
  };

  const handleWalletSignup = () => {
    if (!signupRole) return;
    setRole(signupRole);
    connectWallet();
    router.push(signupRole === "borrower" ? "/borrower" : "/lender");
  };

  const handleWalletSignIn = () => {
    connectWallet();
    // After connecting, redirect based on saved role or default to borrower
    setTimeout(() => {
      const savedRole = localStorage.getItem("credchain_user_role") as "borrower" | "lender" | "admin" | null;
      if (savedRole) {
        setRole(savedRole);
        router.push(savedRole === "admin" ? "/admin" : savedRole === "lender" ? "/lender" : "/borrower");
      } else {
        router.push("/borrower");
      }
    }, 500);
  };

  const handleAdminLogin = async () => {
    setAdminError("");
    setAdminLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // simulate check

    if (adminEmail !== DEMO_ADMIN_EMAIL || adminPassword !== DEMO_ADMIN_PASSWORD) {
      setAdminError("Invalid credentials. Use admin@credchain.io / admin123 for demo.");
      setAdminLoading(false);
      return;
    }

    // Connect with admin wallet via MetaMask
    setRole("admin");
    connectWallet();
    setAdminLoading(false);
    router.push("/admin");
  };

  const handleDemoLogin = (demoRole: "borrower" | "lender" | "admin") => {
    setRole(demoRole);
    connectWallet();
    if (demoRole === "borrower") router.push("/borrower");
    else if (demoRole === "lender") router.push("/lender");
    else router.push("/admin");
  };

  const features = [
    { icon: Shield, text: "On-chain verified reputation scores" },
    { icon: TrendingUp, text: "AI-powered credit assessment" },
    { icon: Zap, text: "Instant micro-lending decisions" },
    { icon: CheckCircle2, text: "Transparent loan lifecycle" },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden flex-col justify-between p-12">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-sm">
              CC
            </div>
            <span className="text-2xl font-bold text-white">CredChain</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your financial<br />
            reputation,<br />
            <span className="text-indigo-200">on-chain.</span>
          </h1>
          <p className="text-indigo-100 text-lg leading-relaxed">
            Build credit history transparently. Access lending at fair rates based on your verified blockchain reputation.
          </p>
        </div>

        <div className="relative space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-indigo-100 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white font-black text-xs">
              CC
            </div>
            <span className="text-xl font-bold">CredChain</span>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-muted/60 rounded-xl mb-8 border">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {tab === "signin" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                <p className="text-muted-foreground text-sm mt-1">Sign in to access your account</p>
              </div>

              {/* Sign-in mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSignInMode("wallet")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    signInMode === "wallet"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  Wallet
                </button>
                <button
                  onClick={() => setSignInMode("admin")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    signInMode === "admin"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </button>
              </div>

              {signInMode === "wallet" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border bg-muted/30 text-sm text-muted-foreground">
                    Connect your MetaMask wallet to sign in. Your role will be restored automatically.
                  </div>
                  <button
                    onClick={handleWalletSignIn}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/25"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect MetaMask
                  </button>

                  <div className="relative flex items-center gap-3 py-2">
                    <div className="flex-1 border-t" />
                    <span className="text-xs text-muted-foreground">or try a demo account</span>
                    <div className="flex-1 border-t" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleDemoLogin("borrower")}
                      className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border hover:bg-muted/50 transition-all group"
                    >
                      <UserCheck className="h-5 w-5 text-indigo-400 group-hover:text-primary transition-colors" />
                      <span className="text-xs font-semibold">Borrower</span>
                      <span className="text-[10px] text-muted-foreground">Demo</span>
                    </button>
                    <button
                      onClick={() => handleDemoLogin("lender")}
                      className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border hover:bg-muted/50 transition-all group"
                    >
                      <Briefcase className="h-5 w-5 text-violet-400 group-hover:text-primary transition-colors" />
                      <span className="text-xs font-semibold">Lender</span>
                      <span className="text-[10px] text-muted-foreground">Demo</span>
                    </button>
                    <button
                      onClick={() => handleDemoLogin("admin")}
                      className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border hover:bg-muted/50 transition-all group"
                    >
                      <ShieldCheck className="h-5 w-5 text-emerald-400 group-hover:text-primary transition-colors" />
                      <span className="text-xs font-semibold">Admin</span>
                      <span className="text-[10px] text-muted-foreground">Demo</span>
                    </button>
                  </div>
                </div>
              )}

              {signInMode === "admin" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@credchain.io"
                      className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                    <div className="relative mt-1.5">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                        onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {adminError && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                      {adminError}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-muted/30 border text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Demo credentials: </span>
                    admin@credchain.io / admin123
                  </div>

                  <button
                    onClick={handleAdminLogin}
                    disabled={adminLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 disabled:opacity-70"
                  >
                    <Lock className="h-4 w-4" />
                    {adminLoading ? "Verifying..." : "Sign In as Admin"}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "signup" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
                <p className="text-muted-foreground text-sm mt-1">Choose your role to get started</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  I want to…
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSignupRole("borrower")}
                    className={`flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      signupRole === "borrower"
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border hover:border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      signupRole === "borrower" ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">Borrow</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Get loans based on my on-chain credit</div>
                    </div>
                    {signupRole === "borrower" && (
                      <CheckCircle2 className="h-4 w-4 text-primary absolute top-3 right-3" />
                    )}
                  </button>

                  <button
                    onClick={() => setSignupRole("lender")}
                    className={`flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      signupRole === "lender"
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border hover:border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      signupRole === "lender" ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">Lend</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Fund loans and earn returns</div>
                    </div>
                    {signupRole === "lender" && (
                      <CheckCircle2 className="h-4 w-4 text-primary absolute top-3 right-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-muted/30 text-sm text-muted-foreground">
                <div className="font-semibold text-foreground mb-1">Connect your wallet</div>
                You'll be asked to connect MetaMask. This creates your on-chain identity — no password needed.
              </div>

              <button
                onClick={handleWalletSignup}
                disabled={!signupRole}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wallet className="h-4 w-4" />
                {signupRole
                  ? `Continue as ${signupRole === "borrower" ? "Borrower" : "Lender"}`
                  : "Select a role to continue"}
                {signupRole && <ArrowRight className="h-4 w-4" />}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => setTab("signin")} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
