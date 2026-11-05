// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVerificationRegistry
 * @notice Interface for on-chain anchoring of borrower financial verification status
 */
interface IVerificationRegistry {
    enum VerificationStatus {
        Unverified,      // 0: Self-declared only, no supporting evidence
        EvidenceChecked, // 1: Documents parsed & checked against declarations within tolerance
        SourceVerified,  // 2: Confirmed by authorized verifier or trusted institution
        ManualReview     // 3: Discrepancy detected or automated extraction failed
    }

    struct VerificationRecord {
        VerificationStatus status;
        bytes32 recordHash;       // Cryptographic hash (keccak256) of canonical verification record
        address verifier;         // Address of authorized verifier who attested
        uint256 timestamp;        // Timestamp when status was set
        uint256 declaredIncome;   // Declared monthly income in currency basic units
        uint256 extractedIncome;  // Extracted monthly income from evidence
        uint16 discrepancyBps;    // Discrepancy in basis points (100 = 1.00%)
    }

    event VerificationStatusUpdated(
        address indexed borrower,
        VerificationStatus indexed status,
        bytes32 indexed recordHash,
        address verifier,
        uint256 timestamp,
        uint16 discrepancyBps
    );

    function updateVerification(
        address borrower,
        VerificationStatus status,
        bytes32 recordHash,
        uint256 declaredIncome,
        uint256 extractedIncome,
        uint16 discrepancyBps
    ) external;

    function getVerification(address borrower) external view returns (VerificationRecord memory);

    function getVerificationStatus(address borrower) external view returns (VerificationStatus);

    function isEvidenceCheckedOrBetter(address borrower) external view returns (bool);
}
