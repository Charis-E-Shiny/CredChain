// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CredToken.sol";
import "../src/LoanManager.sol";
import "../src/LoanEscrow.sol";
import "../src/LoanGovernance.sol";
import "../src/CollateralOracle.sol";
import "../src/BorrowerReputation.sol";

/**
 * @title Deploy
 * @notice Deploys all CredChain contracts and configures permissions
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast --private-key <KEY>
 *
 * For local Anvil:
 *   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 */
contract Deploy is Script {
    // Sepolia Chainlink ETH/USD Price Feed
    address constant SEPOLIA_ETH_USD_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)); // Anvil default key[0]
        address deployer = vm.addr(deployerPrivateKey);

        // Determine price feed — use mock for local, real for Sepolia
        address priceFeed = block.chainid == 11155111 ? SEPOLIA_ETH_USD_FEED : address(0);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy CredToken
        CredToken credToken = new CredToken(deployer);
        console.log("CredToken deployed at:", address(credToken));

        // 2. Deploy LoanGovernance
        //    Standard loans: 1 approval, High-value (>5000 tokens): 2 approvals
        LoanGovernance governance = new LoanGovernance(
            deployer,
            1,                  // approvalThreshold
            5000 * 1e18,        // highValueThreshold
            2                   // highValueApprovalThreshold
        );
        console.log("LoanGovernance deployed at:", address(governance));

        // 3. Deploy BorrowerReputation
        BorrowerReputation reputation = new BorrowerReputation(deployer);
        console.log("BorrowerReputation deployed at:", address(reputation));

        // 4. Deploy LoanManager
        LoanManager loanManager = new LoanManager(deployer);
        console.log("LoanManager deployed at:", address(loanManager));

        // 5. Deploy LoanEscrow
        LoanEscrow escrow = new LoanEscrow(address(credToken), deployer);
        console.log("LoanEscrow deployed at:", address(escrow));

        // 6. Deploy CollateralOracle (deploy mock if local)
        CollateralOracle oracle;
        if (priceFeed != address(0)) {
            oracle = new CollateralOracle(priceFeed, deployer);
        } else {
            // Deploy a mock price feed for local testing
            MockV3Aggregator mockFeed = new MockV3Aggregator(8, 2000_00000000); // $2000
            oracle = new CollateralOracle(address(mockFeed), deployer);
            console.log("MockPriceFeed deployed at:", address(mockFeed));
        }
        console.log("CollateralOracle deployed at:", address(oracle));

        // === Configure Cross-Contract References ===

        // LoanManager needs escrow, governance, reputation
        loanManager.setContracts(address(escrow), address(governance), address(reputation));

        // LoanGovernance needs LoanManager
        governance.setLoanManager(address(loanManager));

        // Grant LoanManager the RECORDER_ROLE on BorrowerReputation
        reputation.grantRole(reputation.RECORDER_ROLE(), address(loanManager));

        // Grant LoanManager OPERATOR_ROLE on LoanEscrow
        escrow.grantRole(escrow.OPERATOR_ROLE(), address(loanManager));

        // Mint initial test tokens to deployer for testing
        credToken.mint(deployer, 10000 * 1e18);

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== CredChain Deployment Summary ===");
        console.log("Network Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("CredToken:", address(credToken));
        console.log("LoanManager:", address(loanManager));
        console.log("LoanEscrow:", address(escrow));
        console.log("LoanGovernance:", address(governance));
        console.log("CollateralOracle:", address(oracle));
        console.log("BorrowerReputation:", address(reputation));
    }
}

/**
 * @title MockV3Aggregator
 * @notice Simple Chainlink price feed mock for local testing
 */
contract MockV3Aggregator {
    uint8 public decimals;
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint80 public latestRound;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        latestAnswer = _initialAnswer;
        latestTimestamp = block.timestamp;
        latestRound = 1;
    }

    function updateAnswer(int256 _answer) external {
        latestAnswer = _answer;
        latestTimestamp = block.timestamp;
        latestRound++;
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (latestRound, latestAnswer, latestTimestamp, latestTimestamp, latestRound);
    }
}
