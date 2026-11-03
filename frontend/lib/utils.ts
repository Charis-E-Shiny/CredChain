import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTokenAmount(amount: bigint, decimals = 18, displayDecimals = 2): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, displayDecimals);
  return `${whole.toLocaleString()}.${fractionStr}`;
}

export function parseTokenAmount(amount: string, decimals = 18): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const loanStatusLabels: Record<number, string> = {
  0: "Requested",
  1: "Approved",
  2: "Active",
  3: "Repaid",
  4: "Defaulted",
  5: "Rejected",
  6: "Cancelled",
};

export const loanStatusColors: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  2: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  3: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  4: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  5: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  6: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-500",
};

export const riskCategoryColors: Record<string, string> = {
  "LOW": "text-green-600 bg-green-50 dark:bg-green-900/20",
  "MEDIUM": "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  "HIGH": "text-red-600 bg-red-50 dark:bg-red-900/20",
};
