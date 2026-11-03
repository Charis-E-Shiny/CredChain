import "./globals.css";
import { type Metadata } from "next";
import { Web3Provider } from "@/config/web3";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "CredChain — AI Decentralized Credit Scoring & Micro-Lending",
  description: "AI-powered decentralized credit scoring and micro-lending protocol built on Ethereum Sepolia with Chainlink Oracles.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Web3Provider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 p-6 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
