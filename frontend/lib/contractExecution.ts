import { createWalletClient, http } from "viem";
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
 * 1. If an active Wagmi wallet connector is present and connected, invokes Wagmi writeContractAsync.
 * 2. If no connector is connected, or if Wagmi throws ConnectorNotConnectedError,
 *    gracefully falls back to signing and broadcasting directly via the local node (Anvil/Ganache)
 *    using the role's authorized test account (Account 0 for Admin, Account 1 for Borrower, Account 2 for Lender).
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
  // Try Wagmi first if connected
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

      if (!isConnectorError) {
        // Legitimate contract revert or user rejection - don't mask it
        throw err;
      }
      console.warn("Wagmi connector not connected; executing via local node fallback with role:", role);
    }
  }

  // Fallback to local node
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
