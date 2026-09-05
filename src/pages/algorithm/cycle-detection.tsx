import { Timer, RefreshCw, GitBranch, Search, Network, AlertTriangle } from "lucide-react";
import { AlgorithmLanding } from "@/components/AlgorithmLanding";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";

export const meta = {
  title: "Cycle Detection in Graphs — Explained & Visualized | Graphisual",
  description: "How to detect a cycle in a directed or undirected graph: DFS, back edges, and O(V+E) explained step by step — then try it in a free interactive visualizer.",
  ogDescription: "Cycle detection in directed and undirected graphs, explained and animated with DFS back-edge tracing.",
  canonical: `${BASE_URL}/algorithm/cycle-detection`,
  ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "Cycle Detection Visualizer",
    title: "Cycle Detection in Graphs — Explained & Visualized | Graphisual",
    description: "How to detect a cycle in a directed or undirected graph: DFS, back edges, and O(V+E) explained step by step — then try it in a free interactive visualizer.",
    url: `${BASE_URL}/algorithm/cycle-detection`,
    aboutName: "Cycle detection",
    aboutDescription: "Algorithms for detecting cycles in graphs, commonly using DFS with node coloring to identify back edges that indicate circular paths.",
    sameAs: "https://en.wikipedia.org/wiki/Cycle_(graph_theory)#Cycle_detection",
    datePublished: "2026-02-15",
    faq: [
      { question: "What is a cycle in a graph?", answer: "A cycle is a path in a graph that starts and ends at the same node, passing through at least one other node. In a directed graph, the edges must follow the direction; in an undirected graph, any closed path with at least three nodes forms a cycle." },
      { question: "How does DFS detect cycles?", answer: "DFS detects cycles using three-color marking. Nodes start as white (unvisited), turn gray (in progress) when first visited, and black (done) when fully processed. If DFS encounters a gray node, it means there's a back edge forming a cycle." },
      { question: "What is the difference between cycle detection in directed and undirected graphs?", answer: "In directed graphs, a cycle exists only when a back edge points to an ancestor in the DFS tree (a gray node). In undirected graphs, any edge to a visited node that isn't the direct parent indicates a cycle." },
      { question: "What is the time complexity of cycle detection?", answer: "DFS-based cycle detection runs in O(V + E) time, where V is the number of vertices and E is the number of edges. It visits each vertex and edge at most once." },
      { question: "How do you detect a cycle in a directed graph?", answer: "Run a DFS and track each node as unvisited, in-progress, or visited. If the traversal reaches a node that is already in-progress on the current recursion path, that back edge means a cycle exists. This runs in O(V + E) time. Undirected graphs need a different check — any visited neighbour other than the parent — because every undirected edge is a trivial \"back edge\"." },
    ],
  }),
};

export default function CycleDetectionPage() {
  return (
    <AlgorithmLanding
      algorithmId="cycle-detection"
      title="Cycle Detection in Graphs"
      subtitle="Learn how DFS finds cycles in directed and undirected graphs by spotting back edges — then build your own graph and watch it happen step by step. Free, no signup."
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
        { question: "How do you detect a cycle in a directed graph?", answer: "Run a DFS and track each node as unvisited, in-progress, or visited. If the traversal reaches a node that is already in-progress on the current recursion path, that back edge means a cycle exists. This runs in O(V + E) time. Undirected graphs need a different check — any visited neighbour other than the parent — because every undirected edge is a trivial \"back edge\"." },
      ]}
    />
  );
}
