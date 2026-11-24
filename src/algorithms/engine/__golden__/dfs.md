# DFS

## Standard graph

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

### Overview

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it; C and B go on the stack, with B on top
 3. B is on top of the stack, so visit it; D goes on the stack
 4. D is on top of the stack, so visit it; F and E go on the stack, with E on top
 5. E is on top of the stack, so visit it; nothing new goes on the stack
 6. F is on top of the stack, so visit it; nothing new goes on the stack
 7. C is on top of the stack, so visit it; nothing new goes on the stack
 8. The stack is empty, so every node reachable from A is visited, in the order A, B, D, E, F, C

### Every edge

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → C: C is new, so push it onto the stack
 4. A → B: B is new, so push it onto the stack
 5. B is on top of the stack, so visit it
 6. B → D: D is new, so push it onto the stack
 7. B → C: C is already on the stack, so skip it
 8. B → A: A is already visited, so skip it
 9. D is on top of the stack, so visit it
10. D → F: F is new, so push it onto the stack
11. D → E: E is new, so push it onto the stack
12. D → B: B is already visited, so skip it
13. E is on top of the stack, so visit it
14. E → F: F is already on the stack, so skip it
15. E → D: D is already visited, so skip it
16. E → C: C is already on the stack, so skip it
17. F is on top of the stack, so visit it
18. F → E: E is already visited, so skip it
19. F → D: D is already visited, so skip it
20. C is on top of the stack, so visit it
21. C → E: E is already visited, so skip it
22. C → B: B is already visited, so skip it
23. C → A: A is already visited, so skip it
24. The stack is empty, so every node reachable from A is visited, in the order A, B, D, E, F, C

## Disconnected graph

From A. Edges: A–B, C–D

### Overview

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it; B goes on the stack
 3. B is on top of the stack, so visit it; nothing new goes on the stack
 4. The stack is empty, so every node reachable from A is visited, in the order A, B; C and D cannot be reached from A
