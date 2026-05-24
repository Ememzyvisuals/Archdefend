"""
ArchDefend — Graph Engine
Builds directed dependency graph with NetworkX.
Computes PageRank, detects cycles, identifies hub nodes.
Converts to React Flow format for the frontend.
"""
import logging
from collections import defaultdict

logger = logging.getLogger("archdefend.graph")

LANG_COLORS = {
    "python": "#3B82F6", "typescript": "#A78BFA",
    "javascript": "#F59E0B", "go": "#10B981",
    "rust": "#F97316", "java": "#EF4444",
    "kotlin": "#7C3AED", "csharp": "#06B6D4",
    "ruby": "#DC2626", "php": "#6366F1",
}


class GraphBuilder:
    async def build_graph(self, parse_result: dict) -> dict:
        raw = parse_result.get("import_graph", {"nodes": [], "edges": []})
        nodes = raw.get("nodes", [])
        edges = raw.get("edges", [])

        if not nodes:
            return {"nodes": [], "edges": [], "analytics": {}}

        try:
            import networkx as nx
        except ImportError:
            logger.warning("NetworkX not installed — returning raw graph")
            return self._react_flow(nodes, edges, {})

        G = nx.DiGraph()
        for n in nodes:
            G.add_node(n["id"], **{k: v for k, v in n.items() if k != "id"})
        for e in edges:
            if e["source"] in G and e["target"] in G:
                G.add_edge(e["source"], e["target"])

        # Analytics
        try:
            pagerank = nx.pagerank(G, alpha=0.85, max_iter=200)
        except Exception:
            pagerank = {n: 1 / max(len(G), 1) for n in G.nodes()}

        try:
            cycles = [list(c) for c in list(nx.simple_cycles(G))[:5]]
        except Exception:
            cycles = []

        in_cycle = {n for c in cycles for n in c}
        hub_nodes = sorted(G.nodes(), key=lambda n: G.in_degree(n) + G.out_degree(n), reverse=True)[:10]

        analytics = {
            "node_count": G.number_of_nodes(),
            "edge_count": G.number_of_edges(),
            "density": round(nx.density(G), 5),
            "is_dag": nx.is_directed_acyclic_graph(G),
            "circular_deps": len(cycles),
            "hub_nodes": hub_nodes[:5],
            "avg_degree": round(
                sum(G.in_degree(n) + G.out_degree(n) for n in G.nodes()) / max(1, G.number_of_nodes()), 2
            ),
        }

        enriched = []
        for nid in G.nodes():
            data = dict(G.nodes[nid])
            enriched.append({
                **data, "id": nid,
                "in_degree": G.in_degree(nid),
                "out_degree": G.out_degree(nid),
                "pagerank": round(pagerank.get(nid, 0), 5),
                "is_hub": nid in hub_nodes,
                "is_in_cycle": nid in in_cycle,
            })

        rf = self._react_flow(enriched, edges, pagerank)
        rf["analytics"] = analytics
        rf["circular_dependencies"] = cycles
        return rf

    def _react_flow(self, nodes: list, edges: list, pagerank: dict) -> dict:
        """Convert to React Flow node/edge format. Top 60 nodes by connectivity."""
        conn = defaultdict(int)
        for e in edges:
            conn[e["source"]] += 1
            conn[e["target"]] += 1

        top = sorted(nodes, key=lambda n: conn.get(n["id"], 0) + pagerank.get(n["id"], 0) * 100, reverse=True)[:60]
        top_ids = {n["id"] for n in top}

        rf_nodes = []
        for i, n in enumerate(top):
            lang = n.get("language", "unknown")
            row, col = divmod(i, 8)
            rf_nodes.append({
                "id": n["id"],
                "type": "archNode",
                "position": {"x": col * 170, "y": row * 110},
                "data": {
                    "label": n["id"].split(".")[-1] or n["id"],
                    "fullPath": n.get("path", ""),
                    "language": lang,
                    "lineCount": n.get("line_count", 0),
                    "hasTests": n.get("has_tests", False),
                    "color": LANG_COLORS.get(lang, "#6B7280"),
                    "connections": conn.get(n["id"], 0),
                    "isHub": n.get("is_hub", False),
                    "inCycle": n.get("is_in_cycle", False),
                },
            })

        rf_edges = [
            {"id": f"e-{e['source']}-{e['target']}", "source": e["source"], "target": e["target"], "animated": True, "type": "smoothstep"}
            for e in edges
            if e["source"] in top_ids and e["target"] in top_ids
        ][:200]

        return {"nodes": rf_nodes, "edges": rf_edges}


graph_builder = GraphBuilder()
