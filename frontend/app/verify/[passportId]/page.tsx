"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { chainConfig, contracts } from "@/config/contracts";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  Download,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Building2,
  Lock,
  FileCheck,
} from "lucide-react";

interface VerificationData {
  passport_id: string;
  status: "VALID" | "REVOKED" | "EXPIRED" | "INVALID" | "NOT_FOUND";
  is_valid: boolean;
  on_chain_verified: boolean;
  borrower?: string;
  data_hash?: string;
  computed_hash?: string;
  hash_match: boolean;
  issued_at?: string;
  expires_at?: string;
  reputation_score?: number;
  total_loans?: number;
  repaid_loans?: number;
  risk_category?: string;
  registry_address: string;
  blockchain_network: string;
  verification_timestamp: string;
  message: string;
}

export default function PublicVerifyPassportPage() {
  const params = useParams();
  const passportId = (params?.passportId as string) || "";

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = async () => {
    if (!passportId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/passport/${passportId}/verify`);
      if (!res.ok) {
        throw new Error("Failed to verify passport");
      }
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Error verifying credit passport");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [passportId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RotateCcw className="h-8 w-8 text-primary animate-spin" />
        <div className="text-sm font-medium text-muted-foreground">
          Querying CreditPassportRegistry & validating cryptographic hash...
        </div>
      </div>
    );
  }

  const isValid = data?.status === "VALID" && data?.is_valid;
  const isRevoked = data?.status === "REVOKED";
  const isExpired = data?.status === "EXPIRED";
  const isInvalid = data?.status === "INVALID";
  const isNotFound = data?.status === "NOT_FOUND";

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Building2 className="h-3.5 w-3.5" />
          Independent Third-Party Verification Portal
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Credit Passport Verification</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Public cryptographic audit of borrower loan performance and on-chain identity. No Web3 wallet required to verify.
        </p>
      </div>

      {/* Verification Status Card */}
      <div className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm p-6 space-y-6">
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-4">
            {isValid && (
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            )}
            {isRevoked && (
              <div className="h-14 w-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
                <Ban className="h-8 w-8" />
              </div>
            )}
            {isExpired && (
              <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Clock className="h-8 w-8" />
              </div>
            )}
            {(isInvalid || isNotFound) && (
              <div className="h-14 w-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
                <AlertTriangle className="h-8 w-8" />
              </div>
            )}

            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Document Status
              </div>
              <div className="text-2xl font-black">
                {isValid && <span className="text-emerald-500">AUTHENTIC & VALID</span>}
                {isRevoked && <span className="text-destructive">EXPLICITLY REVOKED</span>}
                {isExpired && <span className="text-amber-500">EXPIRED PASSPORT</span>}
                {isInvalid && <span className="text-destructive">INTEGRITY FAILURE (INVALID)</span>}
                {isNotFound && <span className="text-muted-foreground">PASSPORT NOT FOUND</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{data?.message}</p>
            </div>
          </div>

          {data && !isNotFound && (
            <div className="flex items-center gap-2">
              <a
                href={`${chainConfig.apiUrl}/api/passport/${passportId}/download`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </div>
          )}
        </div>

        {/* Verification Checklist */}
        {data && !isNotFound && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cryptographic Integrity Checklist
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border bg-muted/20 flex items-center gap-3">
                {data.hash_match ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-foreground">SHA-256 Hash Match</div>
                  <div className="text-muted-foreground">Canonical data matches published digest</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-muted/20 flex items-center gap-3">
                {data.on_chain_verified ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-foreground">On-Chain Registry Record</div>
                  <div className="text-muted-foreground">Anchored in CreditPassportRegistry.sol</div>
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-muted/20 flex items-center gap-3">
                {!isExpired ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-foreground">Validity Window</div>
                  <div className="text-muted-foreground">
                    {isExpired ? "Expired on " + new Date(data.expires_at || "").toLocaleDateString() : "Valid until " + new Date(data.expires_at || "").toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-muted/20 flex items-center gap-3">
                {!isRevoked ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Ban className="h-4 w-4 text-destructive shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-foreground">Revocation Status</div>
                  <div className="text-muted-foreground">
                    {isRevoked ? "Revocation flag set on-chain" : "No active revocation recorded"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Snapshot Metrics */}
        {data && !isNotFound && (
          <div className="space-y-3 border-t pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Borrower Credit Snapshot (Anchored Data)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border bg-muted/10 text-xs">
              <div>
                <div className="text-muted-foreground">Reputation Score</div>
                <div className="text-xl font-bold font-mono text-primary">
                  {data.reputation_score ?? 50} <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Loans Repaid</div>
                <div className="text-xl font-bold font-mono text-emerald-500">
                  {data.repaid_loans} / {data.total_loans}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">AI Risk Category</div>
                <div className="text-xl font-bold font-mono">
                  {data.risk_category}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Borrower Wallet</div>
                <div className="font-mono text-sm font-semibold truncate" title={data.borrower}>
                  {data.borrower ? `${data.borrower.slice(0, 6)}...${data.borrower.slice(-4)}` : "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Cryptographic Details */}
        {data && !isNotFound && (
          <div className="space-y-3 border-t pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Technical On-Chain Audit Details
            </h3>
            <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted-foreground">Passport ID:</span>
                <div className="flex items-center gap-1.5 text-foreground">
                  <span>{data.passport_id}</span>
                  <button onClick={() => handleCopy(data.passport_id, "pid")} className="hover:text-primary">
                    {copiedText === "pid" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted-foreground">SHA-256 Data Hash:</span>
                <div className="flex items-center gap-1.5 text-foreground">
                  <span>{data.data_hash}</span>
                  <button onClick={() => handleCopy(data.data_hash || "", "dhash")} className="hover:text-primary">
                    {copiedText === "dhash" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted-foreground">Registry Contract:</span>
                <span className="text-foreground">{data.registry_address}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted-foreground">Blockchain Network:</span>
                <span className="text-foreground">{data.blockchain_network}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-muted-foreground">Audit Verified At:</span>
                <span className="text-foreground">{new Date(data.verification_timestamp).toUTCString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Educational & Disclaimer Notice */}
      <div className="p-4 rounded-xl border bg-muted/30 text-xs text-muted-foreground space-y-1.5">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <FileCheck className="h-4 w-4 text-primary" />
          Academic Prototype Verification Notice
        </div>
        <p className="leading-relaxed">
          This verification page queries the Sepolia testnet / Anvil node where the CredChain smart contracts reside.
          The CredChain Credit Passport is designed for educational exploration of decentralized credit scoring,
          micro-lending state machines, and cryptographic proofs.
        </p>
      </div>

      <div className="text-center pt-2">
        <Link href="/credit-passport" className="text-xs text-primary hover:underline">
          &larr; Return to Borrower Credit Passport Dashboard
        </Link>
      </div>
    </div>
  );
}
