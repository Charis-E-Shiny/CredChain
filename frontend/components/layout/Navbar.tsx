"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRole, UserRole } from "@/context/RoleContext";
import { useCredChain } from "@/hooks/useCredChain";
import { shortenAddress, formatTokenAmount, cn } from "@/lib/utils";
import {
  Wallet, ShieldCheck, Fuel, AlertCircle, X, Menu,
  ChevronDown, LayoutDashboard, BrainCircuit, FilePlus2,
  Store, Receipt, Award, Vote, Compass, SlidersHorizontal,
  Layers, TrendingUp, FileCheck2, Users, LogOut, User, Coins,
  Briefcase, UserCheck, Shield
} from "lucide-react";
import { chainConfig } from "@/config/contracts";

const borrowerNav = [
  { name: "Overview",        href: "/borrower",          icon: LayoutDashboard },
  { name: "AI Assessment",   href: "/credit-assessment",  icon: BrainCircuit },
  { name: "Apply for Loan",  href: "/apply-loan",        icon: FilePlus2 },
  { name: "My Loans",        href: "/borrower/loans",    icon: Layers },
  { name: "Repayments",      href: "/repayment",         icon: Receipt },
  { name: "Reputation",      href: "/reputation",        icon: Award },
  { name: "Credit Passport", href: "/credit-passport",   icon: ShieldCheck },
];

const lenderNav = [
  { name: "Overview",        href: "/lender",               icon: LayoutDashboard },
  { name: "Marketplace",     href: "/marketplace",          icon: Store },
  { name: "My Investments",  href: "/lender/investments",   icon: Coins },
  { name: "Returns",         href: "/lender/returns",       icon: Receipt },
  { name: "History",         href: "/explorer",             icon: Compass },
];

const adminNav = [
  { name: "Overview",    href: "/admin",           icon: LayoutDashboard },
  { name: "Approvals",   href: "/admin/approvals", icon: FileCheck2 },
  { name: "Governance",  href: "/governance",      icon: Vote },
  { name: "Oracle",      href: "/admin/oracle",    icon: TrendingUp },
  { name: "Roles",       href: "/admin/roles",     icon: Users },
  { name: "Controls",    href: "/admin/controls",  icon: SlidersHorizontal },
  { name: "Explorer",    href: "/explorer",        icon: Compass },
];

const guestNav = [
  { name: "Marketplace",     href: "/marketplace",         icon: Store },
  { name: "AI Assessment",   href: "/credit-assessment",   icon: BrainCircuit },
  { name: "Credit Passport", href: "/credit-passport",     icon: ShieldCheck },
  { name: "Explorer",        href: "/explorer",            icon: Compass },
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
    role, setRole, adminError, clearAdminError,
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

  const handleSwitchRole = (targetRole: UserRole) => {
    setRole(targetRole);
    setUserMenuOpen(false);
    if (targetRole === "borrower") router.push("/borrower");
    else if (targetRole === "lender") router.push("/lender");
    else if (targetRole === "admin") router.push("/admin");
  };

  const networkName = chain?.name || chainConfig.networkName;
  const chainId = chain?.id || chainConfig.chainId;

  const activeNav = isLoggedIn
    ? (role === "lender" ? lenderNav : role === "admin" ? adminNav : borrowerNav)
    : guestNav;

  const homeHref = isLoggedIn
    ? (role === "lender" ? "/lender" : role === "admin" ? "/admin" : "/borrower")
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
      className="sticky top-0 z-40 w-full border-b shadow-sm"
      style={{
        borderColor: "#E5E1D7",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(10px)",
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
        {/* Left: Brand */}
        <div className="flex items-center gap-6 shrink-0">
          <Link href={homeHref} className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm"
              style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
            >
              CC
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: "#183B32" }}>
              CredChain
            </span>
          </Link>
        </div>

        {/* Center: TOP BAR NAVIGATION ELEMENTS (Migrated from Sidebar) */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none flex-1 justify-center max-w-4xl">
          {activeNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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

        {/* Right: Account / Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Network badge (when wallet connected) */}
          {isConnected && (
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-mono"
              style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#34765A" }} />
              <span className="font-medium text-[#252C29]">{networkName}</span>
            </div>
          )}

          {/* CRED Token Balance (when connected to wallet) */}
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-sm"
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

              {/* User Dropdown */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border bg-white shadow-xl overflow-hidden z-50 p-1"
                  style={{ borderColor: "#E5E1D7" }}
                >
                  <div className="p-3 border-b" style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8" }}>
                    <div className="text-xs font-bold" style={{ color: "#252C29" }}>{accountLabel}</div>
                    <div className="text-[11px] font-mono mt-0.5 text-[#777B73] truncate">
                      {isDemoMode ? `Demo Mode (${ROLE_LABELS[role]} Access)` : address}
                    </div>
                  </div>

                  {/* Role Switcher in dropdown */}
                  <div className="p-2 border-b" style={{ borderColor: "#E5E1D7" }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 text-[#777B73]">
                      Switch Role
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {(["borrower", "lender", "admin"] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => handleSwitchRole(r)}
                          className={cn(
                            "py-1.5 px-2 text-xs font-semibold rounded-lg capitalize transition-colors text-center",
                            role === r
                              ? "bg-[#183B32] text-[#D6A85F]"
                              : "text-[#777B73] hover:bg-[#F4F1E8] hover:text-[#252C29]"
                          )}
                        >
                          {r}
                        </button>
                      ))}
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
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all"
                style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>Get Started</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-[#F4F1E8] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "#252C29" }}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

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

              {/* Role pill in mobile */}
              <div className="flex gap-1">
                {(["borrower", "lender", "admin"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSwitchRole(r)}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded-md capitalize",
                      role === r
                        ? "bg-[#183B32] text-[#D6A85F]"
                        : "text-[#777B73] bg-white border border-[#E5E1D7]"
                    )}
                  >
                    {r[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Nav Links */}
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

          {!isLoggedIn ? (
            <div className="pt-2 border-t space-y-2" style={{ borderColor: "#E5E1D7" }}>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-2.5 text-sm font-semibold rounded-xl border border-[#E5E1D7] text-[#252C29]"
              >
                Sign In
              </Link>
              <Link
                href="/login?tab=signup"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-2.5 text-sm font-bold rounded-xl shadow-sm"
                style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
              >
                Get Started
              </Link>
            </div>
          ) : (
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
