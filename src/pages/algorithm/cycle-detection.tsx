import { Timer, RefreshCw, GitBranch, Search, Network, AlertTriangle } from "lucide-react";
import { AlgorithmLanding } from "@/components/AlgorithmLanding";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";

export const meta = {
  route: "algorithm/cycle-detection",
  title: "Cycle Detection Visualizer | Graphisual",
  description: "Visualize cycle detection in graphs step by step. Build a graph and watch the algorithm identify circular paths using DFS-based back edge detection.",
  ogDescription: "Visualize cycle detection in graphs step by step. Watch the algorithm identify circular paths using DFS.",
  canonical: `${BASE_URL}/algorithm/cycle-detection`,
  ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "Cycle Detection Visualizer",
    title: "Cycle Detection Visualizer | Graphisual",
    description: "Visualize cycle detection in graphs step by step. Build a graph and watch the algorithm identify circular paths using DFS-based back edge detection.",
    url: `${BASE_URL}/algorithm/cycle-detection`,
    aboutName: "Cycle detection",
    aboutDescription: "Algorithms for detecting cycles in graphs, commonly using DFS with node coloring to identify back edges that indicate circular paths.",
    sameAs: "https://en.wikipedia.org/wiki/Cycle_(graph_theory)#Cycle_detection",
    faq: [
      { question: "What is a cycle in a graph?", answer: "A cycle is a path in a graph that starts and ends at the same node, passing through at least one other node. In a directed graph, the edges must follow the direction; in an undirected graph, any closed path with at least three nodes forms a cycle." },
      { question: "How does DFS detect cycles?", answer: "DFS detects cycles using three-color marking. Nodes start as white (unvisited), turn gray (in progress) when first visited, and black (done) when fully processed. If DFS encounters a gray node, it means there's a back edge forming a cycle." },
      { question: "What is the difference between cycle detection in directed and undirected graphs?", answer: "In directed graphs, a cycle exists only when a back edge points to an ancestor in the DFS tree (a gray node). In undirected graphs, any edge to a visited node that isn't the direct parent indicates a cycle." },
      { question: "What is the time complexity of cycle detection?", answer: "DFS-based cycle detection runs in O(V + E) time, where V is the number of vertices and E is the number of edges. It visits each vertex and edge at most once." },
    ],
  }),
};

export default function CycleDetectionPage() {
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
      faq={[
        { question: "What is a cycle in a graph?", answer: "A cycle is a path in a graph that starts and ends at the same node, passing through at least one other node. In a directed graph, the edges must follow the direction; in an undirected graph, any closed path with at least three nodes forms a cycle." },
        { question: "How does DFS detect cycles?", answer: "DFS detects cycles using three-color marking. Nodes start as white (unvisited), turn gray (in progress) when first visited, and black (done) when fully processed. If DFS encounters a gray node, it means there's a back edge forming a cycle." },
        { question: "What is the difference between cycle detection in directed and undirected graphs?", answer: "In directed graphs, a cycle exists only when a back edge points to an ancestor in the DFS tree (a gray node). In undirected graphs, any edge to a visited node that isn't the direct parent indicates a cycle." },
        { question: "What is the time complexity of cycle detection?", answer: "DFS-based cycle detection runs in O(V + E) time, where V is the number of vertices and E is the number of edges. It visits each vertex and edge at most once." },
      ]}
    />
  );
}
