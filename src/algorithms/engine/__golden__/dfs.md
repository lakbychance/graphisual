# DFS

## Standard graph

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

### Overview

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it; C and B go on the stack, with B on top
 3. B is on top of the stack, so visit it; D and C go on the stack, with C on top; C was already waiting lower down
 4. C is on top of the stack, so visit it; E goes on the stack
 5. E is on top of the stack, so visit it; F and D go on the stack, with D on top; D was already waiting lower down
 6. D is on top of the stack, so visit it; F goes on the stack; F was already waiting lower down
 7. F is on top of the stack, so visit it; nothing new goes on the stack
 8. The stack is empty, so every node reachable from A is visited, in the order A, B, C, E, D, F

### Every edge

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → C: C is new, so push it onto the stack
 4. A → B: B is new, so push it onto the stack
 5. B is on top of the stack, so visit it
 6. B → D: D is new, so push it onto the stack
 7. B → C: C is on the stack but not visited yet, so move it to the top of the stack
 8. B → A: A is already visited, so skip it
 9. C is on top of the stack, so visit it
10. C → E: E is new, so push it onto the stack
11. C → B: B is already visited, so skip it
12. C → A: A is already visited, so skip it
13. E is on top of the stack, so visit it
14. E → F: F is new, so push it onto the stack
15. E → D: D is on the stack but not visited yet, so move it to the top of the stack
16. E → C: C is already visited, so skip it
17. D is on top of the stack, so visit it
18. D → F: F is on the stack but not visited yet, so move it to the top of the stack
19. D → E: E is already visited, so skip it
20. D → B: B is already visited, so skip it
21. F is on top of the stack, so visit it
22. F → E: E is already visited, so skip it
23. F → D: D is already visited, so skip it
24. F has no edges left to follow, so it is done; go back to D
25. D has no edges left to follow, so it is done; go back to E
26. E has no edges left to follow, so it is done; go back to C
27. C has no edges left to follow, so it is done; go back to B
28. B has no edges left to follow, so it is done; go back to A
29. A has no edges left to follow, so it is done
30. The stack is empty, so every node reachable from A is visited, in the order A, B, C, E, D, F

## Disconnected graph

From A. Edges: A–B, C–D

### Overview

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it; B goes on the stack
 3. B is on top of the stack, so visit it; nothing new goes on the stack
 4. The stack is empty, so every node reachable from A is visited, in the order A, B; C and D cannot be reached from A

## Same graph, two orders: from A

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

### Overview

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it; C and B go on the stack, with B on top
 3. B is on top of the stack, so visit it; D and C go on the stack, with C on top; C was already waiting lower down
 4. C is on top of the stack, so visit it; E goes on the stack
 5. E is on top of the stack, so visit it; F and D go on the stack, with D on top; D was already waiting lower down
 6. D is on top of the stack, so visit it; F goes on the stack; F was already waiting lower down
 7. F is on top of the stack, so visit it; nothing new goes on the stack
 8. The stack is empty, so every node reachable from A is visited, in the order A, B, C, E, D, F

## Same graph, two orders: from F

From F. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

### Overview

 1. Start at F: it goes on the stack, and every other node is unvisited for now
 2. F is on top of the stack, so visit it; E and D go on the stack, with D on top
 3. D is on top of the stack, so visit it; E and B go on the stack, with B on top; E was already waiting lower down
 4. B is on top of the stack, so visit it; C and A go on the stack, with A on top
 5. A is on top of the stack, so visit it; C goes on the stack; C was already waiting lower down
 6. C is on top of the stack, so visit it; E goes on the stack; E was already waiting lower down
 7. E is on top of the stack, so visit it; nothing new goes on the stack
 8. The stack is empty, so every node reachable from F is visited, in the order F, D, B, A, C, E
