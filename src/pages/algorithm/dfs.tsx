import { Timer, GitBranch, Network, Search, Puzzle, Map } from "lucide-react";
import { AlgorithmLanding } from "@/components/AlgorithmLanding";
import { makeJsonLd } from "@/utils/make-json-ld";
import { BASE_URL, OG_IMAGE } from "@/utils/constants";


export const meta = {
  route: "algorithm/dfs",
  title: "DFS Visualizer — Depth-First Search | Graphisual",
  description: "Visualize Depth-First Search step by step. Build a graph, pick a starting node, and watch DFS dive deep into each branch before backtracking.",
  ogDescription: "Visualize Depth-First Search step by step. Build a graph and watch DFS explore each branch before backtracking.",
  canonical: `${BASE_URL}/algorithm/dfs`,
    ogImage: OG_IMAGE,
  jsonLd: makeJsonLd({
    name: "DFS Visualizer",
    title: "DFS Visualizer — Depth-First Search | Graphisual",
    description: "Visualize Depth-First Search step by step. Build a graph, pick a starting node, and watch DFS dive deep into each branch before backtracking.",
    url: `${BASE_URL}/algorithm/dfs`,
    aboutName: "Depth-first search",
    aboutDescription: "A graph traversal algorithm that explores as far as possible along each branch before backtracking, using a stack to track the current path.",
    sameAs: "https://en.wikipedia.org/wiki/Depth-first_search",
    faq: [
      { question: "What is Depth-First Search?", answer: "Depth-First Search (DFS) is a graph traversal algorithm that explores as far as possible along each branch before backtracking. It uses a stack (or recursion) to track the current path and visits every reachable node exactly once." },
      { question: "What is the time complexity of DFS?", answer: "DFS runs in O(V + E) time, where V is the number of vertices and E is the number of edges. It visits each vertex and edge exactly once." },
      { question: "Is DFS or BFS better?", answer: "Neither is universally better — it depends on the problem. DFS uses less memory and is better for deep graphs, topological sorting, and cycle detection. BFS is better for finding shortest paths in unweighted graphs and level-order exploration." },
      { question: "Does DFS find the shortest path?", answer: "No. DFS finds a path but not necessarily the shortest one. It explores deeply along each branch, so it may find a longer path before a shorter one. Use BFS for shortest paths in unweighted graphs." },
    ],
  }),
};

export default function DfsPage() {
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
      faq={[
        { question: "What is Depth-First Search?", answer: "Depth-First Search (DFS) is a graph traversal algorithm that explores as far as possible along each branch before backtracking. It uses a stack (or recursion) to track the current path and visits every reachable node exactly once." },
        { question: "What is the time complexity of DFS?", answer: "DFS runs in O(V + E) time, where V is the number of vertices and E is the number of edges. It visits each vertex and edge exactly once." },
        { question: "Is DFS or BFS better?", answer: "Neither is universally better — it depends on the problem. DFS uses less memory and is better for deep graphs, topological sorting, and cycle detection. BFS is better for finding shortest paths in unweighted graphs and level-order exploration." },
        { question: "Does DFS find the shortest path?", answer: "No. DFS finds a path but not necessarily the shortest one. It explores deeply along each branch, so it may find a longer path before a shorter one. Use BFS for shortest paths in unweighted graphs." },
      ]}
    />
  );
}
