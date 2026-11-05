"use client";

import { Suspense, useEffect, useState } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount, useConnect } from "wagmi";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Wallet,
  ShieldCheck,
  Coins,
  ChevronDown,
  Layers,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { contracts } from "@/config/contracts";
import { ANVIL_ACCOUNTS } from "@/lib/contractExecution";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function RepaymentContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const {
    credBalance,
    allLoans,
    borrowerLoans,
    loadingLoans,
    getLoanOutstanding,
    repayLoan,
    repayLoanWithBorrowerKey,
    requestFaucet,
    fetchAllLoans,
    isWritePending,
  } = useCredChain();

  const searchParams = useSearchParams();
  const paramLoanId = searchParams?.get("loanId");

  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [outstandingWei, setOutstandingWei] = useState<bigint>(BigInt(0));
  const [amount, setAmount] = useState<string>("");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintingCred, setMintingCred] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Filter all on-chain loans that are currently in ACTIVE status (2)
  const allActiveLoans = allLoans.filter((l) => l.status === 2);

  const userAddrLower = (address || "").toLowerCase();
  const myActiveLoans = allActiveLoans.filter(
    (l) => userAddrLower && l.borrower.toLowerCase() === userAddrLower
  );

  // If the user's specific connected address has active loans, display them;
  // otherwise, display all active loans available on the protocol so they can settle loans
  const availableLoans = activeTab === "my" && myActiveLoans.length > 0 ? myActiveLoans : allActiveLoans;

  // Handle wallet connect
  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.name === "MetaMask" || c.id === "injected");
    if (injected) {
      connect({ connector: injected });
    } else if (connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

  // Trigger MetaMask account switch
  const handleSwitchToBorrower = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (err: any) {
        console.warn("Account switch request cancelled or failed:", err);
      }
    }
  };

  // Copy Demo Borrower private key for easy MetaMask import
  const handleCopyBorrowerKey = () => {
    navigator.clipboard.writeText(ANVIL_ACCOUNTS.borrower.privateKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // Mint CRED tokens via MetaMask for repayment
  const handleMintCred = async () => {
    setMintingCred(true);
    setError(null);
    try {
      await requestFaucet("1000");
      try {
        await requestFaucet("1000");
      } catch {
        // secondary mint in case throttled
      }
      setStatusMsg("Successfully minted CRED tokens! Balance refreshed.");
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Failed to mint CRED tokens in MetaMask.");
    } finally {
      setMintingCred(false);
    }
  };

  // Determine initial selected loan: prioritize URL param if valid, or first available active loan
  useEffect(() => {
    if (paramLoanId) {
      const match = allLoans.find((l) => l.id.toString() === paramLoanId);
      if (match) {
        setSelectedLoanId(paramLoanId);
        if (myActiveLoans.length === 0 && allActiveLoans.length > 0) {
          setActiveTab("all");
        }
        return;
      }
    }

    if (availableLoans.length > 0) {
      if (!selectedLoanId || !availableLoans.some((l) => l.id.toString() === selectedLoanId)) {
        setSelectedLoanId(availableLoans[0].id.toString());
      }
    } else if (!loadingLoans) {
      setSelectedLoanId("");
      setOutstandingWei(BigInt(0));
      setAmount("");
    }
  }, [availableLoans, paramLoanId, allLoans, loadingLoans]);

  // Fetch outstanding balance whenever selected loan changes
  useEffect(() => {
    if (selectedLoanId) {
      setLoadingBalance(true);
      getLoanOutstanding(BigInt(selectedLoanId))
        .then((bal) => {
          setOutstandingWei(bal);
          // Set raw decimal string without commas for input type="number"
          setAmount(formatEther(bal));
        })
        .finally(() => setLoadingBalance(false));
    }
  }, [selectedLoanId, getLoanOutstanding]);

  // Find the currently selected loan record
  const selectedLoan =
    allActiveLoans.find((l) => l.id.toString() === selectedLoanId) ||
    allLoans.find((l) => l.id.toString() === selectedLoanId);

  // Check whether the connected wallet is the loan originator
  const isBorrowerMatch =
    userAddrLower &&
    selectedLoan &&
    userAddrLower === selectedLoan.borrower.toLowerCase();

  // Check if borrower is the Anvil Demo Borrower account
  const isAnvilDemoBorrower =
    selectedLoan &&
    selectedLoan.borrower.toLowerCase() === ANVIL_ACCOUNTS.borrower.address.toLowerCase();

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLoanId || !selectedLoan) {
      setError("Please select an active loan to repay.");
      return;
    }

    // Clean any accidental commas from amount input
    const cleanAmount = (amount || "").toString().replace(/,/g, "").trim();
    if (!cleanAmount || parseFloat(cleanAmount) <= 0) {
      setError("Please enter a valid repayment amount.");
      return;
    }

    setError(null);
    setStatusMsg(null);

    try {
      const rawWei = parseEther(cleanAmount);
      const lId = BigInt(selectedLoanId);

      // Clamp so it never exceeds outstanding balance (prevents smart contract revert)
      const repayWei =
        outstandingWei > BigInt(0) && rawWei > outstandingWei ? outstandingWei : rawWei;

      let hash: `0x${string}`;

      if (isBorrowerMatch) {
        setStatusMsg("Confirming repayment transaction in MetaMask...");
        hash = await repayLoan(lId, repayWei);
      } else {
        // Settle using test borrower account key directly
        setStatusMsg("Submitting repayment transaction via Demo Borrower account...");
        hash = await repayLoanWithBorrowerKey(lId, repayWei);
      }

      setStatusMsg(
        `Repayment confirmed on-chain! Loan #${selectedLoanId} updated. Transaction: ${hash}`
      );
      await fetchAllLoans();
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Repayment transaction failed.");
      setStatusMsg(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Receipt className="h-3.5 w-3.5" />
          Debt Settlement Portal
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Loan Repayment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Settle your active micro-loans in CRED tokens to unlock collateral and boost your on-chain reputation score.
        </p>
      </div>

      {/* Main Container */}
      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-5">
        {!isConnected ? (
          <div className="p-10 text-center rounded-xl border border-dashed bg-card/40 space-y-4">
            <Wallet className="h-10 w-10 mx-auto text-primary animate-pulse" />
            <div className="space-y-1">
              <div className="text-base font-bold">Connect MetaMask to Settle Loans</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Connect your Web3 wallet to inspect your outstanding loans, approve escrow allowances, and confirm on-chain repayments.
              </p>
            </div>
            <button
              onClick={handleConnectWallet}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity"
            >
              <Wallet className="h-4 w-4" />
              Connect MetaMask Wallet
            </button>
          </div>
        ) : loadingLoans && allLoans.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RotateCcw className="h-4 w-4 animate-spin text-primary" />
            Loading on-chain loans from blockchain...
          </div>
        ) : allActiveLoans.length === 0 ? (
          <div className="p-10 text-center rounded-xl border border-dashed bg-card/40 space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
            <div className="text-base font-bold">No Active Loans Requiring Repayment</div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              There are currently zero active loans on-chain. All past loans have been repaid in full or are pending governance approval.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/apply-loan"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-block hover:opacity-90"
              >
                Apply for a New Loan
              </Link>
              <Link
                href="/borrower/loans"
                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-muted/40 transition-colors"
              >
                View Loan Portfolio
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRepay} className="space-y-5">
            {/* Scope Toggle: My Loans vs All Protocol Loans */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("my")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "my"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  My Active Loans ({myActiveLoans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All Protocol Active Loans ({allActiveLoans.length})
                </button>
              </div>

              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                Connected: {shortenAddress(address || "")}
              </span>
            </div>

            {/* Loan Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase tracking-wider text-muted-foreground">
                  Select Active Loan to Settle
                </label>
                <span className="text-muted-foreground text-[11px]">
                  {availableLoans.length} active loan{availableLoans.length > 1 ? "s" : ""} available
                </span>
              </div>

              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {availableLoans.map((l) => {
                  const isMine = userAddrLower && l.borrower.toLowerCase() === userAddrLower;
                  return (
                    <option key={l.id.toString()} value={l.id.toString()}>
                      Loan #{l.id.toString()} — {isMine ? "👤 Mine" : `Borrower: ${shortenAddress(l.borrower)}`} | Principal: {formatTokenAmount(l.principal)} CRED | APR:{" "}
                      {(l.interestRateBps / 100).toFixed(1)}% | Deadline:{" "}
                      {new Date(Number(l.repaymentDeadline) * 1000).toLocaleDateString()}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Borrower Account Match / Info Banner */}
            {selectedLoan && (
              <>
                {isBorrowerMatch ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      Connected as original borrower (<b>{shortenAddress(address || "")}</b>). You will confirm and sign this repayment in MetaMask.
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-900 text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-sky-950">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600" />
                        <span>Demo Mode Settlement Ready</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-200/80 text-sky-800">
                        {isAnvilDemoBorrower ? "Anvil Demo Account" : "External Borrower"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-sky-900/80">
                      Loan #{selectedLoanId} was originated by borrower <code className="font-mono font-bold bg-white/70 px-1 py-0.5 rounded">{shortenAddress(selectedLoan.borrower)}</code>.
                      You are connected as <code className="font-mono font-bold bg-white/70 px-1 py-0.5 rounded">{shortenAddress(address || "")}</code>.
                      Clicking submit will settle this debt on-chain using the borrower's cryptographic credentials.
                    </p>
                    {isAnvilDemoBorrower && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-200/60">
                        <button
                          type="button"
                          onClick={handleCopyBorrowerKey}
                          className="px-2.5 py-1 rounded-lg bg-white/90 border border-sky-300 text-sky-900 font-semibold text-[11px] hover:bg-white transition-colors flex items-center gap-1 shadow-xs"
                        >
                          {copiedKey ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedKey ? "Copied Private Key!" : "Copy Borrower Private Key"}
                        </button>
                        <button
                          type="button"
                          onClick={handleSwitchToBorrower}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-semibold text-[11px] hover:bg-sky-700 transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Wallet className="h-3 w-3" />
                          Switch MetaMask Account
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Selected Loan Info Details */}
            {selectedLoan && (
              <div className="p-4 rounded-xl border bg-muted/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Principal Borrowed</div>
                  <div className="font-mono font-bold">{formatTokenAmount(selectedLoan.principal)} CRED</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Locked Collateral</div>
                  <div className="font-mono font-bold text-sky-400">
                    {formatTokenAmount(selectedLoan.collateralAmount)} CRED
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Repayment Deadline</div>
                  <div className="font-mono font-bold">
                    {new Date(Number(selectedLoan.repaymentDeadline) * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Already Repaid</div>
                  <div className="font-mono font-bold text-emerald-500">
                    {formatTokenAmount(selectedLoan.repaid)} CRED
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-4 border-t pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="text-muted-foreground">Total Repayment Balance Outstanding (Principal + 5% Interest):</div>
                  <div className="font-mono font-extrabold text-base text-amber-500">
                    {loadingBalance ? "Calculating on-chain..." : `${formatTokenAmount(outstandingWei)} CRED`}
                  </div>
                </div>
              </div>
            )}

            {/* Repayment Amount Input & Balance Section */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <label className="font-bold uppercase tracking-wider text-muted-foreground">
                  Repayment Amount (CRED)
                </label>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Available Balance:</span>
                  <span className="font-mono text-foreground font-bold">{formatTokenAmount(credBalance)} CRED</span>
                  <button
                    type="button"
                    onClick={handleMintCred}
                    disabled={mintingCred}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
                    title="Mint CRED from faucet for testing"
                  >
                    <Coins className="h-3 w-3" />
                    {mintingCred ? "Minting..." : "+ Mint CRED"}
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter repayment amount"
                  className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(formatEther(outstandingWei))}
                  className="absolute right-2.5 top-2 px-2.5 py-0.5 rounded text-[11px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                >
                  Pay in Full
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Partial repayments reduce outstanding principal and interest. Full repayment unlocks collateral back to the borrower and increases on-chain reputation score.
              </p>
            </div>

            {/* Status & Error Messages */}
            {statusMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs flex items-center gap-2.5 font-mono">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{statusMsg}</span>
              </div>
            )}
            {error && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isWritePending || !selectedLoanId}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {isWritePending ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Confirming Repayment on Blockchain...
                </>
              ) : isBorrowerMatch ? (
                <>
                  <Receipt className="h-4 w-4" />
                  Confirm On-Chain Repayment via MetaMask
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4" />
                  Settle Debt via Demo Borrower ({shortenAddress(selectedLoan?.borrower || "")})
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RepaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <RotateCcw className="h-4 w-4 animate-spin text-primary" />
          Loading repayment portal...
        </div>
      }
    >
      <RepaymentContent />
    </Suspense>
  );
}
