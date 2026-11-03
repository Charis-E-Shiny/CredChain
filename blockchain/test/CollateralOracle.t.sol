// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CollateralOracle.sol";

contract MockAggregator is AggregatorV3Interface {
    uint8 public override decimals;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        answer = _initialAnswer;
        updatedAt = block.timestamp;
        roundId = 1;
    }

    function setAnswer(int256 _answer) external {
        answer = _answer;
        updatedAt = block.timestamp;
        roundId++;
    }

    function setUpdatedAt(uint256 _ts) external {
        updatedAt = _ts;
    }

    function latestRoundData() external view override returns (
        uint80 _roundId,
        int256 _answer,
        uint256 _startedAt,
        uint256 _updatedAt,
        uint80 _answeredInRound
    ) {
        return (roundId, answer, updatedAt, updatedAt, roundId);
    }
}

contract CollateralOracleTest is Test {
    CollateralOracle public oracle;
    MockAggregator public mockFeed;

    address public admin = makeAddr("admin");
    // $2,500.00 ETH price (8 decimals = 2500_00000000)
    int256 public constant INITIAL_PRICE = 2500_00000000;

    function setUp() public {
        mockFeed = new MockAggregator(8, INITIAL_PRICE);
        vm.prank(admin);
        oracle = new CollateralOracle(address(mockFeed), admin);
    }

    function test_GetLatestPrice_Valid() public view {
        (uint256 price, uint256 updatedAt) = oracle.getLatestPrice();
        assertEq(price, uint256(INITIAL_PRICE));
        assertEq(updatedAt, block.timestamp);
    }

    function test_StalePrice_Reverted() public {
        // Warp past staleness period (default 3600 seconds)
        vm.warp(block.timestamp + 3601);

        vm.expectRevert();
        oracle.getLatestPrice();
    }

    function test_InvalidNegativePrice_Reverted() public {
        mockFeed.setAnswer(-100);

        vm.expectRevert(CollateralOracle.InvalidPrice.selector);
        oracle.getLatestPrice();
    }

    function test_CollateralValueUSD_Calculation() public view {
        // 2 ETH at $2,500/ETH = $5,000 USD
        uint256 ethAmount = 2 * 1e18;
        uint256 usdValue = oracle.getCollateralValueUSD(ethAmount);

        assertEq(usdValue, 5000 * 1e18);
    }

    function test_LoanToValueRatio_Calculation() public view {
        // Loan $3,000 against 2 ETH ($5,000) -> LTV = 3000/5000 = 60.00% = 6000 bps
        uint256 loanUSD = 3000 * 1e18;
        uint256 ethCollateral = 2 * 1e18;

        uint256 ltv = oracle.getLoanToValueRatio(loanUSD, ethCollateral);
        assertEq(ltv, 6000);
    }

    function test_IsCollateralSufficient() public view {
        uint256 loanUSD = 3000 * 1e18;
        uint256 ethCollateral = 2 * 1e18;

        // Requires max 75% LTV (7500 bps) -> 60% <= 75% -> true
        assertTrue(oracle.isCollateralSufficient(loanUSD, ethCollateral, 7500));

        // Requires max 50% LTV (5000 bps) -> 60% <= 50% -> false
        assertFalse(oracle.isCollateralSufficient(loanUSD, ethCollateral, 5000));
    }

    function test_RequiredCollateral_Calculation() public view {
        // Loan $2,000 at 50% max LTV (5000 bps) -> Requires $4,000 collateral -> 1.6 ETH at $2500
        uint256 loanUSD = 2000 * 1e18;
        uint256 requiredETH = oracle.getRequiredCollateral(loanUSD, 5000);

        // $4000 / $2500 = 1.6 ETH = 1.6 * 1e18
        assertEq(requiredETH, 1.6 * 1e18);
    }

    function test_AdminUpdateStalenessPeriod() public {
        vm.prank(admin);
        oracle.setStalenessPeriod(7200);
        assertEq(oracle.stalenessPeriod(), 7200);
    }
}
