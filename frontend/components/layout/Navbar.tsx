"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/utils";
import { Wallet, ShieldCheck, ExternalLink, ArrowRightLeft, Fuel } from "lucide-react";
import { contracts, chainConfig } from "@/config/contracts";

export function Navbar() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
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

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/25">
              CC
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-navy-900 to-primary bg-clip-text text-transparent dark:from-white dark:to-cyan-400">
                CredChain
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-navy-100 text-navy-800 dark:bg-navy-900 dark:text-cyan-300">
                Sepolia DeFi
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Testnet Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border bg-muted/50 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{chain?.name || chainConfig.networkName}</span>
          </div>

          {/* Connect Wallet Button */}
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <button
                onClick={requestEthFaucet}
                disabled={faucetLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                title="Credit 1,000 ETH to this address on local Anvil network"
              >
                <Fuel className="h-3.5 w-3.5" />
                {faucetSuccess ? "Credited 1,000 ETH!" : faucetLoading ? "Funding..." : "Get 1,000 ETH"}
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-mono">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>{shortenAddress(address)}</span>
              </div>
              <button
                onClick={() => disconnect()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-shadow shadow-md shadow-primary/25"
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
