// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CredToken
 * @author CredChain Team — Member 2
 * @notice ERC-20 test lending token for the CredChain platform
 * @dev Implements controlled minting for testnet use only.
 *      NOT a real financial asset. For educational purposes only.
 *
 * Core Concept: ERC-20 tokenization standard — approve, transfer, transferFrom
 */
contract CredToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Maximum total supply: 100 million tokens
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;

    /// @notice Maximum mint per transaction: 10,000 tokens
    uint256 public constant MAX_MINT_PER_TX = 10_000 * 1e18;

    /// @notice Tracks total amount minted by each minter for transparency
    mapping(address => uint256) public mintedBy;

    // Events
    event TokensMinted(address indexed minter, address indexed to, uint256 amount);

    // Errors
    error ExceedsMaxSupply(uint256 requested, uint256 available);
    error ExceedsMaxMintPerTx(uint256 requested, uint256 max);
    error ZeroAddress();
    error ZeroAmount();

    constructor(address admin) ERC20("CredChain Token", "CRED") {
        if (admin == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /**
     * @notice Mint test tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (in wei)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > MAX_MINT_PER_TX) revert ExceedsMaxMintPerTx(amount, MAX_MINT_PER_TX);
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedsMaxSupply(amount, MAX_SUPPLY - totalSupply());
        }

        mintedBy[msg.sender] += amount;
        _mint(to, amount);

        emit TokensMinted(msg.sender, to, amount);
    }

    /**
     * @notice Mint tokens to the caller (faucet for testing)
     * @param amount Amount to mint (in wei)
     */
    function faucet(uint256 amount) external whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (amount > 1000 * 1e18) revert ExceedsMaxMintPerTx(amount, 1000 * 1e18);
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedsMaxSupply(amount, MAX_SUPPLY - totalSupply());
        }

        _mint(msg.sender, amount);
        emit TokensMinted(address(0), msg.sender, amount);
    }

    /// @notice Pause all token operations
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause all token operations
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override to add pause check to transfers
     */
    function _update(address from, address to, uint256 value) internal virtual override whenNotPaused {
        super._update(from, to, value);
    }
}
