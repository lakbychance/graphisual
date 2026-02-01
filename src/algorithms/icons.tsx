/**
 * Custom SVG icons for algorithm picker
 * Each icon visually represents the algorithm's behavior
 */

interface IconProps {
  className?: string;
}

/** BFS: Nodes explored level by level (concentric waves) */
export const BfsIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Center node */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    {/* Level 1 - inner ring */}
    <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
    {/* Level 2 - outer ring */}
    <circle cx="12" cy="12" r="10" strokeDasharray="3 2" />
  </svg>
);

/** DFS: Deep path with unvisited node */
export const DfsIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Root node */}
    <circle cx="12" cy="3" r="2" fill="currentColor" />
    {/* Deep path nodes - visited */}
    <circle cx="6" cy="10" r="2" fill="currentColor" />
    <circle cx="4" cy="17" r="2" fill="currentColor" />
    {/* Unvisited node - faded but connected */}
    <circle cx="12" cy="17" r="2" opacity="0.4" />
    {/* Visited path lines */}
    <path d="M11 5 L7 8" />
    <path d="M5 12 L4 15" />
    {/* Connection to unvisited node */}
    <path d="M7.5 11 L10.5 15.5" opacity="0.4" />
  </svg>
);

/** Dijkstra: Weighted shortest path */
export const DijkstraIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Start node */}
    <circle cx="3" cy="12" r="2" fill="currentColor" />
    {/* Intermediate nodes */}
    <circle cx="12" cy="6" r="2" />
    <circle cx="12" cy="18" r="2" />
    {/* End node */}
    <circle cx="21" cy="12" r="2" />
    {/* Shortest path (highlighted) */}
    <path d="M5 12 L10 6" strokeWidth="2" />
    <path d="M14 6 L19 12" strokeWidth="2" />
    {/* Alternative longer path */}
    <path d="M5 12 L10 18" opacity="0.4" />
    <path d="M14 18 L19 12" opacity="0.4" />
  </svg>
);

/** Bellman-Ford: Checks all edges each iteration */
export const BellmanFordIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Nodes */}
    <circle cx="4" cy="6" r="2" fill="currentColor" />
    <circle cx="20" cy="6" r="2" />
    <circle cx="4" cy="18" r="2" />
    <circle cx="20" cy="18" r="2" />
    <circle cx="12" cy="12" r="2" />
    {/* All edges visible - representing checking every edge */}
    <path d="M6 6 L10 10" />
    <path d="M14 10 L18 6" />
    <path d="M6 18 L10 14" />
    <path d="M14 14 L18 18" />
    <path d="M4 8 L4 16" />
    <path d="M20 8 L20 16" />
    <path d="M6 6 L18 6" />
    <path d="M6 18 L18 18" />
  </svg>
);

/** Prim's MST: Minimum spanning tree */
export const PrimsIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Root */}
    <circle cx="12" cy="3" r="2" fill="currentColor" />
    {/* Level 1 */}
    <circle cx="6" cy="10" r="2" />
    <circle cx="18" cy="10" r="2" />
    {/* Level 2 */}
    <circle cx="3" cy="18" r="2" />
    <circle cx="9" cy="18" r="2" />
    <circle cx="15" cy="18" r="2" />
    <circle cx="21" cy="18" r="2" />
    {/* Tree edges */}
    <path d="M11 5 L7 8" />
    <path d="M13 5 L17 8" />
    <path d="M5 12 L3.5 16" />
    <path d="M7 12 L8.5 16" />
    <path d="M17 12 L15.5 16" />
    <path d="M19 12 L20.5 16" />
  </svg>
);

/** BFS Pathfinding: Level-by-level exploration to target */
export const BfsPathfindingIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Start node - center left */}
    <circle cx="4" cy="12" r="2.5" fill="currentColor" />
    {/* Level 1 nodes - explored (around start) */}
    <circle cx="11" cy="5" r="2" fill="currentColor" />
    <circle cx="11" cy="12" r="2" fill="currentColor" />
    <circle cx="11" cy="19" r="2" fill="currentColor" />
    {/* Level 2 - end node found */}
    <circle cx="20" cy="12" r="2.5" />
    {/* Edges from start to level 1 */}
    <path d="M6.5 11 L9 5.5" opacity="0.4" />
    <path d="M6.5 12 L9 12" strokeWidth="2" />
    <path d="M6.5 13 L9 18.5" opacity="0.4" />
    {/* Path to destination - highlighted */}
    <path d="M13 12 L17.5 12" strokeWidth="2" />
  </svg>
);

/** DFS Pathfinding: Deep path to target */
export const DfsPathfindingIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Start node */}
    <circle cx="4" cy="4" r="2" fill="currentColor" />
    {/* Path nodes */}
    <circle cx="10" cy="10" r="2" fill="currentColor" />
    <circle cx="8" cy="18" r="2" fill="currentColor" />
    {/* End node */}
    <circle cx="18" cy="20" r="2" />
    {/* Path lines */}
    <path d="M5.5 5.5 L8.5 8.5" strokeWidth="2" />
    <path d="M9 12 L8.5 16" strokeWidth="2" />
    <path d="M10 18.5 L16 19.5" strokeWidth="2" />
    {/* Unvisited branch - faded */}
    <circle cx="18" cy="8" r="2" opacity="0.4" />
    <path d="M11.5 9 L16 8" opacity="0.4" />
  </svg>
);

/** Cycle Detection: Circular loop */
export const CycleDetectionIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Nodes forming a cycle - regular pentagon */}
    <circle cx="12" cy="3" r="2" fill="currentColor" />
    <circle cx="20" cy="9" r="2" />
    <circle cx="17" cy="19" r="2" />
    <circle cx="7" cy="19" r="2" />
    <circle cx="4" cy="9" r="2" />
    {/* Cycle edges */}
    <path d="M14 4 L18 8" />
    <path d="M21 11 L18 17" />
    <path d="M15 20 L9 20" />
    <path d="M6 17 L3 11" />
    <path d="M6 8 L10 4" />
  </svg>
);
