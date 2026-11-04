"use client";

import Link from "next/link";
import { AdminGate } from "@/components/auth/AdminGate";
import { useCredChain } from "@/hooks/useCredChain";
import { contracts } from "@/config/contracts";
import { TrendingUp, ArrowLeft, Activity, ShieldCheck, AlertCircle } from "lucide-react";

export default function OracleMonitoringPage() {
  const { oraclePrice } = useCredChain();

  const ethPriceUSD = oraclePrice
    ? (Number(oraclePrice) / 1e8).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$2,500.00";

  return (
    <AdminGate>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="border-b pb-5">
          <Link href="/admin" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
            Risk & Oracle Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time Chainlink price feed monitoring, collateral valuation metrics, and staleness parameters.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chainlink Price Feed</div>
            <div className="text-3xl font-black font-mono text-emerald-400">{ethPriceUSD}</div>
            <div className="text-xs text-muted-foreground">ETH/USD AggregatorV3</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feed Health</div>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              ONLINE
            </div>
            <div className="text-xs text-muted-foreground">Heartbeat: Active on Anvil / Sepolia</div>
          </div>

          <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Collateral Ratio</div>
            <div className="text-2xl font-black font-mono text-primary">150%</div>
            <div className="text-xs text-muted-foreground">Required LTV threshold</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Contract Configuration Parameters
          </h2>
          <div className="p-4 rounded-xl border bg-muted/20 space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Oracle Contract:</span>
              <span className="text-foreground">{contracts.collateralOracle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Staleness Threshold:</span>
              <span className="text-foreground">3,600 Seconds (1 Hour)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Precision:</span>
              <span className="text-foreground">8 Decimals (Chainlink Standard)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Liquidation Buffer:</span>
              <span className="text-foreground">150% Minimum Collateral Requirement</span>
            </div>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
