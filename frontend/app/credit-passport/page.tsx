"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCredChain } from "@/hooks/useCredChain";
import { chainConfig, contracts } from "@/config/contracts";
import { formatTokenAmount } from "@/lib/utils";
import {
  ShieldCheck,
  Award,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  BrainCircuit,
  Lock,
  FileText,
  Clock,
  RotateCcw,
  Ban,
  QrCode,
  Info,
} from "lucide-react";

interface PassportRecord {
  passport_id: string;
  wallet_address: string;
  reputation_score: number;
  total_loans: number;
  repaid_loans: number;
  defaulted_loans: number;
  total_borrowed: number;
  total_repaid: number;
  on_time_repayment_rate: number;
  risk_category: string;
  confidence: number;
  data_hash: string;
  issued_at: string;
  expires_at: string;
  revoked: boolean;
  revoked_at?: string | null;
  tx_hash?: string | null;
  download_url: string;
  verify_url: string;
  status: "VALID" | "REVOKED" | "EXPIRED" | "INVALID";
}

export default function CreditPassportPage() {
  const { address, isConnected, reputationScore, reputationRecord } = useCredChain();

  const [passports, setPassports] = useState<PassportRecord[]>([]);
  const [loadingPassports, setLoadingPassports] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [validityDays, setValidityDays] = useState(90);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Parse on-chain reputation record
  const rec = reputationRecord as any;
  const onChainTotalLoans = rec ? Number(rec.totalLoans ?? rec[0] ?? 0) : 0;
  const onChainRepaidLoans = rec ? Number(rec.repaidLoans ?? rec[1] ?? 0) : 0;
  const onChainDefaultedLoans = rec ? Number(rec.defaultedLoans ?? rec[2] ?? 0) : 0;
  const onChainTotalBorrowed = rec ? formatTokenAmount(rec.totalBorrowed ?? rec[3] ?? BigInt(0)) : "0.00";
  const onChainTotalRepaid = rec ? formatTokenAmount(rec.totalRepaid ?? rec[4] ?? BigInt(0)) : "0.00";
  const onChainRate =
    onChainTotalLoans > 0
      ? ((onChainRepaidLoans / onChainTotalLoans) * 100).toFixed(1)
      : "100.0";

  // Fetch borrower's passports from API
  const fetchPassports = async () => {
    if (!address) return;
    setLoadingPassports(true);
    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/passport/borrower/${address}`);
      if (res.ok) {
        const data = await res.json();
        setPassports(data);
      }
    } catch (err) {
      console.error("Failed to load passports:", err);
    } finally {
      setLoadingPassports(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchPassports();
    }
  }, [address]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleGeneratePassport = async () => {
    if (!address || !consentGiven) return;
    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/passport/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          consent: true,
          validity_days: validityDays,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to generate passport");
      }

      const newPassport = await res.json();
      setSuccessMsg(`Credit Passport ${newPassport.passport_id.slice(0, 10)}... generated and anchored on-chain!`);
      await fetchPassports();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokePassport = async (passportId: string) => {
    if (!address) return;
    const confirmRevoke = window.confirm(
      "Are you sure you want to revoke this Credit Passport? Once revoked on-chain, external lenders will see this passport as REVOKED."
    );
    if (!confirmRevoke) return;

    setRevokingId(passportId);
    setErrorMsg(null);
    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/passport/${passportId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          reason: "Revoked by borrower request",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to revoke passport");
      }

      setSuccessMsg(`Passport ${passportId.slice(0, 10)}... has been revoked.`);
      await fetchPassports();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to revoke passport");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <ShieldCheck className="h-4 w-4" />
            Verifiable Digital Credential
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Borrower Credit Passport</h1>
          <p className="text-sm text-muted-foreground mt-1">
            An independently verifiable decentralized reputation credential combining on-chain loan settlement history
            and consented AI credit risk assessments.
          </p>
        </div>

        {isConnected && address && (
          <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border text-xs">
            <div className="space-y-0.5">
              <div className="text-muted-foreground">Borrower Wallet</div>
              <div className="font-mono font-medium flex items-center gap-1.5">
                {address.slice(0, 6)}...{address.slice(-4)}
                <button
                  onClick={() => handleCopy(address, "header-wallet")}
                  className="hover:text-primary transition-colors"
                >
                  {copiedText === "header-wallet" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-sm flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Live Borrower Overview & On-Chain Reputation */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Card 1: Score */}
        <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Reputation Score</div>
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black font-mono text-primary">{reputationScore ?? 50}</span>
            <span className="text-sm text-muted-foreground font-semibold">/ 100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${reputationScore ?? 50}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            On-chain score verified via <span className="font-mono text-foreground font-medium">BorrowerReputation.sol</span>. Baseline is 50 for new borrowers.
          </p>
        </div>

        {/* Card 2: Loan Stats */}
        <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Settlement Performance</div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Total Loans</div>
              <div className="text-lg font-bold font-mono">{onChainTotalLoans}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">On-Time Rate</div>
              <div className="text-lg font-bold font-mono text-emerald-500">{onChainRate}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Repaid in Full</div>
              <div className="text-lg font-bold font-mono text-emerald-500">{onChainRepaidLoans}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Defaulted</div>
              <div className="text-lg font-bold font-mono text-destructive">{onChainDefaultedLoans}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
            <span>Borrowed: {onChainTotalBorrowed} CRED</span>
            <span>Repaid: {onChainTotalRepaid} CRED</span>
          </div>
        </div>

        {/* Card 3: AI Model Risk Category */}
        <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">AI Risk Assessment</div>
            <BrainCircuit className="h-5 w-5 text-sky-400" />
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-lg">
              LOW RISK
            </div>
            <span className="text-xs text-muted-foreground">Gradient Boosting Model</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Consented off-chain ML risk classification. Not an official credit bureau score; represents statistical default probability.
          </p>
          <div className="text-xs text-muted-foreground border-t pt-2 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Preserves financial data privacy</span>
          </div>
        </div>
      </div>

      {/* Generate New Passport Action */}
      <div className="p-6 rounded-2xl border bg-card/40 backdrop-blur shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Generate Verifiable Credit Passport
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Creates a deterministically serialized, SHA-256 hashed financial passport and anchors the proof into the
              <span className="font-mono text-primary"> CreditPassportRegistry</span> smart contract.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-muted-foreground font-medium">Validity:</label>
            <select
              value={validityDays}
              onChange={(e) => setValidityDays(Number(e.target.value))}
              className="bg-muted px-2.5 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days (Recommended)</option>
              <option value={180}>180 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
        </div>

        {/* Borrower Consent Checkbox */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 rounded border-muted-foreground/40 text-primary focus:ring-primary h-4 w-4"
            />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground">
                Explicit Borrower Authorization & Consent
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I hereby authorize CredChain to generate a public, cryptographically verifiable financial reputation snapshot
                based on my wallet's smart contract transaction records and consented credit assessment. I understand that
                anyone with my Passport ID or QR code can independently verify my score without connecting a wallet.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            <span>Anchored on Ethereum Sepolia / Anvil with deterministic SHA-256 verification</span>
          </div>

          <button
            onClick={handleGeneratePassport}
            disabled={!isConnected || !consentGiven || generating}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {generating ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                Anchoring On-Chain...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Generate & Anchor Passport
              </>
            )}
          </button>
        </div>
      </div>

      {/* Borrower's Passport Records List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Active & Historical Passports</h2>
            <p className="text-xs text-muted-foreground">
              Passports issued to your wallet with on-chain cryptographic proofs.
            </p>
          </div>
          <button
            onClick={fetchPassports}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loadingPassports ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading passports...</div>
        ) : passports.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed bg-card/30 space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <div className="text-sm font-semibold">No Credit Passports Generated Yet</div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Authorize and generate your first verifiable Credit Passport above to share proof of your loan repayment reputation with external lenders.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {passports.map((p) => {
              const isRevoked = p.status === "REVOKED" || p.revoked;
              const isExpired = p.status === "EXPIRED";
              const isValid = p.status === "VALID" && !isRevoked && !isExpired;

              return (
                <div
                  key={p.passport_id}
                  className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">
                          {p.passport_id.slice(0, 14)}...{p.passport_id.slice(-8)}
                        </span>
                        <button
                          onClick={() => handleCopy(p.passport_id, p.passport_id)}
                          className="hover:text-primary transition-colors"
                        >
                          {copiedText === p.passport_id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Issued: {new Date(p.issued_at).toLocaleDateString()}
                        </span>
                        <span>&bull;</span>
                        <span>Expires: {new Date(p.expires_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isValid && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          VALID & ACTIVE
                        </span>
                      )}
                      {isRevoked && (
                        <span className="px-3 py-1 rounded-full bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-1.5">
                          <Ban className="h-3.5 w-3.5" />
                          REVOKED
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          EXPIRED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">Reputation Score</div>
                      <div className="font-mono font-bold text-sm text-primary">{p.reputation_score} / 100</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Repayment Track</div>
                      <div className="font-mono font-bold text-sm text-emerald-500">
                        {p.repaid_loans} / {p.total_loans} ({p.on_time_repayment_rate}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">AI Risk Category</div>
                      <div className="font-mono font-bold text-sm">{p.risk_category} RISK</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Data SHA-256 Hash</div>
                      <div className="font-mono text-muted-foreground truncate" title={p.data_hash}>
                        {p.data_hash.slice(0, 10)}...{p.data_hash.slice(-6)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`${chainConfig.apiUrl}/api/passport/${p.passport_id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border bg-card hover:bg-muted font-medium text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 text-primary" />
                        Download PDF Passport
                      </a>

                      <Link
                        href={`/verify/${p.passport_id}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg border bg-card hover:bg-muted font-medium text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <QrCode className="h-3.5 w-3.5 text-sky-400" />
                        Public Verification Page
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </div>

                    {!isRevoked && (
                      <button
                        onClick={() => handleRevokePassport(p.passport_id)}
                        disabled={revokingId === p.passport_id}
                        className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {revokingId === p.passport_id ? "Revoking..." : "Revoke Passport"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Architecture & Verification Disclaimer Card */}
      <div className="p-5 rounded-2xl border bg-muted/20 text-xs text-muted-foreground space-y-2">
        <div className="font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Independent Third-Party Verification
        </div>
        <p className="leading-relaxed">
          Anyone holding a borrower's Credit Passport ID can visit the public verification page
          without installing MetaMask or connecting an Ethereum wallet. The verification page queries
          the on-chain <span className="font-mono text-foreground font-semibold">CreditPassportRegistry</span> contract
          at <span className="font-mono text-foreground font-semibold">{contracts.creditPassportRegistry}</span> and
          independently validates that the document's SHA-256 data hash matches the immutable on-chain record.
        </p>
      </div>
    </div>
  );
}
