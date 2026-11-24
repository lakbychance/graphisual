# Cycle detection

## Standard graph

From A. Edges: A→B, A→C, B→D, D→E, E→C, C→B, D→F, E→F

### Overview

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress; A → B leads to unvisited B
 3. Visit B, which is now in progress; B → D leads to unvisited D
 4. Visit D, which is now in progress; D → E leads to unvisited E
 5. Visit E, which is now in progress; E → C leads to unvisited C
 6. Visit C, which is now in progress; C → B leads back to B, which is still in progress, so there is a cycle
 7. Follow the edges round to read the cycle: B → D → E → C → B

### Every edge

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B: B is unvisited, so go there next
 4. Visit B, which is now in progress
 5. B → D: D is unvisited, so go there next
 6. Visit D, which is now in progress
 7. D → E: E is unvisited, so go there next
 8. Visit E, which is now in progress
 9. E → C: C is unvisited, so go there next
10. Visit C, which is now in progress
11. C → B: B is still in progress, so this edge closes a cycle
12. Follow the edges round to read the cycle: B → D → E → C → B

## One edge makes a cycle

From A. Edges: A→B, B→C, B→D, C→A

### Overview

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress; A → B leads to unvisited B
 3. Visit B, which is now in progress; B → C leads to unvisited C
 4. Visit C, which is now in progress; C → A leads back to A, which is still in progress, so there is a cycle
 5. Follow the edges round to read the cycle: A → B → C → A

## No cycle

From A. Edges: A→B, B→C, B→D, A→C

### Overview

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress; A → B leads to unvisited B
 3. Visit B, which is now in progress; B → C leads to unvisited C
 4. Visit C, which is now in progress
 5. C has no edges left to follow, so it is done; go back to B; B → D leads to unvisited D
 6. Visit D, which is now in progress
 7. D has no edges left to follow, so it is done; go back to B
 8. B has no edges left to follow, so it is done; go back to A; A → C leads to C, which is done
 9. A has no edges left to follow, so it is done
10. Every node is done and no edge led back to a node in progress, so the graph has no cycle

### Every edge

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B: B is unvisited, so go there next
 4. Visit B, which is now in progress
 5. B → C: C is unvisited, so go there next
 6. Visit C, which is now in progress
 7. C has no edges left to follow, so it is done; go back to B
 8. B → D: D is unvisited, so go there next
 9. Visit D, which is now in progress
10. D has no edges left to follow, so it is done; go back to B
11. B has no edges left to follow, so it is done; go back to A
12. A → C: C is already done, so skip it
13. A has no edges left to follow, so it is done
14. Every node is done and no edge led back to a node in progress, so the graph has no cycle

The app says: No cycle found in the graph.

## Undirected

From A. Edges: A–B, B–C, C–A

### Every edge

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B: B is unvisited, so go there next
 4. Visit B, which is now in progress
 5. B → A: this is the edge B came in on, so skip it
 6. B → C: C is unvisited, so go there next
 7. Visit C, which is now in progress
 8. C → B: this is the edge C came in on, so skip it
 9. C → A: A is still in progress, so this edge closes a cycle
10. Follow the edges round to read the cycle: A → B → C → A

## The cycle is in another part

From A. Edges: A→B, C→D, D→C

### Overview

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress; A → B leads to unvisited B
 3. Visit B, which is now in progress
 4. B has no edges left to follow, so it is done; go back to A
 5. A has no edges left to follow, so it is done
 6. Every node reached so far is done; C is still unvisited, so start again from C
 7. Visit C, which is now in progress; C → D leads to unvisited D
 8. Visit D, which is now in progress; D → C leads back to C, which is still in progress, so there is a cycle
 9. Follow the edges round to read the cycle: C → D → C
