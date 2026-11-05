"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { useRole } from "@/context/RoleContext";
import {
  Wallet, UserCheck, Briefcase, ShieldCheck, Eye, EyeOff,
  ArrowRight, Lock, CheckCircle2, Zap, TrendingUp, Shield,
} from "lucide-react";

const DEMO_ADMIN_PASSWORD = "admin123";
const DEMO_ADMIN_EMAIL = "admin@credchain.io";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { setRole, demoLogin, isLoggedIn, role } = useRole();

  const [tab, setTab] = useState<"signin" | "signup">(initialTab as "signin" | "signup");
  const [signupRole, setSignupRole] = useState<"borrower" | "lender" | null>(null);
  const [signupName, setSignupName] = useState("");
  const [adminEmail, setAdminEmail] = useState("admin@credchain.io");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [signInMode, setSignInMode] = useState<"wallet" | "admin">("wallet");

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (role === "lender") router.push("/lender");
      else if (role === "admin") router.push("/admin");
      else router.push("/borrower");
    }
  }, [isLoggedIn, role, router]);

  const connectMetaMask = () => {
    const injected = connectors.find((c) => c.name === "MetaMask" || c.id === "injected");
    if (injected) connect({ connector: injected });
    else if (connectors[0]) connect({ connector: connectors[0] });
  };

  const handleWalletSignIn = () => {
    connectMetaMask();
  };

  const handleWalletSignup = () => {
    if (!signupRole) return;
    setRole(signupRole);
    connectMetaMask();
    setTimeout(() => {
      if (!isConnected) {
        demoLogin(signupRole, signupName || undefined);
        router.push(signupRole === "borrower" ? "/borrower" : "/lender");
      }
    }, 800);
  };

  const handleAdminLogin = async () => {
    setAdminError("");
    setAdminLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    if (adminEmail !== DEMO_ADMIN_EMAIL || adminPassword !== DEMO_ADMIN_PASSWORD) {
      setAdminError("Invalid credentials. Demo: admin@credchain.io / admin123");
      setAdminLoading(false);
      return;
    }

    demoLogin("admin", "Demo Admin");
    setAdminLoading(false);
    router.push("/admin");
  };

  const handleDemoLogin = (demoRole: "borrower" | "lender" | "admin") => {
    demoLogin(demoRole);
    if (demoRole === "borrower") router.push("/borrower");
    else if (demoRole === "lender") router.push("/lender");
    else router.push("/admin");
  };

  const inputStyle = {
    borderColor: "#E5E1D7",
    backgroundColor: "#fff",
    color: "#252C29",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#183B32";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,59,50,0.08)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#E5E1D7";
    e.currentTarget.style.boxShadow = "none";
  };

  const features = [
    { icon: Shield,       text: "On-chain verified reputation scores" },
    { icon: TrendingUp,   text: "AI-powered credit assessment" },
    { icon: Zap,          text: "Instant micro-lending decisions" },
    { icon: CheckCircle2, text: "Transparent loan lifecycle" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-between p-12"
        style={{ backgroundColor: "#183B32" }}
      >
        <div
          className="absolute w-96 h-96 rounded-full opacity-10 -top-32 -left-32"
          style={{ backgroundColor: "#D6A85F" }}
        />
        <div
          className="absolute w-72 h-72 rounded-full opacity-10 -bottom-24 -right-16"
          style={{ backgroundColor: "#D6A85F" }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ backgroundColor: "#D6A85F", color: "#183B32" }}
            >
              CC
            </div>
            <span className="text-2xl font-bold" style={{ color: "#F4F1E8" }}>
              CredChain
            </span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: "#F4F1E8" }}>
            Your financial<br />reputation,<br />
            <span style={{ color: "#D6A85F" }}>on-chain.</span>
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "#F4F1E8", opacity: 0.8 }}>
            Build credit history transparently. Access lending at fair rates based on your verified blockchain reputation.
          </p>
        </div>

        <div className="relative space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(214,168,95,0.15)" }}
              >
                <Icon className="h-4 w-4" style={{ color: "#D6A85F" }} />
              </div>
              <span className="text-sm" style={{ color: "#F4F1E8", opacity: 0.85 }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right auth panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12" style={{ backgroundColor: "#F4F1E8" }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs"
              style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
            >
              CC
            </div>
            <span className="text-xl font-bold" style={{ color: "#183B32" }}>
              CredChain
            </span>
          </div>

          {/* Tab switcher */}
          <div
            className="flex p-1 rounded-xl mb-8 border"
            style={{ backgroundColor: "#E5E1D7", borderColor: "#E5E1D7" }}
          >
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
                style={
                  tab === t
                    ? { backgroundColor: "#fff", color: "#252C29", boxShadow: "0 1px 3px rgba(37,44,41,0.1)" }
                    : { color: "#777B73" }
                }
              >
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* ══ SIGN IN ══ */}
          {tab === "signin" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "#252C29" }}>
                  Welcome back
                </h2>
                <p className="text-sm mt-1" style={{ color: "#777B73" }}>
                  Choose how you'd like to sign in
                </p>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                {[
                  { mode: "wallet" as const, label: "Demo & Wallet", icon: Wallet },
                  { mode: "admin" as const, label: "Admin Login", icon: ShieldCheck },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setSignInMode(mode)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                    style={
                      signInMode === mode
                        ? { backgroundColor: "rgba(24,59,50,0.08)", borderColor: "#183B32", color: "#183B32" }
                        : { borderColor: "#E5E1D7", color: "#777B73", backgroundColor: "#fff" }
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {signInMode === "wallet" && (
                <div className="space-y-4">
                  {/* Quick Demo Logins - Prominent and One-Click */}
                  <div className="p-4 rounded-xl border bg-white space-y-3" style={{ borderColor: "#E5E1D7" }}>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#777B73]">
                      Instant Demo Login (No Wallet Needed)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { role: "borrower" as const, label: "Borrower", icon: UserCheck, color: "#315B4C" },
                        { role: "lender" as const, label: "Lender", icon: Briefcase, color: "#B77B26" },
                        { role: "admin" as const, label: "Admin", icon: ShieldCheck, color: "#183B32" },
                      ].map(({ role: r, label, icon: Icon, color }) => (
                        <button
                          key={r}
                          onClick={() => handleDemoLogin(r)}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all hover:shadow-md"
                          style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                          <span className="text-xs font-bold" style={{ color: "#252C29" }}>{label}</span>
                          <span className="text-[10px] text-[#777B73]">One-Click</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 border-t" style={{ borderColor: "#E5E1D7" }} />
                    <span className="text-xs" style={{ color: "#777B73" }}>or connect Web3 wallet</span>
                    <div className="flex-1 border-t" style={{ borderColor: "#E5E1D7" }} />
                  </div>

                  <button
                    onClick={handleWalletSignIn}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
                    style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                  >
                    <Wallet className="h-4 w-4" /> Connect MetaMask
                  </button>
                </div>
              )}

              {signInMode === "admin" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#777B73" }}>
                      Admin Email
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@credchain.io"
                      className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-all"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#777B73" }}>
                      Password
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border outline-none transition-all"
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "#777B73" }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {adminError && (
                    <div
                      className="text-xs p-3 rounded-xl border"
                      style={{
                        color: "#B94B45",
                        backgroundColor: "rgba(185,75,69,0.08)",
                        borderColor: "rgba(185,75,69,0.2)",
                      }}
                    >
                      {adminError}
                    </div>
                  )}

                  <div className="p-3 rounded-xl border text-xs bg-white" style={{ borderColor: "#E5E1D7" }}>
                    <span className="font-semibold" style={{ color: "#252C29" }}>Demo Admin Credentials: </span>
                    <span style={{ color: "#777B73" }}>admin@credchain.io / admin123</span>
                  </div>

                  <button
                    onClick={handleAdminLogin}
                    disabled={adminLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm shadow-sm disabled:opacity-70 transition-all"
                    style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                  >
                    <Lock className="h-4 w-4" />
                    {adminLoading ? "Logging in..." : "Sign In as Admin"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ SIGN UP ══ */}
          {tab === "signup" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "#252C29" }}>
                  Create your account
                </h2>
                <p className="text-sm mt-1" style={{ color: "#777B73" }}>
                  Choose your role to get started
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#777B73" }}>
                  Your name <span style={{ color: "#777B73" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-all"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#777B73" }}>
                  I want to…
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { role: "borrower" as const, label: "Borrow", icon: UserCheck, desc: "Get loans based on on-chain credit", color: "#315B4C" },
                    { role: "lender" as const, label: "Lend", icon: Briefcase, desc: "Fund loans & earn fixed APR returns", color: "#B77B26" },
                  ].map(({ role: r, label, icon: Icon, desc, color }) => (
                    <button
                      key={r}
                      onClick={() => setSignupRole(r)}
                      className="relative flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all"
                      style={
                        signupRole === r
                          ? { borderColor: color, backgroundColor: "rgba(24,59,50,0.05)" }
                          : { borderColor: "#E5E1D7", backgroundColor: "#fff" }
                      }
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: signupRole === r ? "rgba(24,59,50,0.1)" : "#F4F1E8", color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: "#252C29" }}>{label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#777B73" }}>{desc}</div>
                      </div>
                      {signupRole === r && (
                        <CheckCircle2 className="h-4 w-4 absolute top-3 right-3" style={{ color }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={!signupRole}
                  onClick={() => {
                    if (signupRole) {
                      demoLogin(signupRole, signupName || undefined);
                      router.push(signupRole === "lender" ? "/lender" : "/borrower");
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  style={{ borderColor: "#183B32", color: "#183B32", backgroundColor: "#fff" }}
                >
                  Start Demo Directly
                </button>
                <button
                  type="button"
                  disabled={!signupRole}
                  onClick={handleWalletSignup}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: "#777B73" }}>
                Already have an account?{" "}
                <button
                  onClick={() => setTab("signin")}
                  className="font-semibold hover:underline"
                  style={{ color: "#183B32" }}
                >
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
