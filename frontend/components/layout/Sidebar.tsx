"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BrainCircuit,
  FilePlus2,
  Store,
  Receipt,
  Award,
  Vote,
  Compass,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Credit Assessment", href: "/credit-assessment", icon: BrainCircuit },
  { name: "Apply for Loan", href: "/apply-loan", icon: FilePlus2 },
  { name: "Loan Marketplace", href: "/marketplace", icon: Store },
  { name: "Repayments", href: "/repayment", icon: Receipt },
  { name: "Reputation", href: "/reputation", icon: Award },
  { name: "Governance", href: "/governance", icon: Vote },
  { name: "Explorer", href: "/explorer", icon: Compass },
  { name: "Admin", href: "/admin", icon: SlidersHorizontal },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-card/50 flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Core Platform
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-3 rounded-lg border bg-muted/40 text-xs text-muted-foreground space-y-1.5">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
          Academic FinTech Demo
        </div>
        <p className="leading-relaxed">
          Sepolia testnet only. Simulated financial data with real smart contract state machines.
        </p>
      </div>
    </aside>
  );
}
