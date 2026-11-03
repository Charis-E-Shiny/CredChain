"use client";

import { contracts, chainConfig } from "@/config/contracts";
import { Compass, ExternalLink, ShieldCheck, Copy } from "lucide-react";
import { useState } from "react";

const deployedContracts = [
  {
    name: "CredToken (CRED)",
    module: "Module 2 — Tokenization",
    address: contracts.credToken,
    description: "ERC-20 test lending token with controlled minting and faucet functionality.",
  },
  {
    name: "LoanManager",
    module: "Module 1 — Lifecycle State Machine",
    address: contracts.loanManager,
    description: "State-machine managing REQUESTED, APPROVED, ACTIVE, REPAID, DEFAULTED states.",
  },
  {
    name: "LoanEscrow",
    module: "Module 2 — Collateral & Custody",
    address: contracts.loanEscrow,
    description: "Non-custodial custody of borrower collateral, fund disbursements, and repayments.",
  },
  {
    name: "LoanGovernance",
    module: "Module 3 — Multi-Sig Governance",
    address: contracts.loanGovernance,
    description: "RBAC authorization and multi-signature consensus for loan disbursements.",
  },
  {
    name: "CollateralOracle",
    module: "Module 4 — Chainlink Integration",
    address: contracts.collateralOracle,
    description: "Chainlink ETH/USD price feed with freshness validation and LTV computations.",
  },
  {
    name: "BorrowerReputation",
    module: "Module 4 — On-Chain Reputation",
    address: contracts.borrowerReputation,
    description: "Deterministic reputation tracking updated only by verified smart contract outcomes.",
  },
];

export default function ExplorerPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          Blockchain Architecture Explorer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inspection portal for all 6 deployed smart contracts on Ethereum Sepolia.
        </p>
      </div>

      <div className="p-4 rounded-xl border bg-card/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-muted-foreground">Target Network: </span>
          <span className="font-bold text-foreground">{chainConfig.networkName} (Chain ID: {chainConfig.chainId})</span>
        </div>
        <div>
          <span className="text-muted-foreground">Block Explorer: </span>
          <a
            href={chainConfig.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Sepolia Etherscan <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {deployedContracts.map((c) => (
          <div key={c.name} className="p-5 rounded-xl border bg-card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm">{c.name}</h3>
                <span className="text-[11px] text-primary font-medium">{c.module}</span>
              </div>
              <a
                href={`${chainConfig.explorerUrl}/address/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>

            <div className="p-2.5 rounded-lg border bg-muted/30 font-mono text-xs flex items-center justify-between">
              <span className="truncate mr-2">{c.address}</span>
              <button
                onClick={() => copyToClipboard(c.address, c.name)}
                className="text-[11px] text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                {copied === c.name ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
