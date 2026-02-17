import { Route, Network, Timer, Scale, Navigation } from "lucide-react";
import { AlgorithmLanding } from "@/components/AlgorithmLanding";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";

export const meta = {
  route: "algorithm/dijkstra",
  title: "Dijkstra's Algorithm Visualizer | Graphisual",
  description: "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs, set source and destination nodes, and watch the algorithm find the optimal path interactively.",
  ogDescription: "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs and watch the algorithm find the optimal path.",
  canonical: `${BASE_URL}/algorithm/dijkstra`,
  ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "Dijkstra's Algorithm Visualizer",
    title: "Dijkstra's Algorithm Visualizer | Graphisual",
    description: "Visualize Dijkstra's shortest path algorithm step by step. Draw weighted graphs, set source and destination nodes, and watch the algorithm find the optimal path interactively.",
    url: `${BASE_URL}/algorithm/dijkstra`,
    aboutName: "Dijkstra's algorithm",
    aboutDescription: "A greedy algorithm that finds the shortest path from a source node to all other nodes in a weighted graph with non-negative edge weights.",
    sameAs: "https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm",
    datePublished: "2026-02-15",
    faq: [
      { question: "What is Dijkstra's algorithm?", answer: "Dijkstra's algorithm is a greedy graph algorithm that finds the shortest path from a single source node to all other nodes in a weighted graph with non-negative edge weights. It works by repeatedly selecting the unvisited node with the smallest known distance and updating its neighbors." },
      { question: "What is the time complexity of Dijkstra's algorithm?", answer: "With a binary heap priority queue, Dijkstra's algorithm runs in O((V + E) log V) time, where V is the number of vertices and E is the number of edges. Using a Fibonacci heap improves this to O(E + V log V)." },
      { question: "Can Dijkstra's algorithm handle negative edge weights?", answer: "No. Dijkstra's algorithm requires all edge weights to be non-negative. For graphs with negative weights, use the Bellman-Ford algorithm instead, which can also detect negative-weight cycles." },
      { question: "What is the difference between Dijkstra's and BFS?", answer: "BFS finds the shortest path in unweighted graphs by exploring level by level. Dijkstra's generalizes this to weighted graphs by using a priority queue to always process the closest unvisited node, accounting for varying edge costs." },
    ],
  }),
};

export default function DijkstraPage() {
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
      faq={[
        { question: "What is Dijkstra's algorithm?", answer: "Dijkstra's algorithm is a greedy graph algorithm that finds the shortest path from a single source node to all other nodes in a weighted graph with non-negative edge weights. It works by repeatedly selecting the unvisited node with the smallest known distance and updating its neighbors." },
        { question: "What is the time complexity of Dijkstra's algorithm?", answer: "With a binary heap priority queue, Dijkstra's algorithm runs in O((V + E) log V) time, where V is the number of vertices and E is the number of edges. Using a Fibonacci heap improves this to O(E + V log V)." },
        { question: "Can Dijkstra's algorithm handle negative edge weights?", answer: "No. Dijkstra's algorithm requires all edge weights to be non-negative. For graphs with negative weights, use the Bellman-Ford algorithm instead, which can also detect negative-weight cycles." },
        { question: "What is the difference between Dijkstra's and BFS?", answer: "BFS finds the shortest path in unweighted graphs by exploring level by level. Dijkstra's generalizes this to weighted graphs by using a priority queue to always process the closest unvisited node, accounting for varying edge costs." },
      ]}
    />
  );
}
