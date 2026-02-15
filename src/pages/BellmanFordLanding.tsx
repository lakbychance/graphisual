import { Timer, Scale, Route, AlertTriangle, Network, Navigation } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function BellmanFordLanding() {
  return (
    <AlgorithmLanding
      algorithmId="bellman-ford"
      title="Bellman-Ford Algorithm Visualizer"
      subtitle="Visualize how the Bellman-Ford algorithm finds shortest paths even with negative edge weights. Build a weighted graph and watch it relax edges iteratively."
      ctaText="Visualize Bellman-Ford"
      howItWorks={{
        description: [
          "The Bellman-Ford algorithm finds the shortest paths from a single source node to all other nodes in a weighted graph. Unlike Dijkstra's, it handles negative edge weights and can detect negative-weight cycles. It was developed by Richard Bellman and Lester Ford Jr. in 1958.",
          "The algorithm works by repeatedly relaxing all edges in the graph. After V-1 iterations (where V is the number of vertices), all shortest paths are guaranteed to be found. A final iteration checks for negative-weight cycles.",
        ],
        steps: [
          "Initialize the source node distance to 0 and all others to infinity",
          "Repeat V-1 times: for each edge, check if the path through this edge is shorter",
          "If a shorter path is found, update the distance (relax the edge)",
          "After V-1 iterations, all shortest paths are finalized",
          "Run one more iteration over all edges to check for negative-weight cycles",
          "If any distance can still be reduced, a negative-weight cycle exists",
        ],
      }}
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O(V × E) where V is the number of vertices and E is the number of edges." },
        { icon: Scale, title: "Negative Weights", description: "Handles graphs with negative edge weights, unlike Dijkstra's which requires non-negative weights." },
        { icon: AlertTriangle, title: "Cycle Detection", description: "Detects negative-weight cycles that would make shortest paths undefined (infinitely negative)." },
        { icon: Route, title: "Edge Relaxation", description: "Iteratively relaxes all edges, progressively improving distance estimates until they converge." },
      ]}
      useCases={[
        { icon: Network, text: "Currency arbitrage — detecting profitable exchange rate cycles in financial networks" },
        { icon: Navigation, text: "Distance-vector routing — protocols like RIP use Bellman-Ford for distributed routing" },
        { icon: Route, text: "Constraint systems — solving systems of difference constraints in scheduling" },
      ]}
    />
  );
}
