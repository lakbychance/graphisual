# Cycle detection

## Standard graph

From A. Edges: A→B, A→C, B→D, D→E, E→C, C→B, D→F, E→F

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress
 4. B → D leads to unvisited D, so visit it; it is now in progress
 5. D → E leads to unvisited E, so visit it; it is now in progress
 6. E → C leads to unvisited C, so visit it; it is now in progress
 7. C → B leads back to B, which is still in progress, so there is a cycle
 8. Follow the edges round to read the cycle: B → D → E → C → B

## One edge makes a cycle

From A. Edges: A→B, B→C, B→D, C→A

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress
 4. B → C leads to unvisited C, so visit it; it is now in progress
 5. C → A leads back to A, which is still in progress, so there is a cycle
 6. Follow the edges round to read the cycle: A → B → C → A

## No cycle

From A. Edges: A→B, B→C, B→D, A→C

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress
 4. B → C leads to unvisited C, so visit it; it is now in progress
 5. C has no edges left to follow, so it is done; go back to B
 6. B → D leads to unvisited D, so visit it; it is now in progress
 7. D has no edges left to follow, so it is done; go back to B
 8. B has no edges left to follow, so it is done; go back to A; A → C: C is already done, so skip it
 9. A has no edges left to follow, so it is done
10. Every node is done and no edge led back to a node in progress, so the graph has no cycle

The app says: No cycle found in the graph.

## Undirected

From A. Edges: A–B, B–C, C–A

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress; B → A: this is the edge B came in on, so skip it
 4. B → C leads to unvisited C, so visit it; it is now in progress
 5. C → B: this is the edge C came in on, so skip it; C → A leads back to A, which is still in progress, so there is a cycle
 6. Follow the edges round to read the cycle: A → B → C → A

## The cycle is in another part

From A. Edges: A→B, C→D, D→C

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress
 4. B has no edges left to follow, so it is done; go back to A
 5. A has no edges left to follow, so it is done
 6. Every node reached so far is done; C is still unvisited, so start again from C
 7. Visit C, which is now in progress
 8. C → D leads to unvisited D, so visit it; it is now in progress
 9. D → C leads back to C, which is still in progress, so there is a cycle
10. Follow the edges round to read the cycle: C → D → C

## Parallel edges

From A. Edges: A→B, A→C, C→B, C→B, C→A, C→B

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress
 4. B has no edges left to follow, so it is done; go back to A
 5. A → C leads to unvisited C, so visit it; it is now in progress
 6. Two C → B edges: B is already done, so skip them; C → A leads back to A, which is still in progress, so there is a cycle
 7. Follow the edges round to read the cycle: A → C → A

## The graph the app generates

From 1. Edges: 1–2, 1–6, 2–3, 3–4, 4–7, 4–5, 5–6, 7–8

 1. Start at 1; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit 1, which is now in progress
 3. 1 → 2 leads to unvisited 2, so visit it; it is now in progress; 2 → 1: this is the edge 2 came in on, so skip it
 4. 2 → 3 leads to unvisited 3, so visit it; it is now in progress; 3 → 2: this is the edge 3 came in on, so skip it
 5. 3 → 4 leads to unvisited 4, so visit it; it is now in progress
 6. 4 → 7 leads to unvisited 7, so visit it; it is now in progress; 7 → 4: this is the edge 7 came in on, so skip it
 7. 7 → 8 leads to unvisited 8, so visit it; it is now in progress; 8 → 7: this is the edge 8 came in on, so skip it
 8. 8 has no edges left to follow, so it is done; go back to 7
 9. 7 has no edges left to follow, so it is done; go back to 4; 4 → 3: this is the edge 4 came in on, so skip it
10. 4 → 5 leads to unvisited 5, so visit it; it is now in progress; 5 → 4: this is the edge 5 came in on, so skip it
11. 5 → 6 leads to unvisited 6, so visit it; it is now in progress
12. 6 → 5: this is the edge 6 came in on, so skip it; 6 → 1 leads back to 1, which is still in progress, so there is a cycle
13. Follow the edges round to read the cycle: 1 → 2 → 3 → 4 → 5 → 6 → 1

## Mixed: the loop closes at a node already done

From A. Edges: A–C, A→B, B–C

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → C leads to unvisited C, so visit it; it is now in progress; C → A: this is the edge C came in on, so skip it
 4. C → B leads to unvisited B, so visit it; it is now in progress; B → C: this is the edge B came in on, so skip it
 5. B has no edges left to follow, so it is done; go back to C
 6. C has no edges left to follow, so it is done; go back to A
 7. A → B: B is already done, but it was reached along undirected edges, and walking back along them, B – C – A, leads to A, which is still in progress, so there is a cycle
 8. Follow the edges round to read the cycle: A → B → C → A

## Mixed: a directed and an undirected edge between the same two nodes

From A. Edges: A–B, A→B

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress
 4. B → A leads back to A, which is still in progress, so there is a cycle
 5. Follow the edges round to read the cycle: A → B → A

## Mixed: no cycle

From A. Edges: A–B, B→C, A→C

 1. Start at A; every node is unvisited, and an edge back to a node still in progress means a cycle
 2. Visit A, which is now in progress
 3. A → B leads to unvisited B, so visit it; it is now in progress; B → A: this is the edge B came in on, so skip it
 4. B → C leads to unvisited C, so visit it; it is now in progress
 5. C has no edges left to follow, so it is done; go back to B
 6. B has no edges left to follow, so it is done; go back to A; A → C: C is already done, so skip it
 7. A has no edges left to follow, so it is done
 8. Every node is done and no edge led back to a node in progress, so the graph has no cycle

The app says: No cycle found in the graph.
