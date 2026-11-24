# DFS pathfinding

## Standard graph

From A to F. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → C: C is new, so push it onto the stack with A as its parent
 4. A → B: B is new, so push it onto the stack with A as its parent
 5. B is on top of the stack, so visit it
 6. B → D: D is new, so push it onto the stack with B as its parent
 7. B → C: C is on the stack but not visited yet, so move it to the top of the stack with B as its parent; B → A: A is already visited, so skip it
 8. C is on top of the stack, so visit it
 9. C → E: E is new, so push it onto the stack with C as its parent; C → B: B is already visited, so skip it; C → A: A is already visited, so skip it
10. E is on top of the stack, so visit it
11. E → F: F is new, so push it onto the stack with E as its parent
12. E → D: D is on the stack but not visited yet, so move it to the top of the stack with E as its parent; E → C: C is already visited, so skip it
13. D is on top of the stack, so visit it
14. D → F: F is on the stack but not visited yet, so move it to the top of the stack with D as its parent; D → E: E is already visited, so skip it; D → B: B is already visited, so skip it
15. F is on top of the stack and it is the destination, so the search stops
16. Walk back from F along the parents to read the route: A → B → C → E → D → F, 5 edges

## A longer route than needed

From A to D. Edges: A–B, B–C, C–D, A–E, E–D

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → E: E is new, so push it onto the stack with A as its parent
 4. A → B: B is new, so push it onto the stack with A as its parent
 5. B is on top of the stack, so visit it
 6. B → C: C is new, so push it onto the stack with B as its parent; B → A: A is already visited, so skip it
 7. C is on top of the stack, so visit it
 8. C → D: D is new, so push it onto the stack with C as its parent; C → B: B is already visited, so skip it
 9. D is on top of the stack and it is the destination, so the search stops
10. Walk back from D along the parents to read the route: A → B → C → D, 3 edges

## No route

From A to C. Edges: A→B, C→B

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → B: B is new, so push it onto the stack with A as its parent
 4. B is on top of the stack, so visit it
 5. B has no edges left to follow, so it is done; go back to A
 6. A has no edges left to follow, so it is done
 7. The stack is empty and C was never reached, so there is no route from A to C

The app says: No path found between the selected nodes.
