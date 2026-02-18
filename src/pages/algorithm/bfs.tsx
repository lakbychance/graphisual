import { Timer, Layers, Network, Search, Globe, Share2 } from "lucide-react";
import { AlgorithmLanding } from "@/components/AlgorithmLanding";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";

export const meta = {
  title: "BFS Visualizer — Breadth-First Search | Graphisual",
  description: "Visualize Breadth-First Search step by step. Build a graph, pick a starting node, and watch BFS explore every reachable node level by level.",
  ogDescription: "Visualize Breadth-First Search step by step. Build a graph and watch BFS explore nodes level by level.",
  canonical: `${BASE_URL}/algorithm/bfs`,
  ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "BFS Visualizer",
    title: "BFS Visualizer — Breadth-First Search | Graphisual",
    description: "Visualize Breadth-First Search step by step. Build a graph, pick a starting node, and watch BFS explore every reachable node level by level.",
    url: `${BASE_URL}/algorithm/bfs`,
    aboutName: "Breadth-first search",
    aboutDescription: "A graph traversal algorithm that explores all neighbors of a node before moving to the next level, visiting nodes in order of distance from the source.",
    sameAs: "https://en.wikipedia.org/wiki/Breadth-first_search",
    datePublished: "2026-02-15",
    faq: [
      { question: "What is Breadth-First Search?", answer: "Breadth-First Search (BFS) is a graph traversal algorithm that explores all neighbors of a node before moving to the next level. It uses a FIFO queue to visit nodes in order of their distance from the source, guaranteeing level-by-level exploration." },
      { question: "What is the time complexity of BFS?", answer: "BFS runs in O(V + E) time, where V is the number of vertices and E is the number of edges. Each vertex and edge is processed exactly once." },
      { question: "What is the difference between BFS and DFS?", answer: "BFS explores all neighbors at the current depth before going deeper (level by level), while DFS dives as deep as possible along each branch before backtracking. BFS uses a queue; DFS uses a stack." },
      { question: "Does BFS find the shortest path?", answer: "Yes, in unweighted graphs. Since BFS visits nodes in order of distance from the source, the first time it reaches any node is via the shortest path. For weighted graphs, use Dijkstra's algorithm instead." },
    ],
  }),
};

export default function BfsPage() {
  return (
    <AlgorithmLanding
      algorithmId="bfs"
      title="BFS Visualizer"
      subtitle="Visualize Breadth-First Search as it explores a graph level by level. Build your own graph, pick a starting node, and watch BFS visit every reachable node in order of distance."
      ctaText="Visualize BFS"
      howItWorks={{
        description: [
          "Breadth-First Search (BFS) is a graph traversal algorithm that explores all neighbors of a node before moving on to the next level of neighbors. It uses a queue to process nodes in the order they are discovered.",
          "BFS is guaranteed to visit nodes in order of their distance from the source, making it ideal for finding the shortest path in unweighted graphs. It was first described by Konrad Zuse in 1945 and later reinvented by Edward F. Moore in 1959.",
        ],
        steps: [
          "Start at the source node and mark it as visited",
          "Add the source node to a queue",
          "Dequeue the front node from the queue",
          "Visit all unvisited neighbors of the current node and add them to the queue",
          "Mark each newly discovered neighbor as visited",
          "Repeat until the queue is empty",
        ],
      }}
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O(V + E) where V is the number of vertices and E is the number of edges in the graph." },
        { icon: Layers, title: "Level-Order", description: "Visits nodes layer by layer — all nodes at distance 1 before distance 2, and so on." },
        { icon: Network, title: "Unweighted Shortest Path", description: "Finds the shortest path in unweighted graphs since it explores in order of distance from the source." },
        { icon: Search, title: "Queue-Based", description: "Uses a FIFO queue to ensure nodes are processed in the order they were discovered." },
      ]}
      useCases={[
        { icon: Globe, text: "Web crawlers — discovering pages level by level from a seed URL" },
        { icon: Share2, text: "Social networks — finding degrees of separation between users" },
        { icon: Network, text: "Network broadcasting — reaching all nodes in minimum hops" },
      ]}
      faq={[
        { question: "What is Breadth-First Search?", answer: "Breadth-First Search (BFS) is a graph traversal algorithm that explores all neighbors of a node before moving to the next level. It uses a FIFO queue to visit nodes in order of their distance from the source, guaranteeing level-by-level exploration." },
        { question: "What is the time complexity of BFS?", answer: "BFS runs in O(V + E) time, where V is the number of vertices and E is the number of edges. Each vertex and edge is processed exactly once." },
        { question: "What is the difference between BFS and DFS?", answer: "BFS explores all neighbors at the current depth before going deeper (level by level), while DFS dives as deep as possible along each branch before backtracking. BFS uses a queue; DFS uses a stack." },
        { question: "Does BFS find the shortest path?", answer: "Yes, in unweighted graphs. Since BFS visits nodes in order of distance from the source, the first time it reaches any node is via the shortest path. For weighted graphs, use Dijkstra's algorithm instead." },
      ]}
    />
  );
}
