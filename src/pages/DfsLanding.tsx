import { Timer, GitBranch, Network, Search, Puzzle, Map } from "lucide-react";
import { AlgorithmLanding } from "./AlgorithmLanding";

export function DfsLanding() {
  return (
    <AlgorithmLanding
      algorithmId="dfs"
      title="DFS Visualizer"
      subtitle="Visualize Depth-First Search as it dives deep into a graph before backtracking. Build your own graph, pick a starting node, and watch DFS explore every path to its end."
      ctaText="Visualize DFS"
      howItWorks={{
        description: [
          "Depth-First Search (DFS) is a graph traversal algorithm that explores as far as possible along each branch before backtracking. It uses a stack (or recursion) to keep track of which nodes to visit next.",
          "DFS is fundamental in computer science and forms the basis for many other algorithms including topological sorting, cycle detection, and finding connected components. It was first investigated by Charles Pierre Trémaux as a strategy for solving mazes.",
        ],
        steps: [
          "Start at the source node and mark it as visited",
          "Push the source node onto the stack",
          "Pop the top node from the stack",
          "Visit an unvisited neighbor of the current node and push it onto the stack",
          "If no unvisited neighbors remain, backtrack by popping the stack",
          "Repeat until the stack is empty",
        ],
      }}
      properties={[
        { icon: Timer, title: "Time Complexity", description: "O(V + E) where V is the number of vertices and E is the number of edges in the graph." },
        { icon: GitBranch, title: "Depth-First", description: "Explores as deep as possible along each branch before backtracking to explore other paths." },
        { icon: Network, title: "Stack-Based", description: "Uses a LIFO stack (or recursion call stack) to track the current exploration path." },
        { icon: Search, title: "Complete Traversal", description: "Visits every reachable node exactly once, making it useful for exhaustive graph exploration." },
      ]}
      useCases={[
        { icon: Puzzle, text: "Maze solving — exploring paths to find a way through a labyrinth" },
        { icon: GitBranch, text: "Topological sorting — ordering tasks with dependencies in build systems" },
        { icon: Map, text: "Connected components — finding isolated groups in a network" },
      ]}
    />
  );
}
