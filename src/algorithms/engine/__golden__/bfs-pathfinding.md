# BFS pathfinding

## Standard graph

From A to F. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue with A as its parent
 4. A → C: C is new, so it joins the queue with A as its parent
 5. B is at the front of the queue, so visit it
 6. B → A: A is already visited, so skip it; B → C: C is already in the queue, so skip it; B → D: D is new, so it joins the queue with B as its parent
 7. C is at the front of the queue, so visit it
 8. C → A: A is already visited, so skip it; C → B: B is already visited, so skip it; C → E: E is new, so it joins the queue with C as its parent
 9. D is at the front of the queue, so visit it
10. D → B: B is already visited, so skip it; D → E: E is already in the queue, so skip it; D → F: F is new, so it joins the queue with D as its parent
11. E is at the front of the queue, so visit it; E → C: C is already visited, so skip it; E → D: D is already visited, so skip it; E → F: F is already in the queue, so skip it
12. F is at the front of the queue and it is the destination, so the search stops
13. Walk back from F along the parents to read the route: A → B → D → F, 3 edges

## Weights it does not see

From A to F. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue with A as its parent
 4. A → C: C is new, so it joins the queue with A as its parent
 5. B is at the front of the queue, so visit it
 6. B → A: A is already visited, so skip it; B → C: C is already in the queue, so skip it; B → D: D is new, so it joins the queue with B as its parent
 7. C is at the front of the queue, so visit it
 8. C → A: A is already visited, so skip it; C → B: B is already visited, so skip it; C → E: E is new, so it joins the queue with C as its parent
 9. D is at the front of the queue, so visit it
10. D → B: B is already visited, so skip it; D → E: E is already in the queue, so skip it; D → F: F is new, so it joins the queue with D as its parent
11. E is at the front of the queue, so visit it; E → C: C is already visited, so skip it; E → D: D is already visited, so skip it; E → F: F is already in the queue, so skip it
12. F is at the front of the queue and it is the destination, so the search stops
13. Walk back from F along the parents to read the route: A → B → D → F, 3 edges

## No route

From A to C. Edges: A→B, C→B

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue with A as its parent
 4. B is at the front of the queue, so visit it
 5. The queue is empty and C was never reached, so there is no route from A to C

The app says: No path found between the selected nodes.

## Start is the destination

From A to A. Edges: A–B

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is both the start and the destination, so the search stops right away
 3. The route is just A
