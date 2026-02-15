import { Route, Network, Timer, Scale, Navigation } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function DijkstraLanding() {
  return (
    <AlgorithmLanding
      algorithmId="dijkstra"
      title="Dijkstra's Algorithm Visualizer"
      subtitle="Visualize how Dijkstra's algorithm finds the shortest path between nodes in a weighted graph. Draw your own graph, set edge weights, and watch the algorithm explore step by step."
      ctaText="Visualize Dijkstra's Algorithm"
      howItWorks={{
        description: [
          "Dijkstra's algorithm is a greedy algorithm that finds the shortest path from a source node to all other nodes in a weighted graph with non-negative edge weights. It was conceived by computer scientist Edsger W. Dijkstra in 1956.",
          "The algorithm maintains a set of unvisited nodes and a distance table. It repeatedly selects the unvisited node with the smallest known distance, visits it, and updates the distances of its neighbors. This process continues until the destination node is visited or all reachable nodes have been explored.",
        ],
        steps: [
          "Initialize the source node distance to 0 and all others to infinity",
          "Add the source node to a priority queue",
          "Extract the node with the minimum distance from the queue",
          "For each neighbor, calculate the tentative distance through the current node",
          "If the new distance is shorter, update it and add the neighbor to the queue",
          "Repeat until the destination is reached or the queue is empty",
        ],
      }}
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O((V + E) log V) with a binary heap priority queue, where V is vertices and E is edges." },
        { icon: Scale, title: "Weighted Graphs", description: "Designed for graphs with non-negative edge weights. For negative weights, use Bellman-Ford instead." },
        { icon: Route, title: "Optimal Paths", description: "Guarantees the shortest path between the source and every reachable node in the graph." },
        { icon: Network, title: "Greedy Strategy", description: "Always processes the closest unvisited node first, building up shortest paths incrementally." },
      ]}
      useCases={[
        { icon: Navigation, text: "GPS navigation — finding the fastest route between two locations" },
        { icon: Network, text: "Network routing protocols — OSPF uses Dijkstra's to compute shortest paths" },
        { icon: Route, text: "Game AI pathfinding — navigating NPCs through weighted terrain and obstacle maps" },
      ]}
    />
  );
}
