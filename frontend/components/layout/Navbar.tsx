"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRole } from "@/context/RoleContext";
import { useCredChain } from "@/hooks/useCredChain";
import { shortenAddress, formatTokenAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Wallet,
  ShieldCheck,
  Fuel,
  Lock,
  UserCheck,
  Briefcase,
  ShieldAlert,
  Coins,
  AlertCircle,
  X,
  Menu,
  ChevronDown,
  LayoutDashboard,
  BrainCircuit,
  FilePlus2,
  Store,
  Receipt,
  Award,
  Vote,
  Compass,
  SlidersHorizontal,
  Layers,
  TrendingUp,
  FileCheck2,
  Users,
  LogOut,
  User,
} from "lucide-react";
import { chainConfig } from "@/config/contracts";

const borrowerNav = [
  { name: "Overview", href: "/borrower", icon: LayoutDashboard },
  { name: "AI Assessment", href: "/credit-assessment", icon: BrainCircuit },
  { name: "Apply for Loan", href: "/apply-loan", icon: FilePlus2 },
  { name: "My Loans", href: "/borrower/loans", icon: Layers },
  { name: "Repayments", href: "/repayment", icon: Receipt },
  { name: "Reputation", href: "/reputation", icon: Award },
  { name: "Credit Passport", href: "/credit-passport", icon: ShieldCheck },
];

const lenderNav = [
  { name: "Overview", href: "/lender", icon: LayoutDashboard },
  { name: "Marketplace", href: "/marketplace", icon: Store },
  { name: "My Investments", href: "/lender/investments", icon: Coins },
  { name: "Returns", href: "/lender/returns", icon: Receipt },
  { name: "History", href: "/explorer", icon: Compass },
];

const adminNav = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Approvals", href: "/admin/approvals", icon: FileCheck2 },
  { name: "Governance", href: "/governance", icon: Vote },
  { name: "Oracle", href: "/admin/oracle", icon: TrendingUp },
  { name: "Roles", href: "/admin/roles", icon: Users },
  { name: "Controls", href: "/admin/controls", icon: SlidersHorizontal },
  { name: "Explorer", href: "/explorer", icon: Compass },
];

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const pathname = usePathname();

  const { role, setRole, isAdmin, isApprover, adminError, clearAdminError } = useRole();
  const { credBalance } = useCredChain();

  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleRoleSelect = (targetRole: "borrower" | "lender" | "admin") => {
    setRole(targetRole);
    if (targetRole === "borrower") router.push("/borrower");
    else if (targetRole === "lender") router.push("/lender");
    else if (targetRole === "admin" && (isAdmin || isApprover)) router.push("/admin");
    setMobileMenuOpen(false);
  };

  const networkName = chain?.name || chainConfig.networkName;
  const chainId = chain?.id || chainConfig.chainId;
  const activeNav = role === "lender" ? lenderNav : role === "admin" ? adminNav : borrowerNav;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Admin Permission Warning Banner */}
      {adminError && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-xs text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{adminError}</span>
          </div>
          <button onClick={clearAdminError} className="hover:opacity-80 ml-4">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Row: Brand + Right Controls */}
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/30">
              CC
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              CredChain
            </span>
          </Link>

          {/* Role Switcher Pills */}
          <div className="hidden md:flex items-center bg-muted/60 p-0.5 rounded-lg border gap-0.5">
            {[
              { key: "borrower" as const, label: "Borrower", icon: UserCheck },
              { key: "lender" as const, label: "Lender", icon: Briefcase },
              { key: "admin" as const, label: "Admin", icon: isAdmin || isApprover ? ShieldCheck : Lock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleRoleSelect(key)}
                title={key === "admin" && !isAdmin && !isApprover ? "Requires on-chain admin role" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                  role === key
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  key === "admin" && !isAdmin && !isApprover && "opacity-60"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Network Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border bg-muted/40 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-foreground">{networkName}</span>
          </div>

          {isConnected && address ? (
            <div className="flex items-center gap-2">
              {/* CRED Balance */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-muted/40 text-xs font-mono">
                <Coins className="h-3 w-3 text-primary" />
                <span className="font-bold">{formatTokenAmount(credBalance)}</span>
                <span className="text-muted-foreground">CRED</span>
              </div>

              {/* Faucet */}
              {chainId === 31337 && (
                <button
                  onClick={requestEthFaucet}
                  disabled={faucetLoading}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                  title="Credit 1,000 ETH to this address on Anvil"
                >
                  <Fuel className="h-3 w-3" />
                  {faucetSuccess ? "Credited!" : faucetLoading ? "..." : "1,000 ETH"}
                </button>
              )}

              {/* User Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border bg-background hover:bg-muted/40 transition-colors"
                >
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-semibold hidden sm:inline">{shortenAddress(address)}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border bg-background shadow-lg shadow-black/10 overflow-hidden z-50">
                    <div className="p-3 border-b bg-muted/30">
                      <p className="text-xs text-muted-foreground">Connected as</p>
                      <p className="text-xs font-mono font-semibold text-foreground truncate">{address}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/credit-passport"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-muted/60 text-foreground transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        My Credit Passport
                      </Link>
                      <Link
                        href="/reputation"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-muted/60 text-foreground transition-colors"
                      >
                        <Award className="h-3.5 w-3.5 text-primary" />
                        My Reputation
                      </Link>
                    </div>
                    <div className="p-1 border-t">
                      <button
                        onClick={() => { disconnect(); setUserMenuOpen(false); router.push("/login"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
              >
                Sign In
              </Link>
              <Link
                href="/login?tab=signup"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/25"
              >
                <Wallet className="h-3.5 w-3.5" />
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/60 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Nav Links Row — role-specific */}
      {isConnected && (
        <div className="hidden md:flex items-center px-6 h-10 border-t border-border/50 gap-1 overflow-x-auto">
          {activeNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background/98 p-4 space-y-4">
          {/* Role Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-lg">
            {[
              { key: "borrower" as const, label: "Borrower" },
              { key: "lender" as const, label: "Lender" },
              { key: "admin" as const, label: "Admin" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleRoleSelect(key)}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-md transition-all",
                  role === key
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Nav links */}
          <div className="space-y-1">
            {activeNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Mobile auth */}
          {!isConnected && (
            <div className="pt-2 border-t space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/login?tab=signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-bold rounded-lg bg-primary text-primary-foreground"
              >
                Get Started
              </Link>
            </div>
          )}

          {isConnected && address && (
            <div className="pt-2 border-t">
              <button
                onClick={() => { disconnect(); router.push("/login"); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
