// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IBorrowerReputation.sol";

/**
 * @title BorrowerReputation
 * @author CredChain Team — Member 4
 * @notice On-chain borrower reputation tracking based on verified loan outcomes
 * @dev Module 4 — Persistent on-chain reputation
 *
 * Records:
 *   - New loans initiated
 *   - Successful repayments
 *   - Verified defaults
 *
 * Reputation score is deterministic and transparent:
 *   score = (repaidLoans * 100) / totalLoans (0-100 scale)
 *   New borrowers with 0 loans get a score of 50 (neutral)
 *
 * Security:
 *   - Only authorized contracts (RECORDER_ROLE) can update records
 *   - Users cannot increase their own reputation
 *   - No sensitive personal data stored on-chain
 */
contract BorrowerReputation is IBorrowerReputation, AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    /// @notice Borrower address -> Reputation Record
    mapping(address => ReputationRecord) private _records;

    /// @notice Track which loans have already been recorded for uniqueness
    mapping(uint256 => bool) private _loanRecorded;
    mapping(uint256 => bool) private _outcomeRecorded;

    // Errors
    error ZeroAddress();
    error LoanAlreadyRecorded(uint256 loanId);
    error OutcomeAlreadyRecorded(uint256 loanId);
    error LoanNotRecorded(uint256 loanId);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, admin);
    }

    // ============================
    //  Record Functions
    // ============================

    /**
     * @notice Record a new loan for a borrower
     * @param borrower Borrower's address
     * @param loanId Unique loan identifier
     * @param amount Loan principal amount
     */
    function recordLoan(address borrower, uint256 loanId, uint256 amount)
        external
        onlyRole(RECORDER_ROLE)
    {
        if (borrower == address(0)) revert ZeroAddress();
        if (_loanRecorded[loanId]) revert LoanAlreadyRecorded(loanId);

        _loanRecorded[loanId] = true;

        ReputationRecord storage record = _records[borrower];
        record.totalLoans++;
        record.totalBorrowed += amount;
        record.lastActivityTimestamp = block.timestamp;

        emit LoanRecorded(borrower, loanId, amount);
    }

    /**
     * @notice Record a successful repayment
     * @param borrower Borrower's address
     * @param loanId Loan identifier
     * @param amount Amount repaid
     */
    function recordRepayment(address borrower, uint256 loanId, uint256 amount)
        external
        onlyRole(RECORDER_ROLE)
    {
        if (borrower == address(0)) revert ZeroAddress();
        if (!_loanRecorded[loanId]) revert LoanNotRecorded(loanId);
        if (_outcomeRecorded[loanId]) revert OutcomeAlreadyRecorded(loanId);

        _outcomeRecorded[loanId] = true;

        ReputationRecord storage record = _records[borrower];
        record.repaidLoans++;
        record.totalRepaid += amount;
        record.lastActivityTimestamp = block.timestamp;

        emit RepaymentRecorded(borrower, loanId, amount);
    }

    /**
     * @notice Record a verified default
     * @param borrower Borrower's address
     * @param loanId Loan identifier
     */
    function recordDefault(address borrower, uint256 loanId)
        external
        onlyRole(RECORDER_ROLE)
    {
        if (borrower == address(0)) revert ZeroAddress();
        if (!_loanRecorded[loanId]) revert LoanNotRecorded(loanId);
        if (_outcomeRecorded[loanId]) revert OutcomeAlreadyRecorded(loanId);

        _outcomeRecorded[loanId] = true;

        ReputationRecord storage record = _records[borrower];
        record.defaultedLoans++;
        record.lastActivityTimestamp = block.timestamp;

        emit DefaultRecorded(borrower, loanId);
    }

    // ============================
    //  View Functions
    // ============================

    /**
     * @notice Get the full reputation record for a borrower
     * @param borrower Borrower's address
     * @return The borrower's reputation record
     */
    function getReputation(address borrower) external view returns (ReputationRecord memory) {
        return _records[borrower];
    }

    /**
     * @notice Calculate reputation score (0-100)
     * @dev New borrowers with no history get 50 (neutral)
     *      Score = (repaidLoans * 100) / totalLoans
     * @param borrower Borrower's address
     * @return score Reputation score (0-100)
     */
    function getReputationScore(address borrower) external view returns (uint256 score) {
        ReputationRecord storage record = _records[borrower];

        if (record.totalLoans == 0) {
            return 50; // Neutral for new borrowers
        }

        // Weighted score: completed loans out of total
        score = (record.repaidLoans * 100) / record.totalLoans;
    }

    /**
     * @notice Get loan completion rate in basis points
     * @param borrower Borrower's address
     * @return Completion rate (0-10000 bps)
     */
    function getCompletionRate(address borrower) external view returns (uint256) {
        ReputationRecord storage record = _records[borrower];

        if (record.totalLoans == 0) {
            return 5000; // 50% neutral
        }

        return (record.repaidLoans * 10000) / record.totalLoans;
    }

    /**
     * @notice Check if a loan has been recorded
     * @param loanId Loan identifier
     * @return True if the loan is recorded in the system
     */
    function isLoanRecorded(uint256 loanId) external view returns (bool) {
        return _loanRecorded[loanId];
    }

    /**
     * @notice Check if a loan outcome has been recorded
     * @param loanId Loan identifier
     * @return True if repayment or default has been recorded
     */
    function isOutcomeRecorded(uint256 loanId) external view returns (bool) {
        return _outcomeRecorded[loanId];
    }
}
