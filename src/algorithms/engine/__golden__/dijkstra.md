# Dijkstra's

## Standard graph

From A to F. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 4: 0 + 4 = 4 beats ∞, so B joins the queue at 4
 4. A → C costs 2: 0 + 2 = 2 beats ∞, so C joins the queue at 2
 5. C is the closest node in the queue, at 2, so its distance is final
 6. C → A: A's distance is already final, so skip it; C → B costs 1: 2 + 1 = 3 beats 4, so B's distance drops to 3
 7. C → E costs 9: 2 + 9 = 11 beats ∞, so E joins the queue at 11
 8. B is the closest node in the queue, at 3, so its distance is final
 9. B → A: A's distance is already final, so skip it; B → C: C's distance is already final, so skip it; B → D costs 5: 3 + 5 = 8 beats ∞, so D joins the queue at 8
10. D is the closest node in the queue, at 8, so its distance is final
11. D → B: B's distance is already final, so skip it; D → E costs 2: 8 + 2 = 10 beats 11, so E's distance drops to 10
12. D → F costs 3: 8 + 3 = 11 beats ∞, so F joins the queue at 11
13. E is the closest node in the queue, at 10, so its distance is final; E → C: C's distance is already final, so skip it; E → D: D's distance is already final, so skip it; E → F costs 6: 10 + 6 = 16 is no better than 11, so F keeps 11
14. F is the closest node in the queue, at 11, so its distance is final; it is the destination, so the search stops
15. Walk back from F to read the route: A → C → B → D → F, total distance 11

## A negative edge

From A to D. Edges: A→B 2, A→C 5, C→B −4, B→D 1

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 2: 0 + 2 = 2 beats ∞, so B joins the queue at 2
 4. A → C costs 5: 0 + 5 = 5 beats ∞, so C joins the queue at 5
 5. B is the closest node in the queue, at 2, so its distance is final
 6. B → D costs 1: 2 + 1 = 3 beats ∞, so D joins the queue at 3
 7. D is the closest node in the queue, at 3, so its distance is final; it is the destination, so the search stops
 8. Walk back from D to read the route: A → B → D, total distance 3

The app says: Dijkstra's needs no negative edges, but C → B weighs −4; Bellman-Ford handles them

## A tie

From A to D. Edges: A–B 2, A–C 2, B–D 1, C–D 3

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 2: 0 + 2 = 2 beats ∞, so B joins the queue at 2
 4. A → C costs 2: 0 + 2 = 2 beats ∞, so C joins the queue at 2
 5. B and C tie for closest at 2, so take B and make its distance final
 6. B → A: A's distance is already final, so skip it; B → D costs 1: 2 + 1 = 3 beats ∞, so D joins the queue at 3
 7. C is the closest node in the queue, at 2, so its distance is final; C → A: A's distance is already final, so skip it; C → D costs 3: 2 + 3 = 5 is no better than 3, so D keeps 3
 8. D is the closest node in the queue, at 3, so its distance is final; it is the destination, so the search stops
 9. Walk back from D to read the route: A → B → D, total distance 3

## A tie, steered to the other node

From A to D. Edges: A–B 2, A–C 2, B–D 1, C–D 3

Steered: takes A, C, then goes on as usual

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 2: 0 + 2 = 2 beats ∞, so B joins the queue at 2
 4. A → C costs 2: 0 + 2 = 2 beats ∞, so C joins the queue at 2
 5. B and C tie for closest at 2, so take C and make its distance final
 6. C → A: A's distance is already final, so skip it; C → D costs 3: 2 + 3 = 5 beats ∞, so D joins the queue at 5
 7. B is the closest node in the queue, at 2, so its distance is final
 8. B → A: A's distance is already final, so skip it; B → D costs 1: 2 + 1 = 3 beats 5, so D's distance drops to 3
 9. D is the closest node in the queue, at 3, so its distance is final; it is the destination, so the search stops
10. Walk back from D to read the route: A → B → D, total distance 3

## No route

From A to C. Edges: A→B 3, C→B 1

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 3: 0 + 3 = 3 beats ∞, so B joins the queue at 3
 4. B is the closest node in the queue, at 3, so its distance is final
 5. The queue is empty and C was never reached, so there is no route from A to C

The app says: Path is not possible for the given vertices.

## Start is the destination

From A to A. Edges: A–B 3

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is both the start and the destination, so the search stops right away
 3. The route is just A, total distance 0

## Parallel edges

From A to B. Edges: A–B 6, A–B 9, A–B 5, A–C 1, C–B 1, C–B 9

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 6: 0 + 6 = 6 beats ∞, so B joins the queue at 6
 4. A → B costs 9: 0 + 9 = 9 is no better than 6, so B keeps 6; another A → B edge costs 5: 0 + 5 = 5 beats 6, so B's distance drops to 5
 5. A → C costs 1: 0 + 1 = 1 beats ∞, so C joins the queue at 1
 6. C is the closest node in the queue, at 1, so its distance is final
 7. C → A: A's distance is already final, so skip it; C → B costs 1: 1 + 1 = 2 beats 5, so B's distance drops to 2; another C → B edge costs 9: 1 + 9 = 10 is no better than 2, so B keeps 2
 8. B is the closest node in the queue, at 2, so its distance is final; it is the destination, so the search stops
 9. Walk back from B to read the route: A → C → B, total distance 2

## Parallel edges that cost the same

From A to B. Edges: A–B 3, A–C 1, C–B 9, C–B 9, C–D 1, C–D 4, C–D 4

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 3: 0 + 3 = 3 beats ∞, so B joins the queue at 3
 4. A → C costs 1: 0 + 1 = 1 beats ∞, so C joins the queue at 1
 5. C is the closest node in the queue, at 1, so its distance is final
 6. C → A: A's distance is already final, so skip it; two C → B edges cost 9: 1 + 9 = 10 is no better than 3, so B keeps 3; C → D costs 1: 1 + 1 = 2 beats ∞, so D joins the queue at 2; two more C → D edges cost 4: 1 + 4 = 5 is no better than 2, so D keeps 2
 7. D is the closest node in the queue, at 2, so its distance is final; 3 D → C edges: C's distance is already final, so skip them
 8. B is the closest node in the queue, at 3, so its distance is final; it is the destination, so the search stops
 9. Walk back from B to read the route: A → B, total distance 3
