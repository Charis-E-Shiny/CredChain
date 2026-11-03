# CredChain

**Trust. Verify. Borrow. Repay.**

AI-powered decentralized credit scoring and micro-lending platform built on Ethereum.

> ⚠️ **DISCLAIMER**: This is an educational prototype. It uses testnet tokens only and is NOT a real financial service. Do not use real assets.

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui, Wagmi, Viem |
| Blockchain | Solidity, Foundry, OpenZeppelin, Chainlink, Sepolia Testnet |
| Backend | Python, FastAPI, SQLAlchemy, PostgreSQL/SQLite |
| AI/ML | Scikit-learn, SHAP, Random Forest / Gradient Boosting |

## Smart Contract Modules

| Module | Contract(s) | Owner | Concept |
|--------|------------|-------|---------|
| 1 | LoanManager.sol | Member 1 | State machines, loan lifecycle |
| 2 | CredToken.sol, LoanEscrow.sol | Member 2 | ERC-20, escrow, collateral |
| 3 | LoanGovernance.sol | Member 3 | RBAC, multi-sig authorization |
| 4 | CollateralOracle.sol, BorrowerReputation.sol | Member 4 | Chainlink oracles, reputation |

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)
- MetaMask browser extension

### 1. Blockchain
```bash
cd blockchain
forge install
forge build
forge test
```

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.ml.train
uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Local Blockchain
```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy contracts
cd blockchain
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

## Project Structure
```
credchain/
├── blockchain/     # Solidity contracts, tests, deployment scripts
├── backend/        # FastAPI, ML model, database
├── frontend/       # Next.js application
└── docs/           # Architecture, API, security documentation
```

## Team Contributions

See [docs/team-contributions.md](docs/team-contributions.md) for detailed individual contributions.

## License

MIT — Educational use only.
