'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';
import type { GraphNode, GraphEdge } from '@/types';

const LANG_COLORS: Record<string, string> = {
  python:     '#3b82f6',
  typescript: '#a78bfa',
  javascript: '#f59e0b',
  go:         '#10b981',
  rust:       '#f97316',
  java:       '#ef4444',
  kotlin:     '#7c3aed',
  csharp:     '#06b6d4',
  ruby:       '#dc2626',
  php:        '#6366f1',
  default:    '#6b7280',
};

interface Props { nodes: GraphNode[]; edges: GraphEdge[]; }

interface RenderNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  language: string;
  isHub: boolean;
  inCycle: boolean;
  connections: number;
  hasTests: boolean;
  color: string;
  r: number;
}

interface RenderEdge {
  source: string;
  target: string;
  id: string;
}

export function GraphViewer({ nodes, edges }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const renderNodes = useRef<RenderNode[]>([]);
  const renderEdges = useRef<RenderEdge[]>([]);
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const dragging = useRef<{ node: RenderNode | null; panStart: { x: number; y: number } | null }>({ node: null, panStart: null });
  const [selected, setSelected] = useState<RenderNode | null>(null);
  const [langFilter, setLangFilter] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  const langs = [...new Set(nodes.map(n => n.data?.language || 'unknown').filter(Boolean))];

  // Build render nodes with force-directed positions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.offsetWidth || 900;
    const h = container.offsetHeight || 600;
    setDims({ w, h });

    const filtered = langFilter === 'all' ? nodes : nodes.filter(n => n.data?.language === langFilter);
    const nodeSet = new Set(filtered.map(n => n.id));

    // Build adjacency
    const adj: Record<string, Set<string>> = {};
    for (const n of filtered) adj[n.id] = new Set();
    for (const e of edges) {
      if (nodeSet.has(e.source) && nodeSet.has(e.target)) {
        adj[e.source]?.add(e.target);
        adj[e.target]?.add(e.source);
      }
    }

    // Detect clusters using BFS
    const visited = new Set<string>();
    const clusters: string[][] = [];
    for (const n of filtered) {
      if (visited.has(n.id)) continue;
      const cluster: string[] = [];
      const q = [n.id];
      while (q.length) {
        const cur = q.shift()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        cluster.push(cur);
        adj[cur]?.forEach(nb => !visited.has(nb) && q.push(nb));
      }
      clusters.push(cluster);
    }

    // Place cluster centers in a circle, nodes within cluster in smaller circles
    const clusterCenters: Record<string, { cx: number; cy: number }> = {};
    const angleStep = (2 * Math.PI) / Math.max(clusters.length, 1);
    const clusterRadius = Math.min(w, h) * 0.3;

    clusters.forEach((cluster, ci) => {
      const angle = ci * angleStep - Math.PI / 2;
      const cx = w / 2 + (clusters.length > 1 ? clusterRadius * Math.cos(angle) : 0);
      const cy = h / 2 + (clusters.length > 1 ? clusterRadius * Math.sin(angle) : 0);
      cluster.forEach(id => clusterCenters[id] = { cx, cy });
    });

    // Init render nodes with jittered positions
    renderNodes.current = filtered.map((n, i) => {
      const color = LANG_COLORS[n.data?.language || ''] || LANG_COLORS.default;
      const conns = (adj[n.id]?.size || 0);
      const r = n.data?.isHub ? 18 : Math.max(8, Math.min(16, 8 + conns * 1.5));
      const center = clusterCenters[n.id] || { cx: w / 2, cy: h / 2 };
      const jitter = () => (Math.random() - 0.5) * 120;
      return {
        id: n.id,
        x: center.cx + jitter(),
        y: center.cy + jitter(),
        vx: 0, vy: 0,
        label: (n.data?.label || n.id.split('.').pop() || n.id).slice(0, 20),
        language: n.data?.language || 'unknown',
        isHub: !!n.data?.isHub,
        inCycle: !!n.data?.inCycle,
        connections: conns,
        hasTests: !!n.data?.hasTests,
        color,
        r,
      };
    });

    renderEdges.current = edges
      .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
      .map(e => ({ source: e.source, target: e.target, id: e.id || `${e.source}-${e.target}` }));

    // Run force simulation for 200 iterations before first render
    const nodeMap: Record<string, RenderNode> = {};
    renderNodes.current.forEach(n => nodeMap[n.id] = n);
    for (let iter = 0; iter < 200; iter++) {
      simStep(renderNodes.current, renderEdges.current, nodeMap, w, h, 1 - iter / 200);
    }

    // Center the graph
    transform.current = { x: 0, y: 0, scale: 1 };
  }, [nodes, edges, langFilter]);

  function simStep(rNodes: RenderNode[], rEdges: RenderEdge[], nodeMap: Record<string, RenderNode>, w: number, h: number, alpha: number) {
    const k = Math.sqrt((w * h) / Math.max(rNodes.length, 1)) * 1.2;

    // Repulsion
    for (let i = 0; i < rNodes.length; i++) {
      rNodes[i].vx = 0; rNodes[i].vy = 0;
      for (let j = 0; j < rNodes.length; j++) {
        if (i === j) continue;
        const dx = rNodes[i].x - rNodes[j].x;
        const dy = rNodes[i].y - rNodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (k * k) / d * alpha * 0.8;
        rNodes[i].vx += (dx / d) * force;
        rNodes[i].vy += (dy / d) * force;
      }
    }

    // Attraction along edges
    for (const e of rEdges) {
      const s = nodeMap[e.source]; const t = nodeMap[e.target];
      if (!s || !t) continue;
      const dx = t.x - s.x; const dy = t.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = k * 0.8;
      const force = (d - ideal) / d * alpha * 0.5;
      s.vx += dx * force; s.vy += dy * force;
      t.vx -= dx * force; t.vy -= dy * force;
    }

    // Gravity toward center
    for (const n of rNodes) {
      n.vx += (w / 2 - n.x) * 0.02 * alpha;
      n.vy += (h / 2 - n.y) * 0.02 * alpha;
    }

    // Apply velocity with damping
    for (const n of rNodes) {
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      const maxSpeed = 8;
      if (speed > maxSpeed) { n.vx = (n.vx / speed) * maxSpeed; n.vy = (n.vy / speed) * maxSpeed; }
      n.x += n.vx * 0.85;
      n.y += n.vy * 0.85;
      n.x = Math.max(n.r + 20, Math.min(w - n.r - 20, n.x));
      n.y = Math.max(n.r + 20, Math.min(h - n.r - 20, n.y));
    }
  }

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = dims;
    canvas.width = w;
    canvas.height = h;

    const nodeMap: Record<string, RenderNode> = {};
    renderNodes.current.forEach(n => nodeMap[n.id] = n);

    let alpha = 0.5;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      ctx.save();
      ctx.translate(transform.current.x, transform.current.y);
      ctx.scale(transform.current.scale, transform.current.scale);

      // Draw edges first
      for (const e of renderEdges.current) {
        const s = nodeMap[e.source]; const t = nodeMap[e.target];
        if (!s || !t) continue;
        const isSelectedEdge = selected && (selected.id === e.source || selected.id === e.target);

        // Bezier curve for elegance
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2 - 20;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(mx, my, t.x, t.y);

        if (isSelectedEdge) {
          ctx.strokeStyle = `${s.color}80`;
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.06)';
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();

        // Arrow head
        if (isSelectedEdge) {
          const angle = Math.atan2(t.y - my, t.x - mx);
          const arrowSize = 6;
          ctx.beginPath();
          ctx.moveTo(t.x - arrowSize * Math.cos(angle - 0.4), t.y - arrowSize * Math.sin(angle - 0.4));
          ctx.lineTo(t.x - t.r * Math.cos(angle), t.y - t.r * Math.sin(angle));
          ctx.lineTo(t.x - arrowSize * Math.cos(angle + 0.4), t.y - arrowSize * Math.sin(angle + 0.4));
          ctx.strokeStyle = `${s.color}cc`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const n of renderNodes.current) {
        const isSelected = selected?.id === n.id;
        const isConnectedToSelected = selected && renderEdges.current.some(
          e => (e.source === selected.id && e.target === n.id) || (e.target === selected.id && e.source === n.id)
        );

        // Glow for hubs and selected
        if (n.isHub || isSelected) {
          const grad = ctx.createRadialGradient(n.x, n.y, n.r * 0.5, n.x, n.y, n.r * 3);
          grad.addColorStop(0, `${n.color}40`);
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);

        // Fill
        const fillGrad = ctx.createRadialGradient(n.x - n.r * 0.3, n.y - n.r * 0.3, 0, n.x, n.y, n.r);
        fillGrad.addColorStop(0, isSelected ? n.color : `${n.color}cc`);
        fillGrad.addColorStop(1, isSelected ? `${n.color}cc` : `${n.color}44`);
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Stroke
        ctx.strokeStyle = isSelected ? n.color : isConnectedToSelected ? `${n.color}80` : `${n.color}40`;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Cycle ring
        if (n.inCycle) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Test dot
        if (n.hasTests) {
          ctx.beginPath();
          ctx.arc(n.x + n.r * 0.7, n.y - n.r * 0.7, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#4ade80';
          ctx.fill();
        }

        // Label
        const opacity = isSelected ? 1 : isConnectedToSelected ? 0.9 : (selected ? 0.3 : 0.8);
        ctx.globalAlpha = opacity;
        ctx.font = `${n.isHub ? 600 : 400} ${n.isHub ? 11 : 9}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isSelected ? '#fff' : n.color;
        ctx.fillText(n.label, n.x, n.y + n.r + 12);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Continue simulation
      if (alpha > 0.01) {
        alpha *= 0.96;
        simStep(renderNodes.current, renderEdges.current, nodeMap, w, h, alpha);
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [dims, selected]);

  // Mouse interactions
  const getNodeAt = useCallback((ex: number, ey: number) => {
    const { x, y, scale } = transform.current;
    const wx = (ex - x) / scale;
    const wy = (ey - y) / scale;
    return renderNodes.current.find(n => {
      const dx = n.x - wx; const dy = n.y - wy;
      return Math.sqrt(dx * dx + dy * dy) <= n.r + 4;
    }) || null;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const node = getNodeAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    if (node) {
      dragging.current = { node, panStart: null };
    } else {
      dragging.current = { node: null, panStart: { x: e.clientX - transform.current.x, y: e.clientY - transform.current.y } };
    }
  }, [getNodeAt]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const node = getNodeAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    canvas.style.cursor = node ? 'pointer' : dragging.current.panStart ? 'grabbing' : 'grab';

    if (dragging.current.node) {
      const { x, y, scale } = transform.current;
      dragging.current.node.x = (e.nativeEvent.offsetX - x) / scale;
      dragging.current.node.y = (e.nativeEvent.offsetY - y) / scale;
    } else if (dragging.current.panStart) {
      transform.current.x = e.clientX - dragging.current.panStart.x;
      transform.current.y = e.clientY - dragging.current.panStart.y;
    }
  }, [getNodeAt]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragging.current.node) {
      const node = getNodeAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      if (node) setSelected(prev => prev?.id === node.id ? null : node);
    }
    dragging.current = { node: null, panStart: null };
  }, [getNodeAt]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(4, transform.current.scale * factor));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    transform.current.x = mx - (mx - transform.current.x) * (newScale / transform.current.scale);
    transform.current.y = my - (my - transform.current.y) * (newScale / transform.current.scale);
    transform.current.scale = newScale;
  }, []);

  const fitView = useCallback(() => {
    if (!renderNodes.current.length || !containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    const h = containerRef.current.offsetHeight;
    const xs = renderNodes.current.map(n => n.x);
    const ys = renderNodes.current.map(n => n.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const scaleX = (w - 80) / (maxX - minX || 1);
    const scaleY = (h - 80) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY, 2);
    transform.current = {
      x: w / 2 - ((minX + maxX) / 2) * scale,
      y: h / 2 - ((minY + maxY) / 2) * scale,
      scale,
    };
  }, []);

  if (!nodes.length) {
    return (
      <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#080808' }}>
        <p style={{ fontSize:14, color:'#444' }}>No dependency data available for this repository.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position:'relative', width:'100%', height:'100%', background:'#080808', overflow:'hidden' }}>
      <canvas ref={canvasRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onWheel={onWheel} style={{ display:'block', cursor:'grab' }}/>

      {/* Controls */}
      <div style={{ position:'absolute', bottom:20, right:20, display:'flex', flexDirection:'column', gap:6 }}>
        {[
          { icon: <ZoomIn size={14}/>,    action: () => { transform.current.scale = Math.min(4, transform.current.scale * 1.2); } },
          { icon: <ZoomOut size={14}/>,   action: () => { transform.current.scale = Math.max(0.2, transform.current.scale * 0.8); } },
          { icon: <Maximize2 size={14}/>, action: fitView },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action}
            style={{ width:32, height:32, borderRadius:6, background:'rgba(20,20,20,0.9)', border:'1px solid #222', color:'#888', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = '#222'; }}>
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Language filter */}
      <div style={{ position:'absolute', top:16, left:16, display:'flex', gap:6, flexWrap:'wrap', maxWidth:'70%' }}>
        <button onClick={() => setShowFilter(!showFilter)}
          style={{ display:'flex', alignItems:'center', gap:5, height:28, padding:'0 10px', borderRadius:6, background:'rgba(20,20,20,0.9)', border:'1px solid #222', color:'#666', fontSize:11, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
          <Filter size={11}/> Filter
        </button>
        {showFilter && ['all', ...langs].map(l => (
          <button key={l} onClick={() => setLangFilter(l)}
            style={{ height:28, padding:'0 10px', borderRadius:6, background: langFilter === l ? (LANG_COLORS[l] || '#333') + '33' : 'rgba(20,20,20,0.9)',
              border: `1px solid ${langFilter === l ? (LANG_COLORS[l] || '#666') : '#222'}`,
              color: langFilter === l ? (LANG_COLORS[l] || '#fff') : '#666', fontSize:11, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ position:'absolute', bottom:20, left:16, display:'flex', gap:12, fontFamily:'JetBrains Mono, monospace' }}>
        {[
          { label: `${renderNodes.current.length} nodes` },
          { label: `${renderEdges.current.length} edges` },
        ].map(s => (
          <span key={s.label} style={{ fontSize:10, color:'#333', padding:'3px 8px', background:'rgba(10,10,10,0.8)', borderRadius:4, border:'1px solid #1a1a1a' }}>{s.label}</span>
        ))}
      </div>

      {/* Legend */}
      <div style={{ position:'absolute', top:16, right:16, background:'rgba(10,10,10,0.9)', border:'1px solid #1a1a1a', borderRadius:8, padding:'10px 12px' }}>
        <div style={{ fontSize:9, color:'#333', fontFamily:'JetBrains Mono, monospace', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>Legend</div>
        {[
          { color:'#4ade80', label:'Tested',  dot: true },
          { color:'#f87171', label:'Circular dep', dashed: true },
          { color:'#fff',    label:'Hub node', big: true },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            {l.dashed
              ? <div style={{ width:14, height:2, borderTop:'1px dashed #f87171' }}/>
              : l.dot
                ? <div style={{ width:6, height:6, borderRadius:'50%', background:l.color }}/>
                : <div style={{ width:l.big ? 10 : 6, height:l.big ? 10 : 6, borderRadius:'50%', background:'rgba(255,255,255,0.4)', border:'1px solid #666' }}/>
            }
            <span style={{ fontSize:9, color:'#444', fontFamily:'JetBrains Mono, monospace' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Selected node panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
            style={{ position:'absolute', top:60, right:16, width:220, background:'rgba(10,10,10,0.95)', border:`1px solid ${selected.color}40`, borderRadius:10, padding:16 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:selected.color, flexShrink:0 }}/>
                <span style={{ fontSize:12, fontWeight:600, color:'#fff', fontFamily:'JetBrains Mono, monospace', wordBreak:'break-all' }}>{selected.label}</span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', padding:2, flexShrink:0 }}><X size={12}/></button>
            </div>
            {[
              { label:'Language',    value: selected.language },
              { label:'Connections', value: String(selected.connections) },
              { label:'Type',        value: selected.isHub ? 'Hub node' : 'Module' },
              { label:'Tests',       value: selected.hasTests ? '✓ Yes' : '✗ No' },
              { label:'Cycle',       value: selected.inCycle ? '⚠ Yes' : 'No' },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color:'#444', fontFamily:'JetBrains Mono, monospace' }}>{row.label}</span>
                <span style={{ color: row.value.startsWith('⚠') ? '#f87171' : row.value.startsWith('✓') ? '#4ade80' : selected.color, fontFamily:'JetBrains Mono, monospace', fontWeight:500 }}>{row.value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
