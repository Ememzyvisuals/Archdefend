"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export function Logo({ className, size = 32, showText = true, textClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Shield outline */}
        <path
          d="M50 5L90 22V52C90 72 72 87 50 97C28 87 10 72 10 52V22L50 5Z"
          stroke="url(#shield-gradient)"
          strokeWidth="6"
          fill="none"
          strokeLinejoin="round"
        />
        {/* Inner structure lines */}
        <line x1="50" y1="5" x2="50" y2="97" stroke="url(#line-gradient)" strokeWidth="3" opacity="0.6" />
        <line x1="10" y1="52" x2="90" y2="52" stroke="url(#line-gradient)" strokeWidth="3" opacity="0.6" />
        <line x1="50" y1="52" x2="28" y2="80" stroke="url(#line-gradient)" strokeWidth="3" opacity="0.4" />
        <line x1="50" y1="52" x2="72" y2="80" stroke="url(#line-gradient)" strokeWidth="3" opacity="0.4" />
        {/* Nodes */}
        <circle cx="50" cy="52" r="7" fill="url(#node-gradient)" />
        <circle cx="50" cy="52" r="7" fill="url(#glow-gradient)" opacity="0.6" />
        <circle cx="30" cy="42" r="4" fill="#22d3ee" opacity="0.9" />
        <circle cx="70" cy="42" r="4" fill="#22d3ee" opacity="0.9" />
        <circle cx="30" cy="62" r="4" fill="#22d3ee" opacity="0.9" />
        <circle cx="70" cy="62" r="4" fill="#22d3ee" opacity="0.9" />
        {/* Connector lines from center to nodes */}
        <line x1="50" y1="52" x2="30" y2="42" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
        <line x1="50" y1="52" x2="70" y2="42" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
        <line x1="50" y1="52" x2="30" y2="62" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
        <line x1="50" y1="52" x2="70" y2="62" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
        <line x1="50" y1="52" x2="50" y2="25" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />

        <defs>
          <linearGradient id="shield-gradient" x1="10" y1="5" x2="90" y2="97" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7c3aed" />
            <stop offset="0.5" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818cf8" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
          <radialGradient id="node-gradient" cx="50%" cy="50%" r="50%">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#06b6d4" />
          </radialGradient>
          <radialGradient id="glow-gradient" cx="50%" cy="50%" r="50%">
            <stop stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {showText && (
        <span
          className={cn(
            "font-bold text-white tracking-tight",
            textClassName
          )}
          style={{ fontSize: size * 0.6 }}
        >
          ArchDefend
        </span>
      )}
    </div>
  );
}
