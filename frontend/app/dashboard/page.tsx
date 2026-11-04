"use client";

import { useRole } from "@/context/RoleContext";
import BorrowerDashboardPage from "@/app/borrower/page";
import LenderDashboardPage from "@/app/lender/page";
import AdminDashboardPage from "@/app/admin/page";

export default function DashboardPage() {
  const { role } = useRole();

  if (role === "lender") {
    return <LenderDashboardPage />;
  }

  if (role === "admin") {
    return <AdminDashboardPage />;
  }

  return <BorrowerDashboardPage />;
}
