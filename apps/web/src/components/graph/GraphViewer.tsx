'use client';

import { useState, useCallback } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, Node, Edge,
  NodeProps, Handle, Position, useNodesState, useEdgesState, Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter } from 'lucide-react';
import type { GraphNode, GraphEdge } from '@/types';

const LANG_COLORS: Record<string, string> = {
  python: '#3b82f6', typescript: '#0070f3', javascript: '#f59e0b',
  go: '#10b981', rust: '#f97316', java: '#ef4444',
  kotlin: '#0070f3', csharp: '#06b6d4', ruby: '#dc2626', default: '#6b7280',
};

function ArchNode({ data, selected }: NodeProps) {
  const color = LANG_COLORS[data.language] ?? LANG_COLORS.default;
  return (
    <div style={{
      padding: '6px 10px', borderRadius: 4, cursor: 'pointer', minWidth: 90,
      background: selected ? `${color}18` : 'var(--bg-1, #0a0a0a)',
      border: `1px solid ${selected ? color : 'var(--border, #222)'}`,
      boxShadow: selected ? `0 0 12px ${color}30` : 'none',
      transition: 'all .15s',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: color, width: 5, height: 5, border: 'none' }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }}/>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono,monospace', color: selected ? color : '#666', fontWeight: selected ? 600 : 400, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.label}
        </span>
      </div>
      {data.hasTests && <div style={{ fontSize: 8, color: '#10b981', marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>✓ tested</div>}
      <Handle type="source" position={Position.Right} style={{ background: color, width: 5, height: 5, border: 'none' }}/>
    </div>
  );
}

const NODE_TYPES = { archNode: ArchNode };

interface Props { nodes: GraphNode[]; edges: GraphEdge[]; }

export function GraphViewer({ nodes: raw_nodes, edges: raw_edges }: Props) {
  const [nodes, , onNodesChange] = useNodesState(raw_nodes as Node[]);
  const [edges, , onEdgesChange] = useEdgesState(raw_edges as Edge[]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [langFilter, setLangFilter] = useState('');

  const langs = [...new Set(raw_nodes.map(n => n.data.language))].filter(Boolean).slice(0, 5);

  const displayed = langFilter
    ? nodes.map(n => ({ ...n, hidden: n.data.language !== langFilter }))
    : nodes;

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelected(prev => prev?.id === node.id ? null : node);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg, #000)' }}>
      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-1,#0a0a0a)', border: '1px solid var(--border,#222)', borderRadius: 6, padding: '4px 6px', alignItems: 'center' }}>
          <Filter size={11} style={{ color: 'var(--fg-4,#444)' }}/>
          {langs.map(l => (
            <button key={l} onClick={() => setLangFilter(langFilter === l ? '' : l)}
              style={{ padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontFamily: 'JetBrains Mono,monospace', background: langFilter === l ? (LANG_COLORS[l] ?? '#666') : 'transparent', color: langFilter === l ? '#fff' : 'var(--fg-3,#666)', transition: 'all .15s' }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ background: 'var(--bg-1,#0a0a0a)', border: '1px solid var(--border,#222)', borderRadius: 6, padding: '4px 10px', fontSize: 10, color: 'var(--fg-4,#444)', fontFamily: 'JetBrains Mono,monospace' }}>
          {raw_nodes.length} nodes · {raw_edges.length} edges
        </div>
      </div>

      <ReactFlow nodes={displayed} edges={edges} onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange} onNodeClick={onNodeClick}
        nodeTypes={NODE_TYPES} fitView minZoom={0.05} maxZoom={4}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ style: { stroke: '#222', strokeWidth: 1.5 }, type: 'smoothstep' }}>
        <Background color="#111" gap={32} size={1}/>
        <Controls showInteractive={false}/>
        <MiniMap nodeColor={n => LANG_COLORS[n.data?.language] ?? '#333'} maskColor="rgba(0,0,0,0.85)"/>

        {/* Node detail panel */}
        <Panel position="top-right">
          <AnimatePresence>
            {selected && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                style={{ background: 'var(--bg-1,#0a0a0a)', border: '1px solid var(--border,#222)', borderRadius: 8, padding: '14px 16px', width: 240, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg,#ededed)', fontFamily: 'JetBrains Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{selected.data.label}</span>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-4,#444)', display: 'flex', alignItems: 'center' }}><X size={12}/></button>
                </div>
                {[
                  ['Language', selected.data.language],
                  ['Lines', selected.data.lineCount],
                  ['Connections', selected.data.connections],
                  ['Tested', selected.data.hasTests ? 'Yes' : 'No'],
                ].map(([l, v]) => (
                  <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border,#222)' }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-3,#666)' }}>{l}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg,#ededed)', fontFamily: 'JetBrains Mono,monospace' }}>{v as string}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </ReactFlow>
    </div>
  );
}
