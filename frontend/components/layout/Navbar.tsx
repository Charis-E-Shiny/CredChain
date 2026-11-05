"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
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

// Borrower nav — AI Assessment and Verification merged into unified underwriting hub
const borrowerNav = [
  { name: "Overview",       href: "/borrower",          icon: LayoutDashboard },
  { name: "AI Assessment & Verification", href: "/credit-assessment", icon: BrainCircuit },
  { name: "Apply for Loan", href: "/apply-loan",        icon: FilePlus2 },
  { name: "My Loans",       href: "/borrower/loans",    icon: Layers },
  { name: "Repayments",     href: "/repayment",         icon: Receipt },
];

const lenderNav = [
  { name: "Overview",       href: "/lender",             icon: LayoutDashboard },
  { name: "Marketplace",    href: "/marketplace",        icon: Store },
  { name: "My Investments", href: "/lender/investments", icon: Coins },
  { name: "Returns",        href: "/lender/returns",     icon: Receipt },
  { name: "History",        href: "/explorer",           icon: Compass },
];

const adminNav = [
  { name: "Overview",       href: "/admin",              icon: LayoutDashboard },
  { name: "Approvals",      href: "/admin/approvals",    icon: FileCheck2 },
  { name: "Verification",   href: "/admin/verification", icon: ShieldCheck },
  { name: "Governance",     href: "/governance",         icon: Vote },
  { name: "Oracle",         href: "/admin/oracle",       icon: TrendingUp },
  { name: "Roles",          href: "/admin/roles",        icon: Users },
  { name: "Controls",       href: "/admin/controls",     icon: SlidersHorizontal },
  { name: "Explorer",       href: "/explorer",           icon: Compass },
];

const ROLE_LABELS: Record<UserRole, string> = {
  borrower: "Borrower",
  lender: "Lender",
  admin: "Admin",
};

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const pathname = usePathname();

  const {
    role, adminError, clearAdminError,
    isDemoMode, demoUser, demoLogout, isLoggedIn,
  } = useRole();
  const { credBalance } = useCredChain();

  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    if (!address) return;
    setFaucetLoading(true);
    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/borrowers/faucet/eth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address, amount_eth: 1000 }),
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

  // On landing page ("/") and login/signup page ("/login"), NO navigation links are displayed in the top bar
  const isLandingOrAuthPage = pathname === "/" || pathname === "/login";

  // Determine active navigation links based on role (only shown when logged in and NOT on landing/login page)
  const activeNav = isLandingOrAuthPage
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

  return (
    <header
      className="sticky top-0 z-40 w-full border-b shadow-sm transition-all"
      style={{
        borderColor: "#E5E1D7",
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

      {/* Main Top Bar */}
      <div className="flex h-16 items-center justify-between px-4 lg:px-8 max-w-screen-2xl mx-auto gap-4">
        {/* Left: Brand Logo */}
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

        {/* Center: Top Bar Navigation Elements (only when logged in & not on landing/login) */}
        {!isLandingOrAuthPage && activeNav.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none flex-1 justify-center max-w-3xl">
            {activeNav.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/borrower" && item.href !== "/lender" && item.href !== "/admin");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "font-semibold shadow-sm"
                      : "hover:bg-[#F4F1E8]"
                  )}
                  style={
                    isActive
                      ? { backgroundColor: "#183B32", color: "#D6A85F" }
                      : { color: "#777B73" }
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: Account / Actions */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {/* Network badge (when real wallet connected) */}
          {isConnected && (
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-mono"
              style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#34765A" }} />
              <span className="font-medium text-[#252C29]">{networkName}</span>
            </div>
          )}

          {/* CRED Token Balance (when real wallet connected) */}
          {isConnected && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono"
              style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
            >
              <Coins className="h-3 w-3" style={{ color: "#D6A85F" }} />
              <span className="font-bold text-[#252C29]">{formatTokenAmount(credBalance)}</span>
              <span className="text-[#777B73]">CRED</span>
            </div>
          )}

          {/* Anvil ETH Faucet Button */}
          {isConnected && chainId === 31337 && (
            <button
              onClick={requestEthFaucet}
              disabled={faucetLoading}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors"
              style={{
                borderColor: "rgba(52,118,90,0.3)",
                backgroundColor: "rgba(52,118,90,0.08)",
                color: "#34765A",
              }}
              title="Request 1,000 ETH test funds on Anvil"
            >
              <Fuel className="h-3 w-3" />
              {faucetSuccess ? "Credited!" : faucetLoading ? "..." : "1,000 ETH"}
            </button>
          )}

          {/* Logged in state -> User Menu */}
          {isLoggedIn ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-sm hover:border-[#183B32]/30"
                style={{
                  borderColor: "#E5E1D7",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
                >
                  {avatarInitials}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight" style={{ color: "#252C29" }}>
                    {accountLabel}
                  </div>
                  <div className="text-[10px] leading-tight" style={{ color: "#777B73" }}>
                    {isDemoMode ? `Demo · ${ROLE_LABELS[role]}` : ROLE_LABELS[role]}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#777B73]" />
              </button>

              {/* User Dropdown — Switch Role has been completely removed */}
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

                  {/* Menu links */}
                  <div className="p-1">
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
            <div className="flex items-center gap-2">
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

          {/* Mobile hamburger (only shown when there are links or user is logged in) */}
          {(isLoggedIn || (!isLandingOrAuthPage && activeNav.length > 0)) && (
            <button
              className="md:hidden p-2 rounded-xl hover:bg-[#F4F1E8] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ color: "#252C29" }}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer (Switch role removed) */}
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
