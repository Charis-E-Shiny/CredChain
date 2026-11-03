"use client";

import { useState } from "react";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress, loanStatusLabels, loanStatusColors } from "@/lib/utils";
import { Store, Coins, CheckCircle, Clock } from "lucide-react";
import { parseEther } from "viem";

export default function MarketplacePage() {
  const { isConnected, totalLoans, activateLoan, isWritePending } = useCredChain();
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [txMessage, setTxMessage] = useState<string | null>(null);

  const handleFund = async (loanId: bigint) => {
    try {
      setTxMessage(null);
      const hash = await activateLoan(loanId);
      setTxMessage(`Loan #${loanId.toString()} activated successfully! Tx: ${hash}`);
    } catch (err: any) {
      setTxMessage(`Error: ${err?.shortMessage || err?.message || "Failed to fund loan"}`);
    }
  };

  const loanCount = totalLoans ? Number(totalLoans) : 0;
  const mockLoans = Array.from({ length: Math.max(loanCount, 3) }, (_, i) => ({
    id: BigInt(i),
    borrower: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`,
    principal: parseEther(((i + 1) * 1000).toString()),
    collateral: parseEther(((i + 1) * 200).toString()),
    interestRateBps: 500,
    status: i === 0 ? 1 : i === 1 ? 2 : 0, // 0: REQUESTED, 1: APPROVED, 2: ACTIVE
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            Micro-Lending Marketplace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse verified peer-to-peer loan requests and fund approved borrowers as a liquidity provider.
          </p>
        </div>
      </div>

      {txMessage && (
        <div className="p-3 rounded-lg border bg-muted/40 font-mono text-xs break-all">
          {txMessage}
        </div>
      )}

      <div className="p-5 rounded-xl border bg-card space-y-4">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
          Live On-Chain Loan Opportunities
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Loan ID</th>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Principal</th>
                <th className="py-3 px-4">Collateral</th>
                <th className="py-3 px-4">Yield (APR)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockLoans.map((loan) => (
                <tr key={loan.id.toString()} className="hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono font-bold">#{loan.id.toString()}</td>
                  <td className="py-3 px-4 font-mono">{shortenAddress(loan.borrower)}</td>
                  <td className="py-3 px-4 font-semibold">{formatTokenAmount(loan.principal)} CRED</td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">{formatTokenAmount(loan.collateral)} CRED</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">
                    {(loan.interestRateBps / 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${loanStatusColors[loan.status]}`}>
                      {loanStatusLabels[loan.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {loan.status === 1 ? (
                      <button
                        onClick={() => handleFund(loan.id)}
                        disabled={!isConnected || isWritePending}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                      >
                        Fund Loan
                      </button>
                    ) : loan.status === 2 ? (
                      <span className="text-muted-foreground flex items-center justify-end gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        Funded
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center justify-end gap-1">
                        <Clock className="h-3.5 w-3.5 text-yellow-500" />
                        Awaiting Approvals
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
