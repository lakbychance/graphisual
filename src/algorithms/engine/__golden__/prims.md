# Prim's

## Standard graph

From A. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

 1. Start the tree at A, at cost 0; every other node is unreached (∞) for now
 2. A is the cheapest node in the queue, at 0, so it joins the tree first
 3. A → B costs 4, which beats ∞, so B joins the queue at 4
 4. A → C costs 2, which beats ∞, so C joins the queue at 2
 5. C is the cheapest node in the queue, at 2, so it joins the tree through A
 6. C → A: A is already in the tree, so skip it; C → B costs 1, which beats 4, so B's cost drops to 1
 7. C → E costs 9, which beats ∞, so E joins the queue at 9
 8. B is the cheapest node in the queue, at 1, so it joins the tree through C
 9. B → A: A is already in the tree, so skip it; B → C: C is already in the tree, so skip it; B → D costs 5, which beats ∞, so D joins the queue at 5
10. D is the cheapest node in the queue, at 5, so it joins the tree through B
11. D → B: B is already in the tree, so skip it; D → E costs 2, which beats 9, so E's cost drops to 2
12. D → F costs 3, which beats ∞, so F joins the queue at 3
13. E is the cheapest node in the queue, at 2, so it joins the tree through D; E → C: C is already in the tree, so skip it; E → D: D is already in the tree, so skip it; E → F costs 6, which does not beat 3, so F keeps 3
14. F is the cheapest node in the queue, at 3, so it joins the tree through D; F → D: D is already in the tree, so skip it; F → E: E is already in the tree, so skip it
15. The queue is empty, so the tree is done: A – C, C – B, B – D, D – E and D – F, total weight 13

## Disconnected graph

From A. Edges: A–B 4, A–C 2, C–B 1, D–E 2, D–F 3, E–F 6

 1. Start the tree at A, at cost 0; every other node is unreached (∞) for now
 2. A is the cheapest node in the queue, at 0, so it joins the tree first
 3. A → B costs 4, which beats ∞, so B joins the queue at 4
 4. A → C costs 2, which beats ∞, so C joins the queue at 2
 5. C is the cheapest node in the queue, at 2, so it joins the tree through A
 6. C → A: A is already in the tree, so skip it; C → B costs 1, which beats 4, so B's cost drops to 1
 7. B is the cheapest node in the queue, at 1, so it joins the tree through C; B → A: A is already in the tree, so skip it; B → C: C is already in the tree, so skip it
 8. The queue is empty, so the tree is done: A – C and C – B, total weight 3; D, E and F cannot be reached from A, so the tree leaves them out

## Directed edges

From A. Edges: A→B 3

The app says: MST requires an undirected graph. Found directed edges.
