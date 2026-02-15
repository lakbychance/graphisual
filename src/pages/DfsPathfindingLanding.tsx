import { Timer, GitBranch, Route, Search, Puzzle, Map } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function DfsPathfindingLanding() {
  return (
    <AlgorithmLanding
      algorithmId="dfs-pathfinding"
      title="DFS Pathfinding Visualizer"
      subtitle="Visualize how DFS finds a path between two nodes by exploring deeply along each branch. Select a source and destination, then watch DFS navigate through the graph."
      ctaText="Visualize DFS Pathfinding"
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
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O(V + E) where V is the number of vertices and E is the number of edges in the graph." },
        { icon: GitBranch, title: "Non-Optimal Path", description: "Finds a path but not necessarily the shortest — the result depends on exploration order." },
        { icon: Route, title: "Memory Efficient", description: "Only stores the current path on the stack, using O(V) memory compared to BFS which may store O(V) nodes in the queue." },
        { icon: Search, title: "Backtracking", description: "Naturally backtracks when a dead end is reached, exploring all possible paths systematically." },
      ]}
      useCases={[
        { icon: Puzzle, text: "Maze generation — carving paths through a grid using randomized DFS" },
        { icon: Map, text: "Reachability testing — checking whether a path exists between two nodes" },
        { icon: GitBranch, text: "Constraint satisfaction — exploring solution spaces with backtracking" },
      ]}
    />
  );
}
