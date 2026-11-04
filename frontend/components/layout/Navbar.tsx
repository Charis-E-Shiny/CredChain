"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRole } from "@/context/RoleContext";
import { useCredChain } from "@/hooks/useCredChain";
import { shortenAddress, formatTokenAmount } from "@/lib/utils";
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
} from "lucide-react";
import { chainConfig } from "@/config/contracts";

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const { role, setRole, isAdmin, isApprover, adminError, clearAdminError } = useRole();
  const { credBalance } = useCredChain();

  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

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
  };

  const networkName = chain?.name || chainConfig.networkName;
  const chainId = chain?.id || chainConfig.chainId;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Admin Permission Warning Banner */}
      {adminError && (
        <div className="bg-destructive/15 border-b border-destructive/30 px-4 py-2 text-xs text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{adminError}</span>
          </div>
          <button onClick={clearAdminError} className="hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white font-black shadow-md shadow-sky-500/20 text-sm">
              CC
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-sky-300 bg-clip-text text-transparent">
                CredChain
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-400 border border-sky-800/60">
                FinTech DeFi
              </span>
            </div>
          </Link>

          {/* Role Switcher Segmented Control */}
          <div className="hidden lg:flex items-center bg-card/80 p-1 rounded-xl border border-border/80 shadow-inner">
            <button
              onClick={() => handleRoleSelect("borrower")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                role === "borrower"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Borrower
            </button>

            <button
              onClick={() => handleRoleSelect("lender")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                role === "lender"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Lender
            </button>

            <button
              onClick={() => handleRoleSelect("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                role === "admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              } ${!isAdmin && !isApprover ? "opacity-75" : ""}`}
              title={
                !isAdmin && !isApprover
                  ? "Requires on-chain DEFAULT_ADMIN_ROLE or APPROVER_ROLE"
                  : "Protocol Governance & Admin"
              }
            >
              {isAdmin || isApprover ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              Admin
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Centralized Network Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border bg-card/60 font-mono shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-foreground">{networkName}</span>
            <span className="text-muted-foreground">({chainId})</span>
          </div>

          {/* Connected Controls */}
          {isConnected && address ? (
            <div className="flex items-center gap-2.5">
              {/* Token Balance */}
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-card text-xs font-mono">
                <Coins className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold">{formatTokenAmount(credBalance)}</span>
                <span className="text-muted-foreground text-[11px]">CRED</span>
              </div>

              {/* Anvil ETH Faucet Button */}
              {chainId === 31337 && (
                <button
                  onClick={requestEthFaucet}
                  disabled={faucetLoading}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                  title="Credit 1,000 ETH to this address on Anvil"
                >
                  <Fuel className="h-3.5 w-3.5" />
                  {faucetSuccess ? "Credited 1,000 ETH!" : faucetLoading ? "Funding..." : "Get 1,000 ETH"}
                </button>
              )}

              {/* Truncated Address */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-card text-xs font-mono">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-semibold">{shortenAddress(address)}</span>
              </div>

              {/* Disconnect */}
              <button
                onClick={() => disconnect()}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const injected = connectors.find((c) => c.name === "MetaMask" || c.id === "injected");
                if (injected) connect({ connector: injected });
                else if (connectors[0]) connect({ connector: connectors[0] });
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
