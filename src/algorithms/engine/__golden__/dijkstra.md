# Dijkstra's

## Standard graph

From A to F. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

### Overview

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final; checking its edges improves B to 4 and C to 2
 3. C is the closest node in the queue, at 2, so its distance is final; checking its edges improves B to 3 and E to 11
 4. B is the closest node in the queue, at 3, so its distance is final; checking its edges improves D to 8
 5. D is the closest node in the queue, at 8, so its distance is final; checking its edges improves E to 10 and F to 11
 6. E is the closest node in the queue, at 10, so its distance is final; checking its edges improves nothing
 7. F is the closest node in the queue, at 11, so its distance is final; it is the destination, so the search stops
 8. Walk back from F to read the route: A → C → B → D → F, total distance 11

### Every edge

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 4: 0 + 4 = 4 beats ∞, so B joins the queue at 4
 4. A → C costs 2: 0 + 2 = 2 beats ∞, so C joins the queue at 2
 5. C is the closest node in the queue, at 2, so its distance is final
 6. C → A: A's distance is already final, so skip it
 7. C → B costs 1: 2 + 1 = 3 beats 4, so B's distance drops to 3
 8. C → E costs 9: 2 + 9 = 11 beats ∞, so E joins the queue at 11
 9. B is the closest node in the queue, at 3, so its distance is final
10. B → A: A's distance is already final, so skip it
11. B → C: C's distance is already final, so skip it
12. B → D costs 5: 3 + 5 = 8 beats ∞, so D joins the queue at 8
13. D is the closest node in the queue, at 8, so its distance is final
14. D → B: B's distance is already final, so skip it
15. D → E costs 2: 8 + 2 = 10 beats 11, so E's distance drops to 10
16. D → F costs 3: 8 + 3 = 11 beats ∞, so F joins the queue at 11
17. E is the closest node in the queue, at 10, so its distance is final
18. E → C: C's distance is already final, so skip it
19. E → D: D's distance is already final, so skip it
20. E → F costs 6: 10 + 6 = 16 is no better than 11, so F keeps 11
21. F is the closest node in the queue, at 11, so its distance is final; it is the destination, so the search stops
22. Walk back from F to read the route: A → C → B → D → F, total distance 11

## A tie

From A to D. Edges: A–B 2, A–C 2, B–D 1, C–D 3

### Every edge

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 2: 0 + 2 = 2 beats ∞, so B joins the queue at 2
 4. A → C costs 2: 0 + 2 = 2 beats ∞, so C joins the queue at 2
 5. B and C tie for closest at 2, so take B and make its distance final
 6. B → A: A's distance is already final, so skip it
 7. B → D costs 1: 2 + 1 = 3 beats ∞, so D joins the queue at 3
 8. C is the closest node in the queue, at 2, so its distance is final
 9. C → A: A's distance is already final, so skip it
10. C → D costs 3: 2 + 3 = 5 is no better than 3, so D keeps 3
11. D is the closest node in the queue, at 3, so its distance is final; it is the destination, so the search stops
12. Walk back from D to read the route: A → B → D, total distance 3

## No route

From A to C. Edges: A→B 3, C→B 1

### Every edge

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is the closest node in the queue, at 0, so its distance is final
 3. A → B costs 3: 0 + 3 = 3 beats ∞, so B joins the queue at 3
 4. B is the closest node in the queue, at 3, so its distance is final
 5. The queue is empty and C was never reached, so there is no route from A to C

## Start is the destination

From A to A. Edges: A–B 3

### Overview

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. A is both the start and the destination, so the search stops right away
 3. The route is just A, total distance 0
