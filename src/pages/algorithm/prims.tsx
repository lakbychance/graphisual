import { Timer, Network, Scale, TreePine, Cable, Waypoints } from "lucide-react";
import { AlgorithmLanding } from "@/components/AlgorithmLanding";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";

export const meta = {
  route: "algorithm/prims",
  title: "Prim's Algorithm Visualizer — Minimum Spanning Tree | Graphisual",
  description: "Visualize Prim's algorithm building a minimum spanning tree step by step. Draw a weighted graph and watch the MST grow by greedily adding the cheapest edges.",
  ogDescription: "Visualize Prim's algorithm building a minimum spanning tree. Watch the MST grow by greedily adding the cheapest edges.",
  canonical: `${BASE_URL}/algorithm/prims`,
  ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "Prim's Algorithm Visualizer",
    title: "Prim's Algorithm Visualizer — Minimum Spanning Tree | Graphisual",
    description: "Visualize Prim's algorithm building a minimum spanning tree step by step. Draw a weighted graph and watch the MST grow by greedily adding the cheapest edges.",
    url: `${BASE_URL}/algorithm/prims`,
    aboutName: "Prim's algorithm",
    aboutDescription: "A greedy algorithm that finds a minimum spanning tree for a weighted undirected graph by repeatedly adding the cheapest edge connecting the tree to a non-tree vertex.",
    sameAs: "https://en.wikipedia.org/wiki/Prim%27s_algorithm",
    datePublished: "2026-02-15",
    faq: [
      { question: "What is a minimum spanning tree?", answer: "A minimum spanning tree (MST) is a subset of edges in a connected, weighted, undirected graph that connects all vertices with the minimum possible total edge weight, without forming any cycles." },
      { question: "What is the difference between Prim's and Kruskal's algorithm?", answer: "Both find minimum spanning trees, but they work differently. Prim's grows the MST from a single starting node by adding the cheapest adjacent edge. Kruskal's sorts all edges by weight and adds them one by one, skipping edges that would create a cycle." },
      { question: "Does Prim's algorithm work on directed graphs?", answer: "No. Prim's algorithm is designed for undirected graphs only. For directed graphs, finding a minimum spanning arborescence requires different algorithms like Edmonds' algorithm." },
      { question: "What is the time complexity of Prim's algorithm?", answer: "With a binary heap, Prim's algorithm runs in O((V + E) log V) time. With a Fibonacci heap, this improves to O(E + V log V), which is faster for dense graphs." },
    ],
  }),
};

export default function PrimsPage() {
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
      faq={[
        { question: "What is a minimum spanning tree?", answer: "A minimum spanning tree (MST) is a subset of edges in a connected, weighted, undirected graph that connects all vertices with the minimum possible total edge weight, without forming any cycles." },
        { question: "What is the difference between Prim's and Kruskal's algorithm?", answer: "Both find minimum spanning trees, but they work differently. Prim's grows the MST from a single starting node by adding the cheapest adjacent edge. Kruskal's sorts all edges by weight and adds them one by one, skipping edges that would create a cycle." },
        { question: "Does Prim's algorithm work on directed graphs?", answer: "No. Prim's algorithm is designed for undirected graphs only. For directed graphs, finding a minimum spanning arborescence requires different algorithms like Edmonds' algorithm." },
        { question: "What is the time complexity of Prim's algorithm?", answer: "With a binary heap, Prim's algorithm runs in O((V + E) log V) time. With a Fibonacci heap, this improves to O(E + V log V), which is faster for dense graphs." },
      ]}
    />
  );
}
