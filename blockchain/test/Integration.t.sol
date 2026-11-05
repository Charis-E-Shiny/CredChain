// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/LoanManager.sol";
import "../src/CredToken.sol";
import "../src/LoanEscrow.sol";
import "../src/LoanGovernance.sol";
import "../src/CollateralOracle.sol";
import "../src/BorrowerReputation.sol";
import "./CollateralOracle.t.sol"; // For MockAggregator

/**
 * @title CredChainEndToEndIntegrationTest
 * @notice Tests the complete integrated lending workflow across all 4 modules
 */
contract CredChainEndToEndIntegrationTest is Test {
    CredToken public credToken;
    LoanManager public loanManager;
    LoanEscrow public escrow;
    LoanGovernance public governance;
    CollateralOracle public oracle;
    BorrowerReputation public reputation;
    MockAggregator public priceFeed;

    address public admin = makeAddr("admin");
    address public approver = makeAddr("approver");
    address public lender = makeAddr("lender");
    address public borrower = makeAddr("borrower");

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy token
        credToken = new CredToken(admin);

        // 2. Deploy escrow
        escrow = new LoanEscrow(address(credToken), admin);

        // 3. Deploy governance (1 approver for standard loans)
        governance = new LoanGovernance(admin, 1, 5000 * 1e18, 2);
        governance.grantRole(governance.APPROVER_ROLE(), approver);

        // 4. Deploy reputation
        reputation = new BorrowerReputation(admin);

        // 5. Deploy oracle ($2,000 ETH)
        priceFeed = new MockAggregator(8, 2000_00000000);
        oracle = new CollateralOracle(address(priceFeed), admin);

        // 6. Deploy loan manager
        loanManager = new LoanManager(admin);

        // 7. Wire cross-contract permissions
        loanManager.setContracts(address(escrow), address(governance), address(reputation));
        governance.setLoanManager(address(loanManager));
        escrow.grantRole(escrow.OPERATOR_ROLE(), address(loanManager));
        escrow.grantRole(escrow.OPERATOR_ROLE(), admin); // Admin can help in testing
        reputation.grantRole(reputation.RECORDER_ROLE(), address(loanManager));

        // 8. Fund accounts with CRED test tokens
        credToken.mint(lender, 10000 * 1e18);
        credToken.mint(borrower, 5000 * 1e18);

        vm.stopPrank();

        // 9. Approve escrow
        vm.prank(lender);
        credToken.approve(address(escrow), type(uint256).max);

        vm.prank(borrower);
        credToken.approve(address(escrow), type(uint256).max);
    }

    /**
     * @notice Scenario 1: Complete Happy Path
     * Request -> AI Risk Hash -> Governance Approve -> Escrow Disburse -> Repay -> Reputation Update
     */
    function test_Scenario1_SuccessfulLoanLifecycle() public {
        uint256 loanAmount = 1000 * 1e18;
        uint256 collateralAmount = 200 * 1e18;
        uint256 duration = 30 days;
        uint256 interestBps = 500; // 5%
        bytes32 aiRiskHash = keccak256("ai-assessment-low-risk-v1");

        // Step 1: Borrower requests loan
        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(
            loanAmount,
            collateralAmount,
            duration,
            interestBps,
            aiRiskHash
        );

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REQUESTED));

        // Step 2: Off-chain AI risk assessment hash is verified by governance approver
        vm.prank(approver);
        governance.submitApproval(loanId);
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.APPROVED));

        // Step 3: Lender activates loan
        vm.prank(lender);
        loanManager.activateLoan(loanId);
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.ACTIVE));

        // Verify reputation record was initiated
        IBorrowerReputation.ReputationRecord memory rec = reputation.getReputation(borrower);
        assertEq(rec.totalLoans, 1);

        // Step 4: Borrower repays total owed (1000 + 5% = 1050 tokens)
        uint256 totalOwed = (loanAmount * 10500) / 10000;
        vm.prank(borrower);
        loanManager.repayLoan(loanId, totalOwed);

        // Step 5: Loan is now REPAID and reputation score updated to 100
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REPAID));
        assertEq(reputation.getReputationScore(borrower), 100);

        // Step 6: Tokens settled: lender earned 50 interest, borrower has collateral back
        assertEq(credToken.balanceOf(lender), 10050 * 1e18);
        assertEq(credToken.balanceOf(borrower), 4950 * 1e18);
        assertEq(credToken.balanceOf(address(escrow)), 0);
    }

    /**
     * @notice Scenario 3: Loan Default Workflow
     */
    function test_Scenario3_LoanDefaultWorkflow() public {
        uint256 loanAmount = 1000 * 1e18;
        uint256 duration = 30 days;

        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(
            loanAmount,
            200 * 1e18,
            duration,
            500,
            keccak256("ai-hash-default")
        );

        vm.prank(approver);
        governance.submitApproval(loanId);

        vm.prank(lender);
        loanManager.activateLoan(loanId);

        // Try marking default before deadline -> Reverts
        vm.expectRevert();
        loanManager.markDefault(loanId);

        // Warp past deadline
        vm.warp(block.timestamp + duration + 1 days);

        // Mark default succeeds
        loanManager.markDefault(loanId);
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.DEFAULTED));

        // Reputation reflects default (0% repaid -> score 0)
        assertEq(reputation.getReputationScore(borrower), 0);

        // Lender recovers the seized collateral; borrower keeps the principal
        assertEq(credToken.balanceOf(lender), 9200 * 1e18);
        assertEq(credToken.balanceOf(borrower), 5800 * 1e18);
        assertEq(credToken.balanceOf(address(escrow)), 0);
    }
}
