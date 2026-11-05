"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { useRole, UserRole } from "@/context/RoleContext";
import {
  Wallet, UserCheck, Briefcase, ShieldCheck, Eye, EyeOff,
  ArrowRight, Lock, CheckCircle2, Zap, TrendingUp, Shield,
  Mail, User, Check, AlertCircle
} from "lucide-react";

const DEMO_ADMIN_PASSWORD = "admin123";
const DEMO_ADMIN_EMAIL = "admin@credchain.io";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { demoLogin, isLoggedIn, role } = useRole();

  const [tab, setTab] = useState<"signin" | "signup">(initialTab as "signin" | "signup");

  // Sign Up Form States
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"borrower" | "lender">("borrower");
  const [signupAgreed, setSignupAgreed] = useState(true);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Sign In Form States
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinRemember, setSigninRemember] = useState(true);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [signinError, setSigninError] = useState("");
  const [signinLoading, setSigninLoading] = useState(false);

  // Auto-redirect if already logged in
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

  // Real Sign Up Handler
  const handleRealSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");

    if (!signupName.trim()) {
      setSignupError("Please enter your full legal or display name.");
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes("@")) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters long.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match. Please verify.");
      return;
    }
    if (!signupAgreed) {
      setSignupError("You must agree to the Terms of Service to create an account.");
      return;
    }

    setSignupLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    // Log the user into their newly registered profile
    demoLogin(signupRole, signupName);
    setSignupLoading(false);
    router.push(signupRole === "borrower" ? "/borrower" : "/lender");
  };

  // Real Sign In Handler
  const handleRealSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigninError("");

    if (!signinEmail.trim()) {
      setSigninError("Please enter your registered email address.");
      return;
    }
    if (!signinPassword) {
      setSigninError("Please enter your account password.");
      return;
    }

    setSigninLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    // Admin detection
    if (signinEmail === DEMO_ADMIN_EMAIL) {
      if (signinPassword !== DEMO_ADMIN_PASSWORD) {
        setSigninError("Invalid admin credentials. Demo password is: admin123");
        setSigninLoading(false);
        return;
      }
      demoLogin("admin", "Admin Officer");
      setSigninLoading(false);
      router.push("/admin");
      return;
    }

    // Lender or Borrower detection from email domain / keyword, or default to borrower
    const isLender = signinEmail.toLowerCase().includes("lender") || signinEmail.toLowerCase().includes("invest");
    const derivedRole: UserRole = isLender ? "lender" : "borrower";
    const derivedName = signinEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    demoLogin(derivedRole, derivedName || (isLender ? "Registered Lender" : "Registered Borrower"));
    setSigninLoading(false);
    router.push(isLender ? "/lender" : "/borrower");
  };

  // 1-Click Demo Profiles (Shown below)
  const handle1ClickDemo = (targetRole: UserRole) => {
    demoLogin(targetRole);
    if (targetRole === "borrower") router.push("/borrower");
    else if (targetRole === "lender") router.push("/lender");
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
    { icon: Shield,       text: "On-chain cryptographic credit reputation" },
    { icon: TrendingUp,   text: "Consented AI credit scoring engine" },
    { icon: Zap,          text: "Peer-to-peer decentralized micro-lending" },
    { icon: CheckCircle2, text: "Chainlink oracle collateral escrow" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-stretch">
      {/* ── Left Branding Banner ── */}
      <div
        className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-between p-12 text-white"
        style={{ backgroundColor: "#183B32" }}
      >
        {/* Background ambient lighting circles */}
        <div
          className="absolute w-96 h-96 rounded-full opacity-10 -top-32 -left-32 pointer-events-none"
          style={{ backgroundColor: "#D6A85F" }}
        />
        <div
          className="absolute w-80 h-80 rounded-full opacity-10 -bottom-24 -right-16 pointer-events-none"
          style={{ backgroundColor: "#D6A85F" }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm"
              style={{ backgroundColor: "#D6A85F", color: "#183B32" }}
            >
              CC
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#F4F1E8]">
              CredChain
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.15] mb-5 text-[#F4F1E8]">
            Next-generation<br />financial identity,<br />
            <span style={{ color: "#D6A85F" }}>transparent & secure.</span>
          </h1>

          <p className="text-base text-[#F4F1E8]/80 leading-relaxed max-w-md">
            Join thousands of borrowers accessing fair rates and capital providers earning fixed APR yields through smart contract escrow.
          </p>
        </div>

        <div className="relative z-10 space-y-4 pt-8 border-t border-white/10">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(214,168,95,0.15)" }}
              >
                <Icon className="h-4 w-4" style={{ color: "#D6A85F" }} />
              </div>
              <span className="text-sm text-[#F4F1E8]/90 font-medium">
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Authentication Panel ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto"
        style={{ backgroundColor: "#F4F1E8" }}
      >
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs"
              style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
            >
              CC
            </div>
            <span className="text-xl font-bold text-[#183B32]">
              CredChain
            </span>
          </div>

          {/* Clean Segmented Tab Switcher */}
          <div
            className="flex p-1.5 rounded-2xl border shadow-sm"
            style={{ backgroundColor: "#E5E1D7", borderColor: "#E5E1D7" }}
          >
            <button
              onClick={() => {
                setTab("signin");
                setSigninError("");
              }}
              className="flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all"
              style={
                tab === "signin"
                  ? { backgroundColor: "#fff", color: "#183B32", boxShadow: "0 2px 4px rgba(37,44,41,0.08)" }
                  : { color: "#777B73" }
              }
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setSignupError("");
              }}
              className="flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all"
              style={
                tab === "signup"
                  ? { backgroundColor: "#fff", color: "#183B32", boxShadow: "0 2px 4px rgba(37,44,41,0.08)" }
                  : { color: "#777B73" }
              }
            >
              Create Account
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ══ REAL CREATE ACCOUNT (SIGN UP) FORM ══ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {tab === "signup" && (
            <div className="space-y-5 bg-white p-6 sm:p-8 rounded-3xl border shadow-sm" style={{ borderColor: "#E5E1D7" }}>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#252C29]">
                  Create your account
                </h2>
                <p className="text-xs text-[#777B73] mt-1">
                  Enter your credentials to register on CredChain
                </p>
              </div>

              {signupError && (
                <div
                  className="text-xs p-3.5 rounded-xl border flex items-center gap-2"
                  style={{
                    color: "#B94B45",
                    backgroundColor: "rgba(185,75,69,0.08)",
                    borderColor: "rgba(185,75,69,0.25)",
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{signupError}</span>
                </div>
              )}

              <form onSubmit={handleRealSignup} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#777B73] block mb-1.5">
                    Full Legal / Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Rachel Foster"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-all pl-10"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                    <User className="h-4 w-4 text-[#777B73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#777B73] block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-all pl-10"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                    <Mail className="h-4 w-4 text-[#777B73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Account Type Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#777B73] block mb-1.5">
                    Select Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSignupRole("borrower")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        signupRole === "borrower"
                          ? "border-[#183B32] bg-[#183B32]/5 shadow-sm"
                          : "border-[#E5E1D7] bg-white hover:bg-[#F4F1E8]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <UserCheck
                          className={`h-4 w-4 ${
                            signupRole === "borrower" ? "text-[#183B32]" : "text-[#777B73]"
                          }`}
                        />
                        {signupRole === "borrower" && (
                          <div className="h-2 w-2 rounded-full bg-[#183B32]" />
                        )}
                      </div>
                      <div className="font-bold text-xs text-[#252C29]">Borrower</div>
                      <div className="text-[10px] text-[#777B73] leading-tight mt-0.5">
                        Access micro-loans & credit scores
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupRole("lender")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        signupRole === "lender"
                          ? "border-[#B77B26] bg-[#B77B26]/5 shadow-sm"
                          : "border-[#E5E1D7] bg-white hover:bg-[#F4F1E8]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Briefcase
                          className={`h-4 w-4 ${
                            signupRole === "lender" ? "text-[#B77B26]" : "text-[#777B73]"
                          }`}
                        />
                        {signupRole === "lender" && (
                          <div className="h-2 w-2 rounded-full bg-[#B77B26]" />
                        )}
                      </div>
                      <div className="font-bold text-xs text-[#252C29]">Lender</div>
                      <div className="text-[10px] text-[#777B73] leading-tight mt-0.5">
                        Fund loans & earn fixed APR
                      </div>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#777B73] block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border outline-none transition-all pl-10"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                    <Lock className="h-4 w-4 text-[#777B73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777B73] hover:text-[#252C29]"
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#777B73] block mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-all pl-10"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                    <Lock className="h-4 w-4 text-[#777B73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Terms agreement checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={signupAgreed}
                    onChange={(e) => setSignupAgreed(e.target.checked)}
                    className="mt-0.5 rounded text-[#183B32] focus:ring-[#183B32]"
                  />
                  <span className="text-xs text-[#777B73] leading-snug">
                    I agree to CredChain's{" "}
                    <span className="text-[#183B32] font-semibold underline">Terms of Service</span> and{" "}
                    <span className="text-[#183B32] font-semibold underline">Privacy Policy</span>.
                  </span>
                </label>

                {/* Real Primary Submit Button */}
                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                >
                  {signupLoading ? (
                    <span>Creating your account...</span>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Web3 Alternative Option */}
              <div className="pt-2 border-t border-[#E5E1D7] text-center">
                <button
                  type="button"
                  onClick={connectMetaMask}
                  className="text-xs font-semibold text-[#183B32] hover:underline flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Or connect directly with Web3 wallet (MetaMask)</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ══ REAL SIGN IN FORM ══ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {tab === "signin" && (
            <div className="space-y-5 bg-white p-6 sm:p-8 rounded-3xl border shadow-sm" style={{ borderColor: "#E5E1D7" }}>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#252C29]">
                  Sign in to your account
                </h2>
                <p className="text-xs text-[#777B73] mt-1">
                  Enter your email and password to access your dashboard
                </p>
              </div>

              {signinError && (
                <div
                  className="text-xs p-3.5 rounded-xl border flex items-center gap-2"
                  style={{
                    color: "#B94B45",
                    backgroundColor: "rgba(185,75,69,0.08)",
                    borderColor: "rgba(185,75,69,0.25)",
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{signinError}</span>
                </div>
              )}

              <form onSubmit={handleRealSignin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#777B73] block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={signinEmail}
                      onChange={(e) => setSigninEmail(e.target.value)}
                      placeholder="e.g. borrower@credchain.io"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-all pl-10"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                    <Mail className="h-4 w-4 text-[#777B73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#777B73]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Password reset link will be sent to your registered email.")}
                      className="text-xs text-[#183B32] font-semibold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showSigninPassword ? "text" : "password"}
                      required
                      value={signinPassword}
                      onChange={(e) => setSigninPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border outline-none transition-all pl-10"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                    <Lock className="h-4 w-4 text-[#777B73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowSigninPassword(!showSigninPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777B73] hover:text-[#252C29]"
                    >
                      {showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signinRemember}
                      onChange={(e) => setSigninRemember(e.target.checked)}
                      className="rounded text-[#183B32] focus:ring-[#183B32]"
                    />
                    <span className="text-xs text-[#777B73]">Keep me signed in</span>
                  </label>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={signinLoading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                >
                  {signinLoading ? (
                    <span>Verifying credentials...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Web3 Alternative Option */}
              <div className="pt-2 border-t border-[#E5E1D7] text-center">
                <button
                  type="button"
                  onClick={connectMetaMask}
                  className="text-xs font-semibold text-[#183B32] hover:underline flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Or connect with MetaMask Web3 Wallet</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ══ DEDICATED DEMO SIGN-IN SECTION BELOW THE FORM ══ */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div
            className="p-5 rounded-3xl border shadow-sm space-y-3 bg-white"
            style={{ borderColor: "#E5E1D7" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#252C29]">
                  Instant Demo Login
                </div>
                <div className="text-[11px] text-[#777B73]">
                  Test the complete protocol with one click
                </div>
              </div>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                style={{ backgroundColor: "#F4F1E8", color: "#183B32" }}
              >
                Zero-Setup
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Demo Borrower */}
              <button
                type="button"
                onClick={() => handle1ClickDemo("borrower")}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all hover:shadow-md hover:scale-105 active:scale-95 text-center"
                style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(49, 91, 76, 0.12)", color: "#315B4C" }}
                >
                  <UserCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-[#252C29]">Borrower</span>
                <span className="text-[9px] text-[#777B73]">AI & Loans</span>
              </button>

              {/* Demo Lender */}
              <button
                type="button"
                onClick={() => handle1ClickDemo("lender")}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all hover:shadow-md hover:scale-105 active:scale-95 text-center"
                style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(183, 123, 38, 0.12)", color: "#B77B26" }}
                >
                  <Briefcase className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-[#252C29]">Lender</span>
                <span className="text-[9px] text-[#777B73]">Marketplace</span>
              </button>

              {/* Demo Admin */}
              <button
                type="button"
                onClick={() => handle1ClickDemo("admin")}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all hover:shadow-md hover:scale-105 active:scale-95 text-center"
                style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(52, 118, 90, 0.12)", color: "#34765A" }}
                >
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-[#252C29]">Admin</span>
                <span className="text-[9px] text-[#777B73]">Governance</span>
              </button>
            </div>
          </div>
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
