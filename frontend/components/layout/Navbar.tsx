"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { useRole, UserRole } from "@/context/RoleContext";
import { useCredChain } from "@/hooks/useCredChain";
import { shortenAddress, formatTokenAmount, cn } from "@/lib/utils";
import {
  Wallet, ShieldCheck, Fuel, AlertCircle, X, Menu,
  ChevronDown, LayoutDashboard, BrainCircuit, FilePlus2,
  Store, Receipt, Award, Vote, Compass, SlidersHorizontal,
  Layers, TrendingUp, FileCheck2, Users, LogOut, Coins,
  Briefcase, UserCheck
} from "lucide-react";
import { chainConfig } from "@/config/contracts";
import { ANVIL_ACCOUNTS } from "@/lib/contractExecution";

// Borrower nav — Complete borrower lifecycle & underwriting journey
const borrowerNav = [
  { name: "Overview",       href: "/borrower",          icon: LayoutDashboard },
  { name: "AI Assessment & Verification", href: "/credit-assessment", icon: BrainCircuit },
  { name: "Apply for Loan", href: "/apply-loan",        icon: FilePlus2 },
  { name: "My Loans",       href: "/borrower/loans",    icon: Layers },
  { name: "Repayments",     href: "/repayment",         icon: Receipt },
  { name: "Credit Passport", href: "/credit-passport",  icon: ShieldCheck },
  { name: "My Reputation",  href: "/reputation",        icon: Award },
];

// Lender nav — Capital deployment, marketplace & portfolio performance
const lenderNav = [
  { name: "Overview",             href: "/lender",             icon: LayoutDashboard },
  { name: "Loan Marketplace",     href: "/marketplace",        icon: Store },
  { name: "My Investments",       href: "/lender/investments", icon: Coins },
  { name: "Returns & Repayments", href: "/lender/returns",     icon: Receipt },
  { name: "Blockchain Explorer",  href: "/explorer",           icon: Compass },
];

// Admin nav — Risk management, loan approval & protocol governance
const adminNav = [
  { name: "System Overview",       href: "/admin",              icon: LayoutDashboard },
  { name: "Loan Approvals",        href: "/admin/approvals",    icon: FileCheck2 },
  { name: "Document Verification", href: "/admin/verification", icon: ShieldCheck },
  { name: "Risk & Oracle",         href: "/admin/oracle",       icon: TrendingUp },
  { name: "Protocol Governance",   href: "/governance",         icon: Vote },
  { name: "Roles & Users",         href: "/admin/roles",        icon: Users },
  { name: "Protocol Controls",     href: "/admin/controls",     icon: SlidersHorizontal },
  { name: "Blockchain Explorer",   href: "/explorer",           icon: Compass },
];

