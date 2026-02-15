import { Timer, Layers, Network, Search, Globe, Share2 } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function BfsLanding() {
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
    />
  );
}
