// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ICreditPassportRegistry
 * @notice Interface for on-chain anchoring and independent verification of Credit Passports
 */
interface ICreditPassportRegistry {
    enum PassportStatus {
        NOT_FOUND,
        VALID,
        INVALID_HASH,
        REVOKED,
        EXPIRED
    }

    struct PassportRecord {
        bytes32 dataHash;
        address borrower;
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
        uint256 version;
    }

    event PassportRegistered(
        bytes32 indexed passportId,
        address indexed borrower,
        bytes32 dataHash,
        uint256 issuedAt,
        uint256 expiresAt,
        uint256 version
    );

    event PassportRevoked(
        bytes32 indexed passportId,
        address indexed borrower,
        address indexed revoker,
        uint256 timestamp
    );

    function registerPassport(
        bytes32 passportId,
        address borrower,
        bytes32 dataHash,
        uint256 expiresAt
    ) external;

    function revokePassport(bytes32 passportId) external;

    function verifyPassport(
        bytes32 passportId,
        bytes32 dataHash
    ) external view returns (bool isValid, PassportStatus status);

    function getPassport(bytes32 passportId) external view returns (PassportRecord memory);

    function getBorrowerPassports(address borrower) external view returns (bytes32[] memory);

    function isPassportValid(bytes32 passportId) external view returns (bool);
}
