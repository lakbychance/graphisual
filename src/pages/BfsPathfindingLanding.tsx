import { Timer, Layers, Route, Search, Globe, Network } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function BfsPathfindingLanding() {
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
    />
  );
}
