import { AlgorithmLanding } from "@/landing/AlgorithmLanding";
import { dfsPathfinding as live } from "@/landing/live/configs";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";

export const meta = {
  title: "DFS Pathfinding Visualizer | Graphisual",
  description: "Visualize DFS pathfinding as it searches for a path between two nodes. Select source and destination, then watch DFS navigate through the graph.",
  ogDescription: "Visualize DFS pathfinding as it searches for a path between two nodes by exploring deeply along each branch.",
  canonical: `${BASE_URL}/algorithm/dfs-pathfinding`,
  ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "DFS Pathfinding Visualizer",
    title: "DFS Pathfinding Visualizer | Graphisual",
    description: "Visualize DFS pathfinding as it searches for a path between two nodes. Select source and destination, then watch DFS navigate through the graph.",
    url: `${BASE_URL}/algorithm/dfs-pathfinding`,
    aboutName: "DFS pathfinding",
    aboutDescription: "Using Depth-First Search to find a path between two nodes by exploring as far as possible along each branch before backtracking.",
    sameAs: "https://en.wikipedia.org/wiki/Depth-first_search#Applications",
    datePublished: "2026-02-15",
    faq: [
      { question: "Does DFS find the shortest path?", answer: "No. DFS finds a path between two nodes but not necessarily the shortest one. It explores deeply along each branch, so it may discover a longer path first. For the shortest path in unweighted graphs, use BFS instead." },
      { question: "When should I use DFS pathfinding over BFS?", answer: "Use DFS pathfinding when you only need to know if a path exists (not the shortest), when memory is limited (DFS uses less memory than BFS), or when the graph is deep and narrow where DFS can find a path faster." },
      { question: "How does DFS pathfinding work?", answer: "DFS pathfinding starts at the source and recursively explores each unvisited neighbor as deeply as possible. If it reaches the destination, it returns the path. If a branch leads to a dead end, it backtracks and tries the next neighbor." },
      { question: "What is the time complexity of DFS pathfinding?", answer: "DFS pathfinding runs in O(V + E) time in the worst case, where V is the number of vertices and E is the number of edges. However, it can terminate early if the destination is found before exploring the entire graph." },
    ],
  }),
};

export default function DfsPathfindingPage() {
  return (
    <AlgorithmLanding
      live={live}
      subtitle="Visualize how DFS finds a path between two nodes by exploring deeply along each branch. Select a source and destination, then watch DFS navigate through the graph."
      howItWorks={{
        description: [
          "DFS Pathfinding uses Depth-First Search to find a path between a source and destination node. Unlike BFS, DFS does not guarantee the shortest path — it finds the first path it encounters by diving deep into each branch before backtracking.",
          "DFS Pathfinding is useful when any path will do, or when the graph structure favors deep exploration. It uses less memory than BFS since it only needs to store the current path, not all discovered nodes at each level.",
        ],
        steps: [
          "Start at the source node and mark it as visited",
          "If the current node is the destination, the path is found",
          "Explore an unvisited neighbor by recursing deeper",
          "If the recursive call finds the destination, propagate success back",
          "If no unvisited neighbors lead to the destination, backtrack",
          "Repeat until a path is found or all reachable nodes are exhausted",
        ],
      }}
      useCases={[
        { text: "Maze generation — carving paths through a grid using randomized DFS" },
        { text: "Reachability testing — checking whether a path exists between two nodes" },
        { text: "Constraint satisfaction — exploring solution spaces with backtracking" },
      ]}
      faq={[
        { question: "Does DFS find the shortest path?", answer: "No. DFS finds a path between two nodes but not necessarily the shortest one. It explores deeply along each branch, so it may discover a longer path first. For the shortest path in unweighted graphs, use BFS instead." },
        { question: "When should I use DFS pathfinding over BFS?", answer: "Use DFS pathfinding when you only need to know if a path exists (not the shortest), when memory is limited (DFS uses less memory than BFS), or when the graph is deep and narrow where DFS can find a path faster." },
        { question: "How does DFS pathfinding work?", answer: "DFS pathfinding starts at the source and recursively explores each unvisited neighbor as deeply as possible. If it reaches the destination, it returns the path. If a branch leads to a dead end, it backtracks and tries the next neighbor." },
        { question: "What is the time complexity of DFS pathfinding?", answer: "DFS pathfinding runs in O(V + E) time in the worst case, where V is the number of vertices and E is the number of edges. However, it can terminate early if the destination is found before exploring the entire graph." },
      ]}
    />
  );
}
