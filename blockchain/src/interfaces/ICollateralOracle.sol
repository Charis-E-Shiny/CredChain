// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ICollateralOracle
 * @notice Interface for Chainlink price feed integration and collateral valuation
 * @dev Module 4 — Decentralized oracles
 */
interface ICollateralOracle {
    event PriceFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event StalenessPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    function getLatestPrice() external view returns (uint256 price, uint256 updatedAt);
    function getCollateralValueUSD(uint256 ethAmount) external view returns (uint256);
    function getLoanToValueRatio(uint256 loanAmountUSD, uint256 collateralETH) external view returns (uint256);
    function isCollateralSufficient(
        uint256 loanAmountUSD,
        uint256 collateralETH,
        uint256 requiredLTVBps
    ) external view returns (bool);
    function getRequiredCollateral(uint256 loanAmountUSD, uint256 ltvBps) external view returns (uint256);
}
