# Prim's

## Standard graph

From A. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

### Overview

 1. Start the tree at A, at cost 0; every other node is unreached (∞) for now
 2. A is the cheapest node in the queue, at 0, so it joins the tree first; checking its edges lowers B to 4 and C to 2
 3. C is the cheapest node in the queue, at 2, so it joins the tree through A; checking its edges lowers B to 1 and E to 9
 4. B is the cheapest node in the queue, at 1, so it joins the tree through C; checking its edges lowers D to 5
 5. D is the cheapest node in the queue, at 5, so it joins the tree through B; checking its edges lowers E to 2 and F to 3
 6. E is the cheapest node in the queue, at 2, so it joins the tree through D; checking its edges lowers nothing
 7. F is the cheapest node in the queue, at 3, so it joins the tree through D; checking its edges lowers nothing
 8. The queue is empty, so the tree is done: A – C, C – B, B – D, D – E and D – F, total weight 13

### Every edge

 1. Start the tree at A, at cost 0; every other node is unreached (∞) for now
 2. A is the cheapest node in the queue, at 0, so it joins the tree first
 3. A → B costs 4, which beats ∞, so B joins the queue at 4
 4. A → C costs 2, which beats ∞, so C joins the queue at 2
 5. C is the cheapest node in the queue, at 2, so it joins the tree through A
 6. C → A: A is already in the tree, so skip it
 7. C → B costs 1, which beats 4, so B's cost drops to 1
 8. C → E costs 9, which beats ∞, so E joins the queue at 9
 9. B is the cheapest node in the queue, at 1, so it joins the tree through C
10. B → A: A is already in the tree, so skip it
11. B → C: C is already in the tree, so skip it
12. B → D costs 5, which beats ∞, so D joins the queue at 5
13. D is the cheapest node in the queue, at 5, so it joins the tree through B
14. D → B: B is already in the tree, so skip it
15. D → E costs 2, which beats 9, so E's cost drops to 2
16. D → F costs 3, which beats ∞, so F joins the queue at 3
17. E is the cheapest node in the queue, at 2, so it joins the tree through D
18. E → C: C is already in the tree, so skip it
19. E → D: D is already in the tree, so skip it
20. E → F costs 6, which does not beat 3, so F keeps 3
21. F is the cheapest node in the queue, at 3, so it joins the tree through D
22. F → D: D is already in the tree, so skip it
23. F → E: E is already in the tree, so skip it
24. The queue is empty, so the tree is done: A – C, C – B, B – D, D – E and D – F, total weight 13

## Disconnected graph

From A. Edges: A–B 4, A–C 2, C–B 1, D–E 2, D–F 3, E–F 6

### Overview

 1. Start the tree at A, at cost 0; every other node is unreached (∞) for now
 2. A is the cheapest node in the queue, at 0, so it joins the tree first; checking its edges lowers B to 4 and C to 2
 3. C is the cheapest node in the queue, at 2, so it joins the tree through A; checking its edges lowers B to 1
 4. B is the cheapest node in the queue, at 1, so it joins the tree through C; checking its edges lowers nothing
 5. The queue is empty, so the tree is done: A – C and C – B, total weight 3; D, E and F cannot be reached from A, so the tree leaves them out
