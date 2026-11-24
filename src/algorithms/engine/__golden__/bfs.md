# BFS

## Standard graph

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

### Overview

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it; B and C join the queue
 3. B is at the front of the queue, so visit it; D joins the queue
 4. C is at the front of the queue, so visit it; E joins the queue
 5. D is at the front of the queue, so visit it; F joins the queue
 6. E is at the front of the queue, so visit it; nothing new joins the queue
 7. F is at the front of the queue, so visit it; nothing new joins the queue
 8. The queue is empty, so every node reachable from A is visited, in the order A, B, C, D, E, F

### Every edge

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it
 3. A → B: B is new, so it joins the queue
 4. A → C: C is new, so it joins the queue
 5. B is at the front of the queue, so visit it
 6. B → A: A is already visited, so skip it
 7. B → C: C is already in the queue, so skip it
 8. B → D: D is new, so it joins the queue
 9. C is at the front of the queue, so visit it
10. C → A: A is already visited, so skip it
11. C → B: B is already visited, so skip it
12. C → E: E is new, so it joins the queue
13. D is at the front of the queue, so visit it
14. D → B: B is already visited, so skip it
15. D → E: E is already in the queue, so skip it
16. D → F: F is new, so it joins the queue
17. E is at the front of the queue, so visit it
18. E → C: C is already visited, so skip it
19. E → D: D is already visited, so skip it
20. E → F: F is already in the queue, so skip it
21. F is at the front of the queue, so visit it
22. F → D: D is already visited, so skip it
23. F → E: E is already visited, so skip it
24. The queue is empty, so every node reachable from A is visited, in the order A, B, C, D, E, F

## Disconnected graph

From A. Edges: A–B, C–D

### Overview

 1. Start at A: it joins the queue, and every other node is unvisited for now
 2. A is at the front of the queue, so visit it; B joins the queue
 3. B is at the front of the queue, so visit it; nothing new joins the queue
 4. The queue is empty, so every node reachable from A is visited, in the order A, B; C and D cannot be reached from A
