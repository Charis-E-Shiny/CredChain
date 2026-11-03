"use client";

import { useCredChain } from "@/hooks/useCredChain";
import { SlidersHorizontal, ShieldCheck, PauseCircle, PlayCircle, Activity, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function AdminDashboardPage() {
  const { isConnected, totalLoans, activeLoans } = useCredChain();
  const [paused, setPaused] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6 text-primary" />
          Administrative & Protocol Health Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Restricted control panel for emergency circuit breakers, oracle health monitoring, and system metrics.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg border bg-muted/40 font-mono text-xs">
          {statusMsg}
        </div>
      )}

      {/* Protocol Telemetry */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-card space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Circuit Breaker Status</div>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${paused ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`}></span>
            <span className="font-bold text-lg">{paused ? "PAUSED" : "OPERATIONAL"}</span>
          </div>
          <div className="text-xs text-muted-foreground">Emergency stop controls</div>
        </div>

        <div className="p-5 rounded-xl border bg-card space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Total Micro-Loans</div>
          <div className="text-2xl font-bold font-mono">{totalLoans ? totalLoans.toString() : "0"}</div>
          <div className="text-xs text-muted-foreground">{activeLoans ? activeLoans.toString() : "0"} currently active</div>
        </div>

        <div className="p-5 rounded-xl border bg-card space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Chainlink Oracle Health</div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Activity className="h-4 w-4" />
            <span>ONLINE</span>
          </div>
          <div className="text-xs text-muted-foreground">Staleness window: 3600s</div>
        </div>
      </div>

      {/* Emergency Controls */}
      <div className="p-6 rounded-xl border bg-card space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2 text-yellow-500">
          <AlertTriangle className="h-5 w-5" />
          Emergency Protocol Controls (PAUSER_ROLE)
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          OpenZeppelin Pausable implementation allows authorized operators to halt new loan requests, disbursements, and token transfers in case of anomalous market volatility or contract inspection.
        </p>

        <div className="flex gap-4 pt-2">
          <button
            onClick={() => {
              setPaused(true);
              setStatusMsg("Simulated protocol pause triggered. State: PAUSED.");
            }}
            disabled={paused}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <PauseCircle className="h-4 w-4" />
            Pause Protocol
          </button>

          <button
            onClick={() => {
              setPaused(false);
              setStatusMsg("Protocol unpaused. State: OPERATIONAL.");
            }}
            disabled={!paused}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <PlayCircle className="h-4 w-4" />
            Unpause Protocol
          </button>
        </div>
      </div>
    </div>
  );
}
