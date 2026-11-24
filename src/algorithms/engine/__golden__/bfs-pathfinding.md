# BFS pathfinding

## Standard graph

From A to F. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

### Overview

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it; B and C join the queue
 3. B is at the front of the queue, so visit it; D joins the queue
 4. C is at the front of the queue, so visit it; E joins the queue
 5. D is at the front of the queue, so visit it; F joins the queue
 6. E is at the front of the queue, so visit it; nothing new joins the queue
 7. F is at the front of the queue and it is the destination, so the search stops
 8. Walk back from F along the parents to read the route: A → B → D → F, 3 edges

### Every edge

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue with A as its parent
 4. A → C: C is new, so it joins the queue with A as its parent
 5. B is at the front of the queue, so visit it
 6. B → A: A is already visited, so skip it
 7. B → C: C is already in the queue, so skip it
 8. B → D: D is new, so it joins the queue with B as its parent
 9. C is at the front of the queue, so visit it
10. C → A: A is already visited, so skip it
11. C → B: B is already visited, so skip it
12. C → E: E is new, so it joins the queue with C as its parent
13. D is at the front of the queue, so visit it
14. D → B: B is already visited, so skip it
15. D → E: E is already in the queue, so skip it
16. D → F: F is new, so it joins the queue with D as its parent
17. E is at the front of the queue, so visit it
18. E → C: C is already visited, so skip it
19. E → D: D is already visited, so skip it
20. E → F: F is already in the queue, so skip it
21. F is at the front of the queue and it is the destination, so the search stops
22. Walk back from F along the parents to read the route: A → B → D → F, 3 edges

## Weights it does not see

From A to F. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

### Overview

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it; B and C join the queue
 3. B is at the front of the queue, so visit it; D joins the queue
 4. C is at the front of the queue, so visit it; E joins the queue
 5. D is at the front of the queue, so visit it; F joins the queue
 6. E is at the front of the queue, so visit it; nothing new joins the queue
 7. F is at the front of the queue and it is the destination, so the search stops
 8. Walk back from F along the parents to read the route: A → B → D → F, 3 edges

## No route

From A to C. Edges: A→B, C→B

### Every edge

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue with A as its parent
 4. B is at the front of the queue, so visit it
 5. The queue is empty and C was never reached, so there is no route from A to C

The app says: No path found between the selected nodes.

## Start is the destination

From A to A. Edges: A–B

### Overview

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is both the start and the destination, so the search stops right away
 3. The route is just A
