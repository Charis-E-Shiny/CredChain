# CredChain — Four-Member Team Contribution Report

CredChain was developed as an academic FinTech blockchain mini-project with four distinct smart contract ownership areas, shared AI/ML pipelines, and full-stack Web3 frontend integration.

---

## Member 1 — Smart Contract State Machines & Loan Lifecycle
- **Ownership Scope**: `LoanManager.sol`, `ILoanManager.sol`, `test/LoanManager.t.sol`
- **Core Concept**: State machines and event-driven blockchain architecture.
- **Key Contributions**:
  - Engineered the 7-state lifecycle: `REQUESTED`, `APPROVED`, `ACTIVE`, `REPAID`, `DEFAULTED`, `REJECTED`, `CANCELLED`.
  - Implemented mathematical interest accounting (basis points).
  - Enforced checks preventing duplicate loan applications, invalid transitions, and repayments exceeding outstanding principal.
  - Authored 43 Forge unit and fuzz tests with invariant guarantees.

---

## Member 2 — ERC-20 Tokenization, Collateralization & Escrow
- **Ownership Scope**: `CredToken.sol`, `LoanEscrow.sol`, `ILoanEscrow.sol`, `test/CredToken.t.sol`, `test/LoanEscrow.t.sol`
- **Core Concept**: Token standards, non-custodial custody, checks-effects-interactions.
- **Key Contributions**:
  - Implemented the `CredToken` ERC-20 test lending token with controlled minting, pause mechanisms, and public faucet.
  - Built `LoanEscrow.sol` ensuring zero-loss collateral custody, atomic releases, and default collateral seizure.
  - Eliminated reentrancy attack vectors using OpenZeppelin `ReentrancyGuard` and strictly ordered state modifications.
  - Authored 46 unit and fuzz tests covering tokenomics and escrow accounting.

---

## Member 3 — Role-Based Access Control & Multi-Signature Governance
- **Ownership Scope**: `LoanGovernance.sol`, `ILoanGovernance.sol`, `test/LoanGovernance.t.sol`
- **Core Concept**: Decentralized authorization, multi-party consensus, administrative boundaries.
- **Key Contributions**:
  - Implemented OpenZeppelin `AccessControl` separating `DEFAULT_ADMIN_ROLE`, `APPROVER_ROLE`, and `PAUSER_ROLE`.
  - Created dynamic threshold validation: standard micro-loans require 1 signature, while high-value loans (>= 5,000 tokens) require 2 independent approvals.
  - Prevented replay attacks and duplicate signer voting.
  - Authored governance testing suite validating threshold transitions and rejection flows.

---

## Member 4 — Decentralized Oracles & On-Chain Reputation
- **Ownership Scope**: `CollateralOracle.sol`, `BorrowerReputation.sol`, `ICollateralOracle.sol`, `IBorrowerReputation.sol`, `test/CollateralOracle.t.sol`, `test/BorrowerReputation.t.sol`
- **Core Concept**: Chainlink decentralized price oracles and persistent on-chain reputation.
- **Key Contributions**:
  - Integrated Chainlink Sepolia ETH/USD aggregator with staleness detection (heartbeat window validation) and non-positive price guards.
  - Implemented Loan-to-Value (LTV) calculation and collateral sufficiency checks.
  - Built `BorrowerReputation.sol` utilizing a deterministic on-chain reputation algorithm:
    $$\text{Score} = \frac{\text{Repaid Loans} \times 100}{\text{Total Loans}}$$
  - Restricted state updates exclusively to the `LoanManager` contract via `RECORDER_ROLE`.

---

## Shared Full-Stack & AI Responsibilities
- **Backend & ML Pipeline**:
  - Synthetic credit dataset creation with realistic distributions (DTI, income, delinquencies).
  - GradientBoosting classifier training, saving artifacts to disk (`model.pkl`, `scaler.pkl`).
  - FastAPI endpoints (`/api/credit/assess`, `/api/health`, `/api/analytics/overview`).
- **Frontend Dashboard**:
  - Next.js App Router application with Tailwind CSS, Lucide icons, and institutional FinTech aesthetic.
  - Wagmi and Viem hooks reading on-chain state and signing transactions.
