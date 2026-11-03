// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/ICollateralOracle.sol";

/// @notice Minimal Chainlink Aggregator V3 Interface
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title CollateralOracle
 * @author CredChain Team — Member 4
 * @notice Integrates Chainlink price feeds for collateral valuation
 * @dev Module 4 — Decentralized oracles
 *
 * Retrieves ETH/USD price from a Chainlink aggregator, validates freshness,
 * and calculates collateral value and loan-to-value ratios.
 *
 * For testnet use: Sepolia ETH/USD feed at 0x694AA1769357215DE4FAC081bf1f309aDC325306
 *
 * Limitations:
 *   - Relies on Chainlink oracle availability
 *   - Staleness check uses a configurable period (default 1 hour)
 *   - Does not implement a fallback oracle (single point of failure)
 */
contract CollateralOracle is ICollateralOracle, AccessControl {
    /// @notice The Chainlink price feed
    AggregatorV3Interface public priceFeed;

    /// @notice Maximum allowed staleness period in seconds
    uint256 public stalenessPeriod;

    /// @notice Default staleness period: 1 hour
    uint256 public constant DEFAULT_STALENESS = 3600;

    // Errors
    error InvalidPrice();
    error StalePrice(uint256 updatedAt, uint256 currentTime);
    error ZeroAddress();
    error InvalidStalenessPeriod();

    constructor(address _priceFeed, address admin) {
        if (_priceFeed == address(0) || admin == address(0)) revert ZeroAddress();

        priceFeed = AggregatorV3Interface(_priceFeed);
        stalenessPeriod = DEFAULT_STALENESS;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ============================
    //  Configuration
    // ============================

    /**
     * @notice Update the Chainlink price feed address
     * @param newFeed New price feed address
     */
    function setPriceFeed(address newFeed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeed == address(0)) revert ZeroAddress();
        address oldFeed = address(priceFeed);
        priceFeed = AggregatorV3Interface(newFeed);
        emit PriceFeedUpdated(oldFeed, newFeed);
    }

    /**
     * @notice Update the staleness check period
     * @param newPeriod New staleness period in seconds
     */
    function setStalenessPeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newPeriod == 0) revert InvalidStalenessPeriod();
        uint256 oldPeriod = stalenessPeriod;
        stalenessPeriod = newPeriod;
        emit StalenessPeriodUpdated(oldPeriod, newPeriod);
    }

    // ============================
    //  Price Functions
    // ============================

    /**
     * @notice Get the latest validated ETH/USD price
     * @return price ETH price in USD with 8 decimals
     * @return updatedAt Timestamp of the last update
     */
    function getLatestPrice() public view returns (uint256 price, uint256 updatedAt) {
        (
            ,
            int256 answer,
            ,
            uint256 _updatedAt,
        ) = priceFeed.latestRoundData();

        // Validate price
        if (answer <= 0) revert InvalidPrice();

        // Check staleness
        if (block.timestamp - _updatedAt > stalenessPeriod) {
            revert StalePrice(_updatedAt, block.timestamp);
        }

        price = uint256(answer);
        updatedAt = _updatedAt;
    }

    /**
     * @notice Calculate the USD value of an ETH collateral amount
     * @param ethAmount Amount of ETH in wei (18 decimals)
     * @return USD value with 18 decimals
     */
    function getCollateralValueUSD(uint256 ethAmount) public view returns (uint256) {
        (uint256 price, ) = getLatestPrice();
        uint8 decimals = priceFeed.decimals(); // typically 8

        // ethAmount (18 dec) * price (8 dec) / 10^8 = USD value (18 dec)
        return (ethAmount * price) / (10 ** decimals);
    }

    /**
     * @notice Calculate the LTV ratio for a given loan and collateral
     * @param loanAmountUSD Loan amount in USD (18 decimals)
     * @param collateralETH Collateral in ETH (wei, 18 decimals)
     * @return LTV ratio in basis points (e.g., 7500 = 75%)
     */
    function getLoanToValueRatio(uint256 loanAmountUSD, uint256 collateralETH) public view returns (uint256) {
        uint256 collateralValue = getCollateralValueUSD(collateralETH);
        if (collateralValue == 0) return type(uint256).max;

        return (loanAmountUSD * 10000) / collateralValue;
    }

    /**
     * @notice Check if collateral is sufficient for a given loan
     * @param loanAmountUSD Loan amount in USD (18 decimals)
     * @param collateralETH Collateral in ETH (wei, 18 decimals)
     * @param requiredLTVBps Maximum allowed LTV in basis points
     * @return True if LTV <= required
     */
    function isCollateralSufficient(
        uint256 loanAmountUSD,
        uint256 collateralETH,
        uint256 requiredLTVBps
    ) external view returns (bool) {
        uint256 ltv = getLoanToValueRatio(loanAmountUSD, collateralETH);
        return ltv <= requiredLTVBps;
    }

    /**
     * @notice Calculate the required ETH collateral for a given loan and LTV
     * @param loanAmountUSD Loan amount in USD (18 decimals)
     * @param ltvBps Target LTV in basis points
     * @return Required ETH in wei
     */
    function getRequiredCollateral(uint256 loanAmountUSD, uint256 ltvBps) external view returns (uint256) {
        if (ltvBps == 0) return type(uint256).max;
        (uint256 price, ) = getLatestPrice();
        uint8 decimals = priceFeed.decimals();

        // requiredUSD = loanAmountUSD * 10000 / ltvBps
        // requiredETH = requiredUSD * 10^decimals / price
        uint256 requiredUSD = (loanAmountUSD * 10000) / ltvBps;
        return (requiredUSD * (10 ** decimals)) / price;
    }
}
