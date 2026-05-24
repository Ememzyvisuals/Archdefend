"""
ArchDefend — Graph Engine
Builds directed dependency graphs from parsed AST data using NetworkX.
"""

import asyncio
import logging
from collections import defaultdict
from typing import Optional

logger = logging.getLogger(__name__)


class GraphBuilder:
    """
    Builds and analyzes dependency graphs from parser output.
    Uses NetworkX for graph algorithms (centrality, cycles, clustering).
    """

    async def build_graph(self, parse_result: dict) -> dict:
        """
        Build full dependency graph from parser output.
        Returns graph data with nodes, edges, and analytics.
        """
        try:
            import networkx as nx
        except ImportError:
            logger.warning("NetworkX not installed — returning basic graph")
            return parse_result.get("import_graph", {"nodes": [], "edges": []})

        import_graph = parse_result.get("import_graph", {})
        raw_nodes = import_graph.get("nodes", [])
        raw_edges = import_graph.get("edges", [])

        if not raw_nodes:
            return {"nodes": [], "edges": [], "analytics": {}}

        # Build NetworkX directed graph
        G = nx.DiGraph()

        for node in raw_nodes:
            G.add_node(node["id"], **{k: v for k, v in node.items() if k != "id"})

        for edge in raw_edges:
            if edge["source"] in G and edge["target"] in G:
                G.add_edge(edge["source"], edge["target"])

        # Graph analytics
        analytics = await self._compute_analytics(G)

        # Find critical paths and highly connected nodes
        hub_nodes = sorted(
            G.nodes(),
            key=lambda n: G.in_degree(n) + G.out_degree(n),
            reverse=True,
        )[:10]

        # Detect cycles (circular dependencies)
        try:
            cycles = list(nx.simple_cycles(G))[:5]
        except Exception:
            cycles = []

        # Identify weakly connected components
        components = list(nx.weakly_connected_components(G))

        # Compute PageRank for node importance
        try:
            pagerank = nx.pagerank(G, alpha=0.85)
        except Exception:
            pagerank = {n: 1.0 / len(G.nodes()) for n in G.nodes()}

        # Enrich node data with graph metrics
        enriched_nodes = []
        for node_id in G.nodes():
            node_data = dict(G.nodes[node_id])
            enriched_nodes.append({
                "id": node_id,
                "path": node_data.get("path", ""),
                "language": node_data.get("language", "unknown"),
                "line_count": node_data.get("line_count", 0),
                "has_tests": node_data.get("has_tests", False),
                "in_degree": G.in_degree(node_id),
                "out_degree": G.out_degree(node_id),
                "pagerank": round(pagerank.get(node_id, 0), 4),
                "is_hub": node_id in hub_nodes,
                "is_in_cycle": any(node_id in cycle for cycle in cycles),
            })

        return {
            "nodes": enriched_nodes,
            "edges": raw_edges,
            "analytics": analytics,
            "hub_nodes": hub_nodes[:5],
            "circular_dependencies": [list(c) for c in cycles],
            "component_count": len(components),
        }

    async def _compute_analytics(self, G) -> dict:
        """Compute graph-level analytics."""
        import networkx as nx

        if len(G.nodes()) == 0:
            return {}

        try:
            density = nx.density(G)
            avg_in_degree = sum(d for _, d in G.in_degree()) / max(1, len(G.nodes()))
            avg_out_degree = sum(d for _, d in G.out_degree()) / max(1, len(G.nodes()))

            # Most connected nodes
            most_depended_on = sorted(G.nodes(), key=lambda n: G.in_degree(n), reverse=True)[:3]
            most_dependencies = sorted(G.nodes(), key=lambda n: G.out_degree(n), reverse=True)[:3]

            return {
                "node_count": len(G.nodes()),
                "edge_count": len(G.edges()),
                "density": round(density, 4),
                "avg_in_degree": round(avg_in_degree, 2),
                "avg_out_degree": round(avg_out_degree, 2),
                "most_depended_on": most_depended_on,
                "most_dependencies": most_dependencies,
                "is_dag": nx.is_directed_acyclic_graph(G),
            }
        except Exception as e:
            logger.warning(f"Analytics computation error: {e}")
            return {"node_count": len(G.nodes()), "edge_count": len(G.edges())}


# Singleton
graph_builder = GraphBuilder()
