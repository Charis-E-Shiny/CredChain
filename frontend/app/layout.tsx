import "./globals.css";
import { type Metadata } from "next";
import { Web3Provider } from "@/config/web3";
import { RoleProvider } from "@/context/RoleContext";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "CredChain — Decentralized Credit & Lending",
  description: "Transparent, AI-assisted credit scoring and micro-lending on the blockchain.",
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
          <RoleProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 p-4 md:p-6 max-w-screen-2xl mx-auto w-full">
                {children}
              </main>
            </div>
          </RoleProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
