# DFS pathfinding

## Standard graph

From A to F. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

### Overview

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it; C and B go on the stack, with B on top
 3. B is on top of the stack, so visit it; D and C go on the stack, with C on top; C was already waiting lower down
 4. C is on top of the stack, so visit it; E goes on the stack
 5. E is on top of the stack, so visit it; F and D go on the stack, with D on top; D was already waiting lower down
 6. D is on top of the stack, so visit it; F goes on the stack; F was already waiting lower down
 7. F is on top of the stack and it is the destination, so the search stops
 8. Walk back from F along the parents to read the route: A → B → C → E → D → F, 5 edges

### Every edge

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → C: C is new, so push it onto the stack with A as its parent
 4. A → B: B is new, so push it onto the stack with A as its parent
 5. B is on top of the stack, so visit it
 6. B → D: D is new, so push it onto the stack with B as its parent
 7. B → C: C is on the stack but not visited yet, so move it to the top of the stack with B as its parent
 8. B → A: A is already visited, so skip it
 9. C is on top of the stack, so visit it
10. C → E: E is new, so push it onto the stack with C as its parent
11. C → B: B is already visited, so skip it
12. C → A: A is already visited, so skip it
13. E is on top of the stack, so visit it
14. E → F: F is new, so push it onto the stack with E as its parent
15. E → D: D is on the stack but not visited yet, so move it to the top of the stack with E as its parent
16. E → C: C is already visited, so skip it
17. D is on top of the stack, so visit it
18. D → F: F is on the stack but not visited yet, so move it to the top of the stack with D as its parent
19. D → E: E is already visited, so skip it
20. D → B: B is already visited, so skip it
21. F is on top of the stack and it is the destination, so the search stops
22. Walk back from F along the parents to read the route: A → B → C → E → D → F, 5 edges

## A longer route than needed

From A to D. Edges: A–B, B–C, C–D, A–E, E–D

### Overview

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it; E and B go on the stack, with B on top
 3. B is on top of the stack, so visit it; C goes on the stack
 4. C is on top of the stack, so visit it; D goes on the stack
 5. D is on top of the stack and it is the destination, so the search stops
 6. Walk back from D along the parents to read the route: A → B → C → D, 3 edges

## No route

From A to C. Edges: A→B, C→B

### Every edge

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → B: B is new, so push it onto the stack with A as its parent
 4. B is on top of the stack, so visit it
 5. B has no edges left to follow, so it is done; go back to A
 6. A has no edges left to follow, so it is done
 7. The stack is empty and C was never reached, so there is no route from A to C

The app says: No path found between the selected nodes.
