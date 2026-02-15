import { Timer, RefreshCw, GitBranch, Search, Network, AlertTriangle } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function CycleDetectionLanding() {
  return (
    <AlgorithmLanding
      algorithmId="cycle-detection"
      title="Cycle Detection Visualizer"
      subtitle="Visualize how cycle detection identifies loops in a graph. Build your own graph and watch the algorithm trace through nodes to find circular paths."
      ctaText="Visualize Cycle Detection"
      howItWorks={{
        description: [
          "Cycle detection determines whether a graph contains a cycle — a path that starts and ends at the same node. In directed graphs, this uses DFS with node coloring (white/gray/black) to detect back edges. In undirected graphs, a back edge to a visited node (other than the parent) indicates a cycle.",
          "Detecting cycles is fundamental in computer science: it prevents infinite loops in dependency resolution, validates DAG structures, and ensures correctness in scheduling algorithms.",
        ],
        steps: [
          "Start DFS from an unvisited node and mark it as in-progress (gray)",
          "Recursively visit each unvisited neighbor",
          "If a neighbor is already in-progress (gray), a cycle is detected via a back edge",
          "After processing all neighbors, mark the node as completed (black)",
          "If all neighbors are either unvisited or completed, no cycle through this path",
          "Repeat from the next unvisited node until all nodes are processed",
        ],
      }}
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O(V + E) where V is the number of vertices and E is the number of edges." },
        { icon: RefreshCw, title: "Back Edge Detection", description: "Identifies cycles by finding edges that point back to an ancestor in the DFS tree." },
        { icon: GitBranch, title: "DFS-Based", description: "Uses depth-first traversal with three-color marking to track node states during exploration." },
        { icon: Search, title: "Directed & Undirected", description: "Works on both directed and undirected graphs with slight variations in back edge detection." },
      ]}
      useCases={[
        { icon: AlertTriangle, text: "Deadlock detection — finding circular wait conditions in operating systems" },
        { icon: GitBranch, text: "Dependency validation — ensuring package dependencies form a DAG with no circular imports" },
        { icon: Network, text: "Workflow validation — verifying that task pipelines have no circular dependencies" },
      ]}
    />
  );
}
