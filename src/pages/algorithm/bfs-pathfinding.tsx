import { Timer, Layers, Route, Search, Globe, Network } from "lucide-react";
import { AlgorithmLanding } from "@/components/AlgorithmLanding";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";


export const meta = {
  route: "algorithm/bfs-pathfinding",
  title: "BFS Pathfinding Visualizer | Graphisual",
  description: "Visualize BFS pathfinding to find the shortest path in an unweighted graph. Select source and destination nodes, then watch BFS discover the optimal route.",
  ogDescription: "Visualize BFS pathfinding to find the shortest path in an unweighted graph. Watch BFS discover the optimal route.",
  canonical: `${BASE_URL}/algorithm/bfs-pathfinding`,
    ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "BFS Pathfinding Visualizer",
    title: "BFS Pathfinding Visualizer | Graphisual",
    description: "Visualize BFS pathfinding to find the shortest path in an unweighted graph. Select source and destination nodes, then watch BFS discover the optimal route.",
    url: `${BASE_URL}/algorithm/bfs-pathfinding`,
    aboutName: "BFS shortest path",
    aboutDescription: "Using Breadth-First Search to find the shortest path between two nodes in an unweighted graph by exploring nodes in order of distance.",
    sameAs: "https://en.wikipedia.org/wiki/Breadth-first_search#Applications",
    faq: [
      { question: "How does BFS find the shortest path?", answer: "BFS explores nodes in order of their distance from the source. Since it visits all nodes at distance d before any node at distance d+1, the first time it reaches the destination is guaranteed to be via the shortest path." },
      { question: "Does BFS pathfinding work on weighted graphs?", answer: "No. BFS finds the shortest path only in unweighted graphs where each edge has equal cost. For weighted graphs, use Dijkstra's algorithm, which accounts for varying edge weights using a priority queue." },
      { question: "How is the path reconstructed in BFS?", answer: "During traversal, BFS records the parent of each discovered node. Once the destination is reached, the path is reconstructed by following parent pointers backward from destination to source." },
      { question: "What is the difference between BFS traversal and BFS pathfinding?", answer: "BFS traversal visits all reachable nodes from a source. BFS pathfinding has a specific destination and stops as soon as it's found, then reconstructs the shortest path using parent pointers." },
    ],
  }),
};

export default function BfsPathfindingPage() {
  return (
    <AlgorithmLanding
      algorithmId="bfs-pathfinding"
      title="BFS Pathfinding Visualizer"
      subtitle="Visualize how BFS finds the shortest path between two nodes in an unweighted graph. Select a source and destination, then watch BFS discover the optimal route level by level."
      ctaText="Visualize BFS Pathfinding"
      howItWorks={{
        description: [
          "BFS Pathfinding uses Breadth-First Search to find the shortest path between a source and destination node in an unweighted graph. Because BFS explores nodes in order of distance, the first time it reaches the destination is guaranteed to be via the shortest path.",
          "The algorithm tracks the parent of each discovered node, allowing it to reconstruct the path from destination back to source once the target is found.",
        ],
        steps: [
          "Start at the source node and mark it as visited",
          "Add the source node to a queue with no parent",
          "Dequeue the front node — if it's the destination, reconstruct the path",
          "Visit all unvisited neighbors, recording the current node as their parent",
          "Add each newly discovered neighbor to the queue",
          "Repeat until the destination is found or the queue is empty",
        ],
      }}
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O(V + E) where V is the number of vertices and E is the number of edges in the graph." },
        { icon: Layers, title: "Shortest Path Guarantee", description: "Always finds the path with the fewest edges in an unweighted graph." },
        { icon: Route, title: "Path Reconstruction", description: "Traces back through parent pointers from destination to source to build the shortest path." },
        { icon: Search, title: "Early Termination", description: "Stops as soon as the destination is reached — no need to explore the entire graph." },
      ]}
      useCases={[
        { icon: Globe, text: "Navigation in grid maps — finding shortest routes in tile-based games" },
        { icon: Network, text: "Network hop count — determining minimum hops between routers" },
        { icon: Route, text: "Puzzle solving — finding minimum moves in sliding puzzles or Rubik's cube" },
      ]}
      faq={[
        { question: "How does BFS find the shortest path?", answer: "BFS explores nodes in order of their distance from the source. Since it visits all nodes at distance d before any node at distance d+1, the first time it reaches the destination is guaranteed to be via the shortest path." },
        { question: "Does BFS pathfinding work on weighted graphs?", answer: "No. BFS finds the shortest path only in unweighted graphs where each edge has equal cost. For weighted graphs, use Dijkstra's algorithm, which accounts for varying edge weights using a priority queue." },
        { question: "How is the path reconstructed in BFS?", answer: "During traversal, BFS records the parent of each discovered node. Once the destination is reached, the path is reconstructed by following parent pointers backward from destination to source." },
        { question: "What is the difference between BFS traversal and BFS pathfinding?", answer: "BFS traversal visits all reachable nodes from a source. BFS pathfinding has a specific destination and stops as soon as it's found, then reconstructs the shortest path using parent pointers." },
      ]}
    />
  );
}
