# CredChain — Security Architecture & Threat Model

## 1. Threat Modeling & Vulnerability Mitigation Matrix

| Potential Attack Vector | Impact Severity | Mitigation Mechanism Implemented | Contract |
|---|---|---|---|
| **Reentrancy on Token Transfers** | Critical | OpenZeppelin `ReentrancyGuard` modifier + checks-effects-interactions order | `LoanManager.sol`, `LoanEscrow.sol` |
| **Unauthorized Loan Approval** | High | `AccessControl` with `APPROVER_ROLE` + multi-sig consensus for high-value loans | `LoanGovernance.sol` |
| **Double Collateral Release / Seizure** | Critical | Boolean guards (`collateralReleased`) set before token transfer calls | `LoanEscrow.sol` |
| **Stale Oracle Pricing** | High | Validation check `block.timestamp - updatedAt <= stalenessPeriod` | `CollateralOracle.sol` |
| **Negative / Zero Price Anomaly** | High | Validation `answer > 0` before computing USD collateral value | `CollateralOracle.sol` |
| **Unapproved Self-Reputation Inflation** | High | Only `RECORDER_ROLE` (`LoanManager.sol`) can invoke reputation update functions | `BorrowerReputation.sol` |
| **Emergency Halt** | Medium | OpenZeppelin `Pausable` implemented with `PAUSER_ROLE` restriction | All contracts |
| **Double Outcome Recording** | Medium | Unique tracking mapping `_outcomeRecorded[loanId]` rejects repeated events | `BorrowerReputation.sol` |

---

## 2. Checks-Effects-Interactions Pattern Example

In `LoanEscrow.sol`:

```solidity
function releaseCollateral(uint256 loanId, address borrower)
    external
    onlyRole(OPERATOR_ROLE)
    whenNotPaused
    nonReentrant
{
    EscrowAccount storage account = _accounts[loanId];
    // 1. CHECKS
    if (account.collateralReleased) revert CollateralAlreadyReleased(loanId);
    if (account.collateral == 0) revert NoCollateralDeposited(loanId);

    uint256 amount = account.collateral;

    // 2. EFFECTS
    account.collateral = 0;
    account.collateralReleased = true;

    // 3. INTERACTIONS
    token.safeTransfer(borrower, amount);

    emit CollateralReleased(loanId, borrower, amount);
}
```

Notice that `account.collateral` is reset to `0` and `account.collateralReleased` is set to `true` **before** the external call to `token.safeTransfer(...)`. Even if the token contract were malicious, reentering `releaseCollateral` would immediately revert on the checks.

---

## 3. Known Trust Assumptions & Academic Limitations

1. **Testnet Assets**: CredChain uses test tokens (`CredToken`) without monetary value.
2. **Admin Authority**: `DEFAULT_ADMIN_ROLE` can configure contract addresses and update staleness periods. In production, this would be replaced with a timelock DAO contract.
3. **Oracle Single Point of Failure**: `CollateralOracle.sol` connects to a single Chainlink feed. A production implementation should include fallback oracles (e.g., Uniswap TWAP).
4. **Off-Chain AI Integrity**: Off-chain ML outputs are anchored on-chain via a cryptographic hash, allowing verification that the submitted parameters match the model's output, but the blockchain cannot independently recompute gradient boosting trees without zero-knowledge machine learning (zkML).
