# CredChain — Deployment & Configuration Guide

## 1. Blockchain Deployment via Foundry

### Prerequisites
- Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- Alchemy or Infura Sepolia RPC URL
- Testnet Private Key with Sepolia ETH

### Local Anvil Deployment
```bash
# Terminal 1: Launch Anvil local node
anvil

# Terminal 2: Run deployment script
cd blockchain
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### Ethereum Sepolia Testnet Deployment
```bash
cd blockchain
export SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
export DEPLOYER_PRIVATE_KEY="0xYOUR_TESTNET_PRIVATE_KEY"
export ETHERSCAN_API_KEY="YOUR_ETHERSCAN_KEY"

forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --slow
```

---

## 2. Backend Setup & Model Training

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Train GradientBoosting credit model and generate artifacts
python3 -m app.ml.train

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 3. Frontend Setup

```bash
cd frontend
npm install

# Configure environment variables in frontend/.env.local
cp ../.env.example .env.local

# Run development server
npm run dev
```

Navigate to `http://localhost:3000` to interact with the DApp!
