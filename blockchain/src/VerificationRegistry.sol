// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IVerificationRegistry.sol";

/**
 * @title VerificationRegistry
 * @author CredChain Team
 * @notice Immutable on-chain registry for anchoring borrower financial verification status
 * @dev Stores cryptographic verification hashes and status levels (Unverified, EvidenceChecked,
 *      SourceVerified, ManualReview) attested by authorized verifiers or governance admins.
 *      Zero personal financial documents or private identifiers are stored on-chain.
 */
contract VerificationRegistry is IVerificationRegistry, AccessControl, Pausable {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice borrower wallet address => VerificationRecord
    mapping(address => VerificationRecord) private _verifications;

    // Custom Errors
    error ZeroAddress();
    error ZeroRecordHash();
    error UnauthorizedVerifier(address caller);
    error BorrowerCannotSelfVerify();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /**
     * @notice Update or attest a borrower's verification record
     * @dev Restricted to VERIFIER_ROLE or DEFAULT_ADMIN_ROLE.
     *      Borrowers are strictly forbidden from self-attesting to prevent fraud.
     * @param borrower Target borrower wallet address
     * @param status Updated status (EvidenceChecked, SourceVerified, ManualReview, Unverified)
     * @param recordHash Keccak256 hash of canonical off-chain verification JSON record
     * @param declaredIncome Declared monthly income in currency basic units
     * @param extractedIncome Extracted monthly income from documents
     * @param discrepancyBps Discrepancy percentage in basis points (e.g., 250 = 2.50%)
     */
    function updateVerification(
        address borrower,
        VerificationStatus status,
        bytes32 recordHash,
        uint256 declaredIncome,
        uint256 extractedIncome,
        uint16 discrepancyBps
    ) external whenNotPaused {
        if (borrower == address(0)) revert ZeroAddress();
        if (recordHash == bytes32(0)) revert ZeroRecordHash();

        if (!hasRole(VERIFIER_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedVerifier(msg.sender);
        }

        // Borrowers can never approve or update their own status
        if (msg.sender == borrower && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert BorrowerCannotSelfVerify();
        }

        _verifications[borrower] = VerificationRecord({
            status: status,
            recordHash: recordHash,
            verifier: msg.sender,
            timestamp: block.timestamp,
            declaredIncome: declaredIncome,
            extractedIncome: extractedIncome,
            discrepancyBps: discrepancyBps
        });

        emit VerificationStatusUpdated(
            borrower,
            status,
            recordHash,
            msg.sender,
            block.timestamp,
            discrepancyBps
        );
    }

    /**
     * @notice Retrieve the full verification record for a borrower
     */
    function getVerification(address borrower) external view returns (VerificationRecord memory) {
        return _verifications[borrower];
    }

    /**
     * @notice Retrieve the current verification status level for a borrower
     */
    function getVerificationStatus(address borrower) external view returns (VerificationStatus) {
        return _verifications[borrower].status;
    }

    /**
     * @notice Convenience check whether borrower is EvidenceChecked or SourceVerified
     */
    function isEvidenceCheckedOrBetter(address borrower) external view returns (bool) {
        VerificationStatus s = _verifications[borrower].status;
        return (s == VerificationStatus.EvidenceChecked || s == VerificationStatus.SourceVerified);
    }

    // ============================
    //  Emergency Controls
    // ============================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
