import { createWalletClient, http, custom } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil, ganache } from "@/config/web3";
import { chainConfig } from "@/config/contracts";

export const ANVIL_ACCOUNTS = {
  admin: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`,
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`,
    roleLabel: "Governance Admin (Approver)",
  },
  borrower: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`,
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as `0x${string}`,
    roleLabel: "Demo Borrower",
  },
  lender: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`,
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as `0x${string}`,
    roleLabel: "Demo Liquidity Provider",
  },
} as const;

export type ContractRole = keyof typeof ANVIL_ACCOUNTS;

export interface WriteContractParams {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
  value?: bigint;
}

export function getLocalRpcUrl(): string {
  if (process.env.NEXT_PUBLIC_LOCAL_RPC_URL) {
    return process.env.NEXT_PUBLIC_LOCAL_RPC_URL;
  }
  if (chainConfig.chainId === 1337 || chainConfig.chainId === 5777) {
    return "http://127.0.0.1:7545";
  }
  return "http://127.0.0.1:8545";
}

/**
 * Executes a smart contract write transaction.
 * Priority 1: If Wagmi connector is already connected, executes through Wagmi -> Prompts MetaMask modal.
 * Priority 2: If MetaMask (window.ethereum) is installed in browser, requests connection and executes via custom provider -> Prompts MetaMask modal.
 * Priority 3: Only if NO Web3 extension is available in browser (e.g., pure headless / demo without extension), executes directly on local node.
 */
export async function executeContractWithFallback({
  params,
  role = "admin",
  isConnected = false,
  writeContractAsync,
}: {
  params: WriteContractParams;
  role?: ContractRole;
  isConnected?: boolean;
  writeContractAsync?: (args: any) => Promise<`0x${string}`>;
}): Promise<`0x${string}`> {
  // 1. Try Wagmi writeContractAsync if already connected
  if (isConnected && writeContractAsync) {
    try {
      const hash = await writeContractAsync({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        value: params.value,
      });
      return hash;
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isConnectorError =
        msg.includes("Connector not connected") ||
        msg.includes("ConnectorNotConnectedError") ||
        err?.name === "ConnectorNotConnectedError";

      // If user actively rejected transaction in MetaMask, stop and rethrow
      if (msg.includes("User rejected") || msg.includes("user rejected") || err?.code === 4001) {
        throw new Error("Transaction was rejected in MetaMask.");
      }

      if (!isConnectorError) {
        throw err;
      }
      console.warn("Wagmi connector not actively connected; attempting direct browser provider (window.ethereum)...");
    }
  }

  // 2. If MetaMask is installed in the browser window, ALWAYS prompt MetaMask!
  if (typeof window !== "undefined" && (window as any).ethereum) {
    try {
      const ethereum = (window as any).ethereum;

      // Ensure MetaMask is connected and requesting account
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts && accounts.length > 0) {
        const userAccount = accounts[0] as `0x${string}`;

        // Ensure user is on local network if on Anvil (Chain ID 31337 = 0x7a69)
        if (chainConfig.chainId === 31337) {
          try {
            await ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x7a69" }],
            });
          } catch (switchErr: any) {
            if (switchErr.code === 4902) {
              await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x7a69",
                    chainName: "Anvil Local",
                    rpcUrls: ["http://127.0.0.1:8545"],
                    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  },
                ],
              });
            }
          }
        }

        const client = createWalletClient({
          account: userAccount,
          chain: (chainConfig.chainId === 1337 || chainConfig.chainId === 5777) ? ganache : anvil,
          transport: custom(ethereum),
        });

        // This prompts MetaMask modal!
        const hash = await client.writeContract({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args as any,
          value: params.value,
        });

        return hash;
      }
    } catch (err: any) {
      const msg = String(err?.message || "");
      // If user clicked Reject in MetaMask, respect their choice
      if (
        msg.includes("User rejected") ||
        msg.includes("user rejected") ||
        err?.code === 4001 ||
        err?.name === "UserRejectedRequestError"
      ) {
        throw new Error("Transaction was rejected in MetaMask.");
      }
      console.warn("MetaMask direct prompt failed:", err);
      // If it's a real contract error, rethrow
      if (!msg.includes("not supported") && !msg.includes("failed to fetch")) {
        throw err;
      }
    }
  }

  // 3. Fallback only if no Web3 wallet extension is installed
  const rpcUrl = getLocalRpcUrl();
  const accountInfo = ANVIL_ACCOUNTS[role] || ANVIL_ACCOUNTS.admin;
  const account = privateKeyToAccount(accountInfo.privateKey);
  const chain = (chainConfig.chainId === 1337 || chainConfig.chainId === 5777) ? ganache : anvil;

  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  try {
    const hash = await client.writeContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args as any,
      value: params.value,
    });
    return hash;
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      throw new Error(
        `Local blockchain node is unreachable at ${rpcUrl}. Start Anvil (port 8545) or connect MetaMask to proceed.`
      );
    }
    throw err;
  }
}
