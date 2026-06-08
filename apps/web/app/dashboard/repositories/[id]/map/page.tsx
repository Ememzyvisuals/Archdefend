"use client";

import { useCallback, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  X,
  GitBranch,
  Code2,
  Box,
  Zap,
  Database,
  Globe,
} from "lucide-react";
import { analysesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// ─── Node config ──────────────────────────────────────────────────────────────
const NODE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  module:       { icon: Box,       color: "#818cf8", bg: "rgba(99,102,241,0.12)" },
  class:        { icon: Code2,     color: "#c084fc", bg: "rgba(168,85,247,0.12)" },
  function:     { icon: Zap,       color: "#22d3ee", bg: "rgba(6,182,212,0.12)" },
  api_endpoint: { icon: Globe,     color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  database:     { icon: Database,  color: "#fb923c", bg: "rgba(249,115,22,0.12)" },
  service:      { icon: GitBranch, color: "#f472b6", bg: "rgba(236,72,153,0.12)" },
  external:     { icon: Globe,     color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

const NODE_TYPES_LIST = ["module", "class", "function", "api_endpoint", "database", "service", "external"];

// ─── Custom node ──────────────────────────────────────────────────────────────
function ArchNode({ data, selected }: any) {
  const cfg = NODE_CONFIG[data.type] || NODE_CONFIG.module;
  const Icon = cfg.icon;
  return (
    <div style={{
      background: "rgba(12,12,18,0.97)",
      border: `1px solid ${selected ? cfg.color : "rgba(255,255,255,0.1)"}`,
      borderRadius: 10,
      padding: "8px 12px",
      minWidth: 120,
      maxWidth: 180,
      boxShadow: selected
        ? `0 0 0 2px ${cfg.color}40, 0 4px 20px rgba(0,0,0,0.5)`
        : "0 2px 8px rgba(0,0,0,0.4)",
      transition: "all 0.15s ease",
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: cfg.color, width: 6, height: 6, border: "none", opacity: 0.7 }} />
      <div className="flex items-center gap-2 mb-1">
        <div style={{ background: cfg.bg, borderRadius: 5, padding: 3, display: "flex" }}>
          <Icon size={11} style={{ color: cfg.color }} />
        </div>
        <span style={{ fontSize: 10, color: cfg.color, fontFamily: "monospace",
          textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.8 }}>
          {data.type}
        </span>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.92)",
        marginBottom: 2, wordBreak: "break-word" }}>
        {data.name}
      </p>
      {data.language && (
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
          {data.language}
        </span>
      )}
      {data.file_path && (
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2,
          fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.file_path}
        </p>
      )}
      <Handle type="source" position={Position.Bottom}
        style={{ background: cfg.color, width: 6, height: 6, border: "none", opacity: 0.7 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { archNode: ArchNode };

// ─── Inspector ────────────────────────────────────────────────────────────────
function NodeInspector({ node, onClose }: { node: any; onClose: () => void }) {
  const cfg = NODE_CONFIG[node.data.type] || NODE_CONFIG.module;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute right-3 top-3 w-64 z-20 rounded-2xl p-4"
        style={{ background: "#0f0f14", border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Inspector</span>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={13} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div style={{ background: cfg.bg, borderRadius: 8, padding: 6 }}>
            <cfg.icon size={16} style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white truncate">{node.data.name}</p>
            <span className="text-xs" style={{ color: cfg.color }}>{node.data.type}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            ["Language", node.data.language],
            ["File", node.data.file_path],
            ["Lines", node.data.line_start
              ? `${node.data.line_start}–${node.data.line_end || node.data.line_start}`
              : null],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={String(k)}>
              <span className="text-[10px] text-white/30 block mb-0.5">{k}</span>
              <span className="text-xs text-white/70 font-mono break-all">{String(v)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ArchitectureMapPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(NODE_TYPES_LIST);
  const [showFilters, setShowFilters] = useState(false);

  const { data: graphData, isLoading } = useQuery({
    queryKey: ["graph", id],
    queryFn: () => analysesApi.graph(id, { limit: 500 }),
    enabled: !!id && isAuthenticated,
  });

  useEffect(() => {
    if (!graphData) return;

    const filtered = graphData.nodes.filter((n: any) => {
      const matchSearch = !search
        || n.data.name.toLowerCase().includes(search.toLowerCase())
        || n.data.file_path?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = activeFilters.includes(n.data.type);
      return matchSearch && matchFilter;
    });

    const filteredIds = new Set(filtered.map((n: any) => n.id));

    const filteredEdges = graphData.edges
      .filter((e: any) => filteredIds.has(e.source) && filteredIds.has(e.target))
      .map((e: any) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#4f46e5", width: 12, height: 12 },
        style: { stroke: "rgba(99,102,241,0.3)", strokeWidth: 1.5 },
        labelStyle: { fontSize: 9, fill: "rgba(255,255,255,0.3)" },
        labelBgStyle: { fill: "transparent" },
      }));

    setNodes(filtered);
    setEdges(filteredEdges);
  }, [graphData, search, activeFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  const onNodeClick = useCallback((_: any, node: any) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const toggleFilter = (type: string) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const typeCounts: Record<string, number> = {};
  graphData?.nodes.forEach((n: any) => {
    typeCounts[n.data.type] = (typeCounts[n.data.type] || 0) + 1;
  });

  return (
    <div className="h-screen flex flex-col bg-[#080810]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,10,18,0.95)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-white/30 hover:text-white/70 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder:text-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Filter size={12} /> Filters
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-white/30">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} edges</span>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="px-4 py-2 flex-shrink-0 flex flex-wrap gap-1.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,18,0.9)" }}>
          {NODE_TYPES_LIST.map((type) => {
            const cfg = NODE_CONFIG[type] || NODE_CONFIG.module;
            const active = activeFilters.includes(type);
            return (
              <button key={type} onClick={() => toggleFilter(type)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{
                  background: active ? cfg.bg : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? cfg.color + "50" : "rgba(255,255,255,0.08)"}`,
                  color: active ? cfg.color : "rgba(255,255,255,0.35)",
                }}>
                <cfg.icon size={10} />
                {type} {typeCounts[type] ? `(${typeCounts[type]})` : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-white/40">Loading architecture graph...</p>
            </div>
          </div>
        )}
        {!isLoading && nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <GitBranch size={32} className="mx-auto mb-3 text-white/15" />
              <p className="text-sm text-white/30">No nodes to display</p>
              <p className="text-xs text-white/20 mt-1">Adjust filters or run an analysis first</p>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1.5 }}
          minZoom={0.05}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1}
            color="rgba(99,102,241,0.12)" />
          <Controls style={{ background: "rgba(12,12,18,0.95)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }} />
          <MiniMap
            style={{ background: "rgba(12,12,18,0.95)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
            nodeColor={(node: Node) => NODE_CONFIG[(node.data as any)?.type]?.color || "#6366f1"}
            maskColor="rgba(0,0,0,0.4)"
          />
          <Panel position="bottom-left">
            <div className="rounded-xl p-3 mb-2"
              style={{ background: "rgba(10,10,18,0.95)",
                border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
              <p className="text-[10px] text-white/30 mb-2 uppercase tracking-widest font-medium">Legend</p>
              <div className="space-y-1.5">
                {Object.entries(NODE_CONFIG).slice(0, 5).map(([type, cfg]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ background: cfg.color }} />
                    <span className="text-[10px] text-white/40 capitalize">{type.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {selectedNode && (
          <NodeInspector node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}
