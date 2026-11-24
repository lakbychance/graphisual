# BFS

## Standard graph

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue
 4. A → C: C is new, so it joins the queue
 5. B is at the front of the queue, so visit it
 6. B → A: A is already visited, so skip it; B → C: C is already in the queue, so skip it; B → D: D is new, so it joins the queue
 7. C is at the front of the queue, so visit it
 8. C → A: A is already visited, so skip it; C → B: B is already visited, so skip it; C → E: E is new, so it joins the queue
 9. D is at the front of the queue, so visit it
10. D → B: B is already visited, so skip it; D → E: E is already in the queue, so skip it; D → F: F is new, so it joins the queue
11. E is at the front of the queue, so visit it; E → C: C is already visited, so skip it; E → D: D is already visited, so skip it; E → F: F is already in the queue, so skip it
12. F is at the front of the queue, so visit it; F → D: D is already visited, so skip it; F → E: E is already visited, so skip it
13. The queue is empty, so every node reachable from A is visited, in the order A, B, C, D, E, F

## Disconnected graph

From A. Edges: A–B, C–D

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue
 4. B is at the front of the queue, so visit it; B → A: A is already visited, so skip it
 5. The queue is empty, so every node reachable from A is visited, in the order A, B; C and D cannot be reached from A

## Same graph, two orders: from A

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue
 4. A → C: C is new, so it joins the queue
 5. B is at the front of the queue, so visit it
 6. B → A: A is already visited, so skip it; B → C: C is already in the queue, so skip it; B → D: D is new, so it joins the queue
 7. C is at the front of the queue, so visit it
 8. C → A: A is already visited, so skip it; C → B: B is already visited, so skip it; C → E: E is new, so it joins the queue
 9. D is at the front of the queue, so visit it
10. D → B: B is already visited, so skip it; D → E: E is already in the queue, so skip it; D → F: F is new, so it joins the queue
11. E is at the front of the queue, so visit it; E → C: C is already visited, so skip it; E → D: D is already visited, so skip it; E → F: F is already in the queue, so skip it
12. F is at the front of the queue, so visit it; F → D: D is already visited, so skip it; F → E: E is already visited, so skip it
13. The queue is empty, so every node reachable from A is visited, in the order A, B, C, D, E, F

## Same graph, two orders: from F

From F. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at F: it joins the queue, and every other node is unvisited for now
 2. F is at the front of the queue, so visit it
 3. F → D: D is new, so it joins the queue
 4. F → E: E is new, so it joins the queue
 5. D is at the front of the queue, so visit it
 6. D → B: B is new, so it joins the queue; D → E: E is already in the queue, so skip it; D → F: F is already visited, so skip it
 7. E is at the front of the queue, so visit it
 8. E → C: C is new, so it joins the queue; E → D: D is already visited, so skip it; E → F: F is already visited, so skip it
 9. B is at the front of the queue, so visit it
10. B → A: A is new, so it joins the queue; B → C: C is already in the queue, so skip it; B → D: D is already visited, so skip it
11. C is at the front of the queue, so visit it; C → A: A is already in the queue, so skip it; C → B: B is already visited, so skip it; C → E: E is already visited, so skip it
12. A is at the front of the queue, so visit it; A → B: B is already visited, so skip it; A → C: C is already visited, so skip it
13. The queue is empty, so every node reachable from F is visited, in the order F, D, E, B, C, A
