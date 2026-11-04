"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia, hardhat } from "wagmi/chains";
import { defineChain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export const ganache = defineChain({
  id: 1337,
  name: "Ganache",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:7545"] },
  },
});

export const ganacheGui = defineChain({
  id: 5777,
  name: "Ganache GUI",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:7545"] },
  },
});

const config = createConfig({
  chains: [sepolia, hardhat, ganache, ganacheGui],
  transports: {
    [sepolia.id]: http(),
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [ganache.id]: http("http://127.0.0.1:7545"),
    [ganacheGui.id]: http("http://127.0.0.1:7545"),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000,
        refetchInterval: 10000,
      },
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
