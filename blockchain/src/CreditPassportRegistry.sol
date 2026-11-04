// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ICreditPassportRegistry.sol";

/**
 * @title CreditPassportRegistry
 * @author CredChain Team
 * @notice Immutable on-chain registry for anchoring and verifying borrower Credit Passports
 * @dev Stores cryptographic hashes of canonical passport data for independent third-party verification
 *      without requiring external lenders to connect a wallet or reveal private financial attributes.
 */
contract CreditPassportRegistry is ICreditPassportRegistry, AccessControl, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice passportId => PassportRecord
    mapping(bytes32 => PassportRecord) private _passports;

    /// @notice borrower address => list of issued passport IDs
    mapping(address => bytes32[]) private _borrowerPassports;

    /// @notice borrower address => total passport count (used for versioning)
    mapping(address => uint256) private _borrowerVersionCount;

    // Custom Errors
    error ZeroPassportId();
    error ZeroDataHash();
    error ZeroAddress();
    error PassportAlreadyExists(bytes32 passportId);
    error PassportNotFound(bytes32 passportId);
    error PassportAlreadyRevoked(bytes32 passportId);
    error UnauthorizedCaller(address caller);
    error InvalidExpirationTime();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ============================
    //  Passport Registration
    // ============================

    /**
     * @notice Register a newly issued Credit Passport by anchoring its canonical data hash
     * @param passportId Unique identifier of the passport (bytes32 hex digest)
     * @param borrower Borrower's Ethereum wallet address
     * @param dataHash Cryptographic hash (SHA-256 or keccak256) of canonical passport JSON
     * @param expiresAt Unix timestamp when passport expires (0 for permanent validity)
     */
    function registerPassport(
        bytes32 passportId,
        address borrower,
        bytes32 dataHash,
        uint256 expiresAt
    ) external whenNotPaused {
        if (passportId == bytes32(0)) revert ZeroPassportId();
        if (dataHash == bytes32(0)) revert ZeroDataHash();
        if (borrower == address(0)) revert ZeroAddress();
        if (_passports[passportId].issuedAt != 0) revert PassportAlreadyExists(passportId);
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpirationTime();

        // Only authorized issuer or the borrower themselves can anchor their passport
        if (!hasRole(ISSUER_ROLE, msg.sender) && msg.sender != borrower) {
            revert UnauthorizedCaller(msg.sender);
        }

        uint256 newVersion = ++_borrowerVersionCount[borrower];

        _passports[passportId] = PassportRecord({
            dataHash: dataHash,
            borrower: borrower,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            version: newVersion
        });

        _borrowerPassports[borrower].push(passportId);

        emit PassportRegistered(
            passportId,
            borrower,
            dataHash,
            block.timestamp,
            expiresAt,
            newVersion
        );
    }

    /**
     * @notice Revoke a previously issued passport
     * @dev Only the borrower themselves or an authorized ISSUER / ADMIN can revoke
     * @param passportId Unique identifier of the passport
     */
    function revokePassport(bytes32 passportId) external whenNotPaused {
        PassportRecord storage record = _passports[passportId];
        if (record.issuedAt == 0) revert PassportNotFound(passportId);
        if (record.revoked) revert PassportAlreadyRevoked(passportId);

        if (
            msg.sender != record.borrower &&
            !hasRole(ISSUER_ROLE, msg.sender) &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
        ) {
            revert UnauthorizedCaller(msg.sender);
        }

        record.revoked = true;

        emit PassportRevoked(passportId, record.borrower, msg.sender, block.timestamp);
    }

    // ============================
    //  Verification & Views
    // ============================

    /**
     * @notice Independently verify a passport against its on-chain anchor
     * @param passportId Unique identifier of the passport
     * @param dataHash Cryptographic hash recomputed from canonical passport data
     * @return isValid True ONLY IF passport exists, hash matches, not revoked, and not expired
     * @return status Detailed verification status enum
     */
    function verifyPassport(
        bytes32 passportId,
        bytes32 dataHash
    ) external view returns (bool isValid, PassportStatus status) {
        PassportRecord storage record = _passports[passportId];

        if (record.issuedAt == 0) {
            return (false, PassportStatus.NOT_FOUND);
        }

        if (record.revoked) {
            return (false, PassportStatus.REVOKED);
        }

        if (record.expiresAt != 0 && block.timestamp > record.expiresAt) {
            return (false, PassportStatus.EXPIRED);
        }

        if (record.dataHash != dataHash) {
            return (false, PassportStatus.INVALID_HASH);
        }

        return (true, PassportStatus.VALID);
    }

    /**
     * @notice Get full on-chain record for a passport
     */
    function getPassport(bytes32 passportId) external view returns (PassportRecord memory) {
        PassportRecord memory record = _passports[passportId];
        if (record.issuedAt == 0) revert PassportNotFound(passportId);
        return record;
    }

    /**
     * @notice Check if a passport is currently valid without supplying hash
     */
    function isPassportValid(bytes32 passportId) external view returns (bool) {
        PassportRecord storage record = _passports[passportId];
        if (record.issuedAt == 0 || record.revoked) return false;
        if (record.expiresAt != 0 && block.timestamp > record.expiresAt) return false;
        return true;
    }

    /**
     * @notice List all passport IDs registered for a borrower
     */
    function getBorrowerPassports(address borrower) external view returns (bytes32[] memory) {
        return _borrowerPassports[borrower];
    }

    /**
     * @notice Get latest passport version for a borrower
     */
    function getBorrowerPassportCount(address borrower) external view returns (uint256) {
        return _borrowerVersionCount[borrower];
    }

    // ============================
    //  Admin Circuit Breaker
    // ============================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
