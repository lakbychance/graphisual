import { Timer, Network, Scale, TreePine, Cable, Waypoints } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function PrimsLanding() {
  return (
    <AlgorithmLanding
      algorithmId="prims"
      title="Prim's Algorithm Visualizer"
      subtitle="Visualize how Prim's algorithm builds a minimum spanning tree by greedily adding the cheapest edge. Draw a weighted graph and watch the tree grow from a starting node."
      ctaText="Visualize Prim's Algorithm"
      howItWorks={{
        description: [
          "Prim's algorithm is a greedy algorithm that finds a minimum spanning tree (MST) for a weighted undirected graph. It builds the tree by starting from an arbitrary node and repeatedly adding the cheapest edge that connects a tree node to a non-tree node.",
          "The algorithm was developed by Vojtěch Jarník in 1930 and later independently rediscovered by Robert C. Prim in 1957. It guarantees the minimum total edge weight needed to connect all nodes.",
        ],
        steps: [
          "Start with an arbitrary node and add it to the MST",
          "Add all edges from the MST to a priority queue",
          "Extract the minimum-weight edge from the queue",
          "If the edge connects to a node not yet in the MST, add that node and edge",
          "Add all edges from the newly added node to the priority queue",
          "Repeat until all nodes are in the MST or the queue is empty",
        ],
      }}
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O((V + E) log V) with a binary heap, or O(E + V log V) with a Fibonacci heap." },
        { icon: Scale, title: "Minimum Weight", description: "Produces a spanning tree with the minimum possible total edge weight." },
        { icon: Network, title: "Greedy Approach", description: "Always picks the cheapest available edge, building the MST incrementally from a single starting node." },
        { icon: TreePine, title: "Connected Graphs", description: "Works on connected weighted undirected graphs. For disconnected graphs, it produces a minimum spanning forest." },
      ]}
      useCases={[
        { icon: Cable, text: "Network design — minimizing cable length to connect all offices in a building" },
        { icon: Waypoints, text: "Cluster analysis — building hierarchical clusters by connecting nearest data points" },
        { icon: Network, text: "Circuit design — minimizing wire length on printed circuit boards" },
      ]}
    />
  );
}