const ROLE_LABELS: Record<UserRole, string> = {
  borrower: "Borrower",
  lender: "Lender",
  admin: "Admin",
};

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const pathname = usePathname();

  const handleConnectMetaMask = () => {
    const injected = connectors.find((c) => c.name === "MetaMask" || c.id === "injected");
    if (injected) {
      connect({ connector: injected });
    } else if (connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

  const {
    role, adminError, clearAdminError,
    isDemoMode, demoUser, demoLogout, isLoggedIn,
  } = useRole();
  const { credBalance, requestFaucet } = useCredChain();

  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  const [credFaucetLoading, setCredFaucetLoading] = useState(false);
  const [credFaucetSuccess, setCredFaucetSuccess] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleCredFaucet = async () => {
    setCredFaucetLoading(true);
    try {
      await requestFaucet("1000");
      setCredFaucetSuccess(true);
      setTimeout(() => setCredFaucetSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.shortMessage || err?.message || "Failed to mint CRED tokens in MetaMask.");
    } finally {
      setCredFaucetLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const requestEthFaucet = async () => {
    const targetAddress = address || (isDemoMode ? ANVIL_ACCOUNTS[role]?.address : undefined);
    if (!targetAddress) return;
    setFaucetLoading(true);
    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/borrowers/faucet/eth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: targetAddress, amount_eth: 1000 }),
      });
      if (res.ok) {
        setFaucetSuccess(true);
        setTimeout(() => setFaucetSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleSignOut = () => {
    demoLogout();
    if (isConnected) {
      disconnect();
    }
    setUserMenuOpen(false);
    router.push("/login");
  };

  const networkName = chain?.name || chainConfig.networkName;
  const chainId = chain?.id || chainConfig.chainId;

  // On auth page ("/login"), navigation links are hidden
  const isAuthPage = pathname === "/login";

  // Determine active navigation links based on role (shown when logged in and NOT on auth page)
  const activeNav = isAuthPage
    ? []
    : isLoggedIn
    ? role === "lender"
      ? lenderNav
      : role === "admin"
      ? adminNav
      : borrowerNav
    : [];

  const homeHref = isLoggedIn
    ? role === "lender"
      ? "/lender"
      : role === "admin"
      ? "/admin"
      : "/borrower"
    : "/";

  // Account display
  const accountLabel = isDemoMode
    ? (demoUser?.name || `${ROLE_LABELS[role]} (Demo)`)
    : address
    ? shortenAddress(address)
    : "Connected";

  const avatarInitials = isDemoMode
    ? (demoUser?.avatarInitials || role.slice(0, 2).toUpperCase())
    : address
    ? address.slice(2, 4).toUpperCase()
    : "CC";

  // Effective wallet address to display
  const displayAddress = address
    ? shortenAddress(address)
    : isDemoMode
    ? shortenAddress(ANVIL_ACCOUNTS[role]?.address || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    : null;

  return (
    <header
      className="sticky top-0 z-40 w-full shadow-sm transition-all"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Admin warning banner */}
      {adminError && (
        <div
          className="px-4 py-2 text-xs flex items-center justify-between border-b"
          style={{
            backgroundColor: "rgba(185,75,69,0.08)",
            borderColor: "rgba(185,75,69,0.2)",
            color: "#B94B45",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{adminError}</span>
          </div>
          <button onClick={clearAdminError} className="ml-4 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1st Top Bar: Brand Logo & Web3 / User Actions */}
      <div className="w-full border-b" style={{ borderColor: "#E5E1D7" }}>
        <div className="flex h-16 items-center justify-between px-4 lg:px-8 max-w-screen-2xl mx-auto gap-3 sm:gap-4">
          {/* Left: Brand Logo & Name */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href={homeHref} className="flex items-center gap-2.5 group">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
              >
                CC
              </div>
              <span className="text-xl font-bold tracking-tight" style={{ color: "#183B32" }}>
                CredChain
              </span>
            </Link>
          </div>

          {/* Right: MetaMask Live Pill, Network, CRED Balance, 1,000 ETH Faucet, +1,000 CRED Faucet, User Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
            {/* MetaMask Live Connection Pill / Connect Button */}
            {isConnected ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl border font-mono font-semibold shrink-0"
                style={{
                  borderColor: "rgba(52,118,90,0.3)",
                  backgroundColor: "rgba(52,118,90,0.08)",
                  color: "#34765A",
                }}
                title={`MetaMask Wallet Connected: ${address}`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>🦊 {shortenAddress(address || "")}</span>
              </div>
            ) : isDemoMode ? (
              <div
                onClick={handleConnectMetaMask}
                className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl border font-mono font-semibold shrink-0 transition-transform hover:scale-105"
                style={{
                  borderColor: "rgba(52,118,90,0.3)",
                  backgroundColor: "rgba(52,118,90,0.08)",
                  color: "#34765A",
                }}
                title="MetaMask Anvil Account (Click to connect interactive MetaMask)"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>🦊 {displayAddress}</span>
              </div>
            ) : (
              <button
                onClick={handleConnectMetaMask}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shadow-sm hover:scale-105 shrink-0"
                style={{
                  borderColor: "rgba(214,168,95,0.5)",
                  backgroundColor: "rgba(214,168,95,0.15)",
                  color: "#8B6514",
                }}
                title="Connect your MetaMask wallet for interactive on-chain signing"
              >
                <Wallet className="h-3.5 w-3.5 text-[#D6A85F]" />
                <span>Connect MetaMask</span>
              </button>
            )}

            {/* Network badge (Anvil Local) */}
            {(isConnected || isDemoMode) && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-mono shrink-0"
                style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
                title={`Network: ${networkName}`}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: "#34765A" }} />
                <span className="font-medium text-[#252C29] whitespace-nowrap">{networkName}</span>
              </div>
            )}

            {/* CRED Token Balance */}
            {(isConnected || isDemoMode) && (
              <div
                className="hidden xs:flex sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono shrink-0"
                style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
                title="CRED Balance in MetaMask"
              >
                <Coins className="h-3 w-3 shrink-0" style={{ color: "#D6A85F" }} />
                <span className="font-bold text-[#252C29] whitespace-nowrap">{formatTokenAmount(credBalance)}</span>
                <span className="text-[#777B73]">CRED</span>
              </div>
            )}

            {/* Anvil ETH Faucet Button: 1,000 ETH */}
            {(isConnected || isDemoMode) && (chainId === 31337 || isDemoMode) && (
              <button
                onClick={requestEthFaucet}
                disabled={faucetLoading}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{
                  borderColor: "rgba(52,118,90,0.3)",
                  backgroundColor: "rgba(52,118,90,0.08)",
                  color: "#34765A",
                }}
                title="Request 1,000 ETH test funds on Anvil"
              >
                <Fuel className="h-3 w-3 shrink-0" />
                <span className="whitespace-nowrap">{faucetSuccess ? "Credited!" : faucetLoading ? "..." : "1,000 ETH"}</span>
              </button>
            )}

            {/* CRED Token Faucet Button (MetaMask): +1,000 CRED */}
            {(isConnected || isDemoMode) && (
              <button
                onClick={handleCredFaucet}
                disabled={credFaucetLoading}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{
                  borderColor: "rgba(214,168,95,0.4)",
                  backgroundColor: "rgba(214,168,95,0.12)",
                  color: "#8B6514",
                }}
                title="Mint 1,000 CRED tokens via MetaMask"
              >
                <Coins className="h-3 w-3 text-[#D6A85F]" />
                <span className="whitespace-nowrap">{credFaucetSuccess ? "Minted!" : credFaucetLoading ? "Signing..." : "+1,000 CRED"}</span>
              </button>
            )}

            {/* Logged in state -> User Menu */}
            {isLoggedIn ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-sm hover:border-[#183B32]/30 bg-white"
                  style={{
                    borderColor: "#E5E1D7",
                  }}
                >
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                  >
                    {avatarInitials}
                  </div>
                  <div className="text-left hidden xs:block sm:block">
                    <div className="text-xs font-bold leading-tight" style={{ color: "#252C29" }}>
                      {accountLabel}
                    </div>
                    <div className="text-[10px] leading-tight" style={{ color: "#777B73" }}>
                      {isDemoMode ? `Demo · ${ROLE_LABELS[role]}` : ROLE_LABELS[role]}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-[#777B73] shrink-0" />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-60 rounded-2xl border bg-white shadow-xl overflow-hidden z-50 p-1"
                    style={{ borderColor: "#E5E1D7" }}
                  >
                    <div className="p-3 border-b" style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}>
                      <div className="text-xs font-bold" style={{ color: "#252C29" }}>{accountLabel}</div>
                      <div className="text-[11px] font-mono mt-0.5 text-[#777B73] truncate">
                        {isDemoMode ? `Active Profile: ${ROLE_LABELS[role]}` : address}
                      </div>
                    </div>

                    {/* Role-specific menu links */}
                    <div className="p-1">
                      {role === "borrower" && (
                        <>
                          <Link
                            href="/credit-passport"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#F4F1E8] text-[#252C29] transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-[#183B32]" />
                            <span>Credit Passport</span>
                          </Link>
                          <Link
                            href="/reputation"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#F4F1E8] text-[#252C29] transition-colors"
                          >
                            <Award className="h-4 w-4 text-[#183B32]" />
                            <span>My Reputation</span>
                          </Link>
                        </>
                      )}

                      {role === "lender" && (
                        <Link
                          href="/lender/investments"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#F4F1E8] text-[#252C29] transition-colors"
                        >
                          <Coins className="h-4 w-4 text-[#183B32]" />
                          <span>My Investments</span>
                        </Link>
                      )}

                      {role === "admin" && (
                        <>
                          <Link
                            href="/admin/approvals"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#F4F1E8] text-[#252C29] transition-colors"
                          >
                            <FileCheck2 className="h-4 w-4 text-[#183B32]" />
                            <span>Loan Approvals</span>
                          </Link>
                          <Link
                            href="/admin/verification"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#F4F1E8] text-[#252C29] transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-[#183B32]" />
                            <span>Document Review</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Sign Out */}
                    <div className="p-1 border-t" style={{ borderColor: "#E5E1D7" }}>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#B94B45]/10 text-[#B94B45] transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Logged out state */
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/login"
                  className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-[#F4F1E8]"
                  style={{ color: "#777B73" }}
                >
                  Sign In
                </Link>
                <Link
                  href="/login?tab=signup"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-105"
                  style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}

            {/* Mobile hamburger button */}
            {(isLoggedIn || activeNav.length > 0) && (
              <button
                className="md:hidden p-2 rounded-xl hover:bg-[#F4F1E8] transition-colors shrink-0"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{ color: "#252C29" }}
                aria-label="Toggle navigation menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2nd Top Bar: Navigation Sections */}
      {activeNav.length > 0 && (
        <div
          className="w-full border-b transition-all"
          style={{
            borderColor: "#E5E1D7",
            backgroundColor: "#FAF8F5",
          }}
        >
          <div className="flex h-11 items-center justify-between px-4 lg:px-8 max-w-screen-2xl mx-auto gap-4">
            <nav className="flex items-center gap-1 sm:gap-1.5 py-1 overflow-x-auto scrollbar-none flex-1">
              {activeNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (pathname.startsWith(item.href + "/") &&
                    item.href !== "/borrower" &&
                    item.href !== "/lender" &&
                    item.href !== "/admin");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                      isActive
                        ? "font-semibold shadow-sm"
                        : "hover:bg-[#EAE6DC]/70 hover:text-[#183B32]"
                    )}
                    style={
                      isActive
                        ? { backgroundColor: "#183B32", color: "#D6A85F" }
                        : { color: "#666A64" }
                    }
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Perspective indicator badge on the far right of 2nd bar */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-[#777B73] shrink-0 pl-3 border-l border-[#E5E1D7]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34765A]" />
              <span className="uppercase tracking-wider text-[10px] font-bold text-[#183B32]">
                {ROLE_LABELS[role]} Workspace
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t p-4 space-y-4 bg-white" style={{ borderColor: "#E5E1D7" }}>
          {isLoggedIn && (
            <div className="p-3 rounded-xl border flex items-center justify-between" style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                >
                  {avatarInitials}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#252C29]">{accountLabel}</div>
                  <div className="text-[10px] text-[#777B73]">
                    {isDemoMode ? `Demo · ${ROLE_LABELS[role]}` : ROLE_LABELS[role]}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick on-chain tools on mobile */}
          {(isConnected || isDemoMode) && (
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-mono bg-[#F4F1E8] border-[#E5E1D7]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34765A] animate-pulse" />
                <span className="font-medium text-[#252C29]">{networkName}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono bg-[#F4F1E8] border-[#E5E1D7]">
                <Coins className="h-3 w-3 text-[#D6A85F]" />
                <span className="font-bold text-[#252C29]">{formatTokenAmount(credBalance)}</span>
                <span className="text-[#777B73]">CRED</span>
              </div>
              {(chainId === 31337 || isDemoMode) && (
                <button
                  onClick={requestEthFaucet}
                  disabled={faucetLoading}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border text-[#34765A] bg-[#34765A]/10 border-[#34765A]/30"
                >
                  <Fuel className="h-3 w-3" />
                  <span>{faucetSuccess ? "Credited!" : faucetLoading ? "..." : "1,000 ETH"}</span>
                </button>
              )}
              <button
                onClick={handleCredFaucet}
                disabled={credFaucetLoading}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border text-[#8B6514] bg-[#D6A85F]/15 border-[#D6A85F]/40"
              >
                <Coins className="h-3 w-3 text-[#D6A85F]" />
                <span>{credFaucetSuccess ? "Minted!" : credFaucetLoading ? "Signing..." : "+1,000 CRED"}</span>
              </button>
            </div>
          )}

          {/* Mobile Nav Links */}
          {activeNav.length > 0 && (
            <div className="space-y-1">
              {activeNav.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-[#183B32] text-[#D6A85F] font-semibold"
                        : "text-[#777B73] hover:text-[#252C29] hover:bg-[#F4F1E8]"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {isLoggedIn && (
            <div className="pt-2 border-t" style={{ borderColor: "#E5E1D7" }}>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-[#B94B45] hover:bg-[#B94B45]/10 rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
