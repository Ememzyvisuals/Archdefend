"use client";

import { motion } from "framer-motion";

// ─── Ringing Clock (Problem 01 - time waste) ─────────────────────────────────
export function AnimatedClock() {
  return (
    <div className="flex items-center justify-center h-full">
      <motion.div
        animate={{ rotate: [-8, 8, -6, 6, -4, 4, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
        className="relative"
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          {/* Clock face */}
          <circle cx="32" cy="34" r="22" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" fill="rgba(255,255,255,0.03)" />
          {/* Tick marks */}
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
            <line
              key={i}
              x1="32" y1="14"
              x2="32" y2={i % 3 === 0 ? "18" : "16"}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={i % 3 === 0 ? "2" : "1"}
              transform={`rotate(${deg} 32 34)`}
            />
          ))}
          {/* Hour hand */}
          <motion.line
            x1="32" y1="34" x2="32" y2="22"
            stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "32px 34px" }}
          />
          {/* Minute hand */}
          <motion.line
            x1="32" y1="34" x2="32" y2="16"
            stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "32px 34px" }}
          />
          {/* Center dot */}
          <circle cx="32" cy="34" r="2.5" fill="rgba(255,255,255,0.6)" />
          {/* Bell left */}
          <motion.g
            animate={{ rotate: [-20, 20, -15, 15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
            style={{ transformOrigin: "20px 12px" }}
          >
            <path d="M14 14 Q16 8 22 10" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />
          </motion.g>
          {/* Bell right */}
          <motion.g
            animate={{ rotate: [20, -20, 15, -15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
            style={{ transformOrigin: "44px 12px" }}
          >
            <path d="M50 14 Q48 8 42 10" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />
          </motion.g>
          {/* Alarm rings */}
          <motion.circle
            cx="32" cy="34" r="26"
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none"
            animate={{ r: [22, 30], opacity: [0.15, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.5 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── X Calendar (Problem 02 - consistency breaks) ────────────────────────────
export function AnimatedCalendar() {
  
  return (
    <div className="flex items-center justify-center h-full">
      <svg width="56" height="60" viewBox="0 0 56 60" fill="none">
        {/* Calendar body */}
        <rect x="4" y="10" width="48" height="46" rx="6" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="rgba(255,255,255,0.03)" />
        {/* Header */}
        <rect x="4" y="10" width="48" height="14" rx="6" fill="rgba(255,255,255,0.06)" />
        <rect x="4" y="18" width="48" height="6" fill="rgba(255,255,255,0.06)" />
        {/* Pins */}
        <rect x="16" y="4" width="4" height="10" rx="2" fill="rgba(255,255,255,0.3)" />
        <rect x="36" y="4" width="4" height="10" rx="2" fill="rgba(255,255,255,0.3)" />
        {/* X marks - animated in */}
        {[0,1,2,3,4,5].map((i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = 14 + col * 14;
          const y = 32 + row * 14;
          return (
            <motion.g key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.15, duration: 0.3, ease: "backOut", repeat: Infinity, repeatDelay: 3 }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              <line x1={x-4} y1={y-4} x2={x+4} y2={y+4} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1={x+4} y1={y-4} x2={x-4} y2={y+4} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Blinking Cursor / Writing (Problem 03 - context switching) ──────────────
export function AnimatedCursor() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-2.5">
        {/* Line 1 - being deleted */}
        <div className="flex items-center gap-2">
          <motion.div
            className="h-2 rounded-full bg-white/20"
            animate={{ width: [80, 50, 80, 40, 60] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
            className="w-0.5 h-4 bg-white/60"
          />
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, delay: 0.4, repeat: Infinity }}
            className="flex items-center"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 8H4M4 8L6 6M4 8L6 10" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </div>
        {/* Line 2 */}
        <div className="flex items-center gap-2">
          <motion.div
            className="h-2 rounded-full bg-white/15"
            animate={{ width: [100, 70, 100] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </div>
        {/* Line 3 - new content typing */}
        <div className="flex items-center gap-2">
          <motion.div
            className="h-2 rounded-full bg-white/10"
            animate={{ width: [0, 55, 30, 55] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", delay: 1 }}
            className="w-0.5 h-4 bg-white/40"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Growing Bars Chart (Problem 04 - complexity) ────────────────────────────
export function AnimatedBars() {
  const bars = [
    { delay: 0, heights: [20, 30, 25, 40] },
    { delay: 0.1, heights: [30, 40, 35, 55] },
    { delay: 0.2, heights: [15, 25, 20, 35] },
    { delay: 0.3, heights: [40, 50, 45, 60] },
    { delay: 0.4, heights: [10, 20, 15, 8] },
  ];

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-end gap-2 h-14">
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            className="w-4 rounded-t-sm"
            style={{ background: "rgba(255,255,255,0.18)" }}
            animate={{ height: bar.heights }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "mirror",
              delay: bar.delay,
              ease: "easeInOut",
            }}
          />
        ))}
        {/* Overflow indicator */}
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
          className="text-white/30 text-xs self-start"
        >
          ...
        </motion.div>
      </div>
    </div>
  );
}

// ─── Architecture Graph Animation (Hero/Solution) ────────────────────────────
export function AnimatedArchGraph() {
  const nodes = [
    { id: "api", label: "API", x: 160, y: 80, color: "#06b6d4" },
    { id: "auth", label: "Auth", x: 60, y: 160, color: "#818cf8" },
    { id: "db", label: "DB", x: 120, y: 230, color: "#10b981" },
    { id: "queue", label: "Queue", x: 260, y: 160, color: "#f59e0b" },
    { id: "ui", label: "UI", x: 260, y: 80, color: "#ec4899" },
  ];

  const edges = [
    { from: { x: 160, y: 80 }, to: { x: 60, y: 160 } },
    { from: { x: 160, y: 80 }, to: { x: 260, y: 160 } },
    { from: { x: 60, y: 160 }, to: { x: 120, y: 230 } },
    { from: { x: 160, y: 80 }, to: { x: 260, y: 80 } },
    { from: { x: 260, y: 160 }, to: { x: 120, y: 230 } },
  ];

  return (
    <svg width="320" height="280" viewBox="0 0 320 280" className="w-full">
      {/* Grid */}
      <defs>
        <pattern id="archgrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(99,102,241,0.06)" strokeWidth="0.5" />
        </pattern>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(99,102,241,0.4)" />
        </marker>
      </defs>
      <rect width="320" height="280" fill="url(#archgrid)" />

      {/* Edges */}
      {edges.map((e, i) => (
        <motion.line
          key={i}
          x1={e.from.x} y1={e.from.y}
          x2={e.to.x} y2={e.to.y}
          stroke="rgba(99,102,241,0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          markerEnd="url(#arrow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: i * 0.2 + 0.5, duration: 0.8 }}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.g
          key={node.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.15, duration: 0.4, type: "spring", bounce: 0.4 }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        >
          {/* Glow */}
          <motion.circle
            cx={node.x} cy={node.y} r="28"
            fill={node.color}
            opacity="0.06"
            animate={{ r: [24, 32, 24] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
          />
          {/* Node pill */}
          <rect
            x={node.x - 26} y={node.y - 14}
            width="52" height="28"
            rx="14"
            fill="rgba(15,15,20,0.95)"
            stroke={node.color}
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          <text
            x={node.x} y={node.y + 5}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="600"
            fontFamily="monospace"
          >
            {node.label}
          </text>
          {/* Pulse dot */}
          <motion.circle
            cx={node.x + 22} cy={node.y - 10} r="3"
            fill={node.color}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
        </motion.g>
      ))}
    </svg>
  );
}

// ─── Drift Detection Chart ────────────────────────────────────────────────────
export function AnimatedDriftChart() {
  return (
    <svg width="200" height="60" viewBox="0 0 200 60">
      <defs>
        <linearGradient id="driftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0,45 C20,42 40,35 60,30 C80,25 90,28 110,20 C130,12 140,35 160,22 C180,10 190,8 200,5"
        fill="none" stroke="#6366f1" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.path
        d="M0,45 C20,42 40,35 60,30 C80,25 90,28 110,20 C130,12 140,35 160,22 C180,10 190,8 200,5 L200,60 L0,60 Z"
        fill="url(#driftGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      />
    </svg>
  );
}
