// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ILoanEscrow.sol";

/**
 * @title LoanEscrow
 * @author CredChain Team — Member 2
 * @notice Holds and manages ERC-20 token custody for loan operations
 * @dev Module 2 — Token transfers, collateralization, and escrow
 *
 * Manages three types of per-loan balances:
 *   1. Collateral — locked by borrower, released on repayment or seized on default
 *   2. Loan Funds — deposited by lender, disbursed to borrower
 *   3. Repayments — received from borrower, forwarded to lender
 *
 * Security: Uses ReentrancyGuard, SafeERC20, checks-effects-interactions pattern
 */
contract LoanEscrow is ILoanEscrow, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice The ERC-20 token used for lending operations
    IERC20 public immutable token;

    /// @notice Per-loan escrow accounting
    struct EscrowAccount {
        uint256 collateral;
        uint256 loanFunds;
        uint256 repaymentBalance;
        bool collateralReleased;
        bool fundsDisbursed;
        address borrower;
        address lender;
    }

    /// @notice Loan ID -> Escrow Account
    mapping(uint256 => EscrowAccount) private _accounts;

    // Errors
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientBalance(uint256 available, uint256 requested);
    error CollateralAlreadyReleased(uint256 loanId);
    error FundsAlreadyDisbursed(uint256 loanId);
    error NoCollateralDeposited(uint256 loanId);
    error NoFundsDeposited(uint256 loanId);
    error UnauthorizedCaller(address caller);

    constructor(address _token, address admin) {
        if (_token == address(0) || admin == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ============================
    //  Collateral Management
    // ============================

    /**
     * @notice Deposit collateral for a loan
     * @dev Transfers tokens from borrower to this contract
     * @param loanId Loan identifier
     * @param borrower Address depositing collateral
     * @param amount Amount of tokens to lock as collateral
     */
    function depositCollateral(uint256 loanId, address borrower, uint256 amount)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (borrower == address(0)) revert ZeroAddress();

        EscrowAccount storage account = _accounts[loanId];
        account.borrower = borrower;

        // Effects
        account.collateral += amount;

        // Interactions
        token.safeTransferFrom(borrower, address(this), amount);

        emit CollateralDeposited(loanId, borrower, amount);
    }

    /**
     * @notice Release collateral back to borrower (on successful repayment)
     * @param loanId Loan identifier
     * @param borrower Address to receive the released collateral
     */
    function releaseCollateral(uint256 loanId, address borrower)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        EscrowAccount storage account = _accounts[loanId];
        if (account.collateralReleased) revert CollateralAlreadyReleased(loanId);
        if (account.collateral == 0) revert NoCollateralDeposited(loanId);

        uint256 amount = account.collateral;

        // Effects first
        account.collateral = 0;
        account.collateralReleased = true;

        // Interactions
        token.safeTransfer(borrower, amount);

        emit CollateralReleased(loanId, borrower, amount);
    }

    /**
     * @notice Seize collateral on loan default
     * @dev Transfers collateral to the lender (or holds for admin processing)
     * @param loanId Loan identifier
     */
    function seizeCollateral(uint256 loanId)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        EscrowAccount storage account = _accounts[loanId];
        if (account.collateralReleased) revert CollateralAlreadyReleased(loanId);
        if (account.collateral == 0) revert NoCollateralDeposited(loanId);

        uint256 amount = account.collateral;
        address lender = account.lender;

        // Effects
        account.collateral = 0;
        account.collateralReleased = true;

        // Transfer seized collateral to lender if set, otherwise hold
        if (lender != address(0)) {
            token.safeTransfer(lender, amount);
        }

        emit CollateralSeized(loanId, amount);
    }

    // ============================
    //  Loan Fund Management
    // ============================

    /**
     * @notice Deposit loan funds from the lender
     * @param loanId Loan identifier
     * @param lender Address providing the funds
     * @param amount Amount of loan funds
     */
    function depositLoanFunds(uint256 loanId, address lender, uint256 amount)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (lender == address(0)) revert ZeroAddress();

        EscrowAccount storage account = _accounts[loanId];
        account.lender = lender;

        // Effects
        account.loanFunds += amount;

        // Interactions
        token.safeTransferFrom(lender, address(this), amount);

        emit LoanFundsDeposited(loanId, lender, amount);
    }

    /**
     * @notice Disburse loan funds to the borrower
     * @param loanId Loan identifier
     * @param borrower Address to receive the loan
     */
    function disburseLoanFunds(uint256 loanId, address borrower)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        EscrowAccount storage account = _accounts[loanId];
        if (account.fundsDisbursed) revert FundsAlreadyDisbursed(loanId);
        if (account.loanFunds == 0) revert NoFundsDeposited(loanId);

        uint256 amount = account.loanFunds;

        // Effects
        account.loanFunds = 0;
        account.fundsDisbursed = true;

        // Interactions
        token.safeTransfer(borrower, amount);

        emit LoanFundsDisbursed(loanId, borrower, amount);
    }

    // ============================
    //  Repayment Management
    // ============================

    /**
     * @notice Receive repayment from the borrower
     * @param loanId Loan identifier
     * @param borrower Address making the repayment
     * @param amount Repayment amount
     */
    function receiveRepayment(uint256 loanId, address borrower, uint256 amount)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();

        EscrowAccount storage account = _accounts[loanId];

        // Effects
        account.repaymentBalance += amount;

        // Interactions
        token.safeTransferFrom(borrower, address(this), amount);

        emit RepaymentReceived(loanId, borrower, amount);
    }

    /**
     * @notice Forward accumulated repayment to the lender
     * @param loanId Loan identifier
     * @param lender Address to receive repayment
     * @param amount Amount to forward
     */
    function forwardRepaymentToLender(uint256 loanId, address lender, uint256 amount)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        EscrowAccount storage account = _accounts[loanId];
        if (amount > account.repaymentBalance) {
            revert InsufficientBalance(account.repaymentBalance, amount);
        }

        // Effects
        account.repaymentBalance -= amount;

        // Interactions
        token.safeTransfer(lender, amount);

        emit RepaymentForwarded(loanId, lender, amount);
    }

    // ============================
    //  View Functions
    // ============================

    function getCollateralBalance(uint256 loanId) external view returns (uint256) {
        return _accounts[loanId].collateral;
    }

    function getLoanFundBalance(uint256 loanId) external view returns (uint256) {
        return _accounts[loanId].loanFunds;
    }

    function getEscrowDetails(uint256 loanId) external view returns (
        uint256 collateral,
        uint256 loanFunds,
        uint256 repaymentBalance,
        bool collateralReleased,
        bool fundsDisbursed
    ) {
        EscrowAccount storage account = _accounts[loanId];
        return (
            account.collateral,
            account.loanFunds,
            account.repaymentBalance,
            account.collateralReleased,
            account.fundsDisbursed
        );
    }

    // ============================
    //  Admin
    // ============================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
