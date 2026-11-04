"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";
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
  ShieldCheck,
  Layers,
  Coins,
  TrendingUp,
  FileCheck2,
  Users,
  UserCheck,
  Briefcase,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { role, setRole, isAdmin, isApprover } = useRole();

  const borrowerNav = [
    { name: "Overview", href: "/borrower", icon: LayoutDashboard },
    { name: "AI Credit Assessment", href: "/credit-assessment", icon: BrainCircuit },
    { name: "Apply for Loan", href: "/apply-loan", icon: FilePlus2 },
    { name: "My Loans", href: "/borrower/loans", icon: Layers },
    { name: "Repayments", href: "/repayment", icon: Receipt },
    { name: "My Reputation", href: "/reputation", icon: Award },
    { name: "Credit Passport", href: "/credit-passport", icon: ShieldCheck },
  ];

  const lenderNav = [
    { name: "Overview", href: "/lender", icon: LayoutDashboard },
    { name: "Loan Marketplace", href: "/marketplace", icon: Store },
    { name: "My Investments", href: "/lender/investments", icon: Coins },
    { name: "Returns & Repayments", href: "/lender/returns", icon: Receipt },
    { name: "Transaction History", href: "/explorer", icon: Compass },
  ];

  const adminNav = [
    { name: "System Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Loan Approval Queue", href: "/admin/approvals", icon: FileCheck2 },
    { name: "Governance", href: "/governance", icon: Vote },
    { name: "Risk & Oracle Monitoring", href: "/admin/oracle", icon: TrendingUp },
    { name: "User & Role Management", href: "/admin/roles", icon: Users },
    { name: "Protocol Controls", href: "/admin/controls", icon: SlidersHorizontal },
    { name: "Contract Explorer", href: "/explorer", icon: Compass },
  ];

  const activeNav = role === "lender" ? lenderNav : role === "admin" ? adminNav : borrowerNav;

  const roleLabel =
    role === "lender" ? "Lender Experience" : role === "admin" ? "Admin & Governance" : "Borrower Experience";

  return (
    <aside className="w-64 border-r bg-card/40 backdrop-blur flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        {/* Role Selector in Sidebar */}
        <div className="p-2.5 rounded-xl border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Active Perspective</span>
            {role === "admin" && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                Verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold">
            <button
              onClick={() => setRole("borrower")}
              className={cn(
                "py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors",
                role === "borrower"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCheck className="h-3 w-3" />
              Borrower
            </button>

            <button
              onClick={() => setRole("lender")}
              className={cn(
                "py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors",
                role === "lender"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Briefcase className="h-3 w-3" />
              Lender
            </button>

            <button
              onClick={() => setRole("admin")}
              className={cn(
                "py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors",
                role === "admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground",
                !isAdmin && !isApprover && "opacity-60"
              )}
              title={!isAdmin && !isApprover ? "Requires on-chain admin role" : "Admin view"}
            >
              {isAdmin || isApprover ? <ShieldCheck className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              Admin
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>{roleLabel}</span>
          </div>

          {activeNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 rounded-xl border bg-muted/20 text-xs text-muted-foreground space-y-1.5">
        <div className="font-bold text-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
          Academic FinTech Protocol
        </div>
        <p className="leading-relaxed text-[11px]">
          Smart contracts enforce real state transitions. Connect an authorized wallet to interact with lending and governance.
        </p>
      </div>
    </aside>
  );
}
