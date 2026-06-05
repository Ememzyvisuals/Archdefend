import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + "..." : str;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 25%)`;
}

export function textColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 80%, 72%)`;
}

export function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    Python: "#3572A5", TypeScript: "#2b7489", JavaScript: "#f1e05a",
    Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", Ruby: "#701516",
    Swift: "#ffac45", Kotlin: "#A97BFF", "C++": "#f34b7d", C: "#555555",
    "C#": "#178600", PHP: "#4F5D95",
  };
  return colors[lang] || "#6366f1";
}

export function analysisStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: "Queued",
    cloning: "Cloning",
    parsing: "Parsing",
    graphing: "Building Graph",
    ai_processing: "AI Processing",
    completed: "Completed",
    failed: "Failed",
  };
  return labels[status] || status;
}

export function isAnalysisRunning(status?: string): boolean {
  return ["queued", "cloning", "parsing", "graphing", "ai_processing"].includes(status || "");
}

export function reportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    architecture_overview: "Architecture Overview",
    onboarding: "Onboarding Guide",
    interview_defense: "Interview Defense",
    dependency_analysis: "Dependency Analysis",
    scalability: "Scalability Report",
    technical_debt: "Technical Debt",
    security: "Security Audit",
  };
  return labels[type] || type.replace(/_/g, " ");
}
