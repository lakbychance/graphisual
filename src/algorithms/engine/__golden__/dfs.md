# DFS

## Standard graph

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → C: C is new, so push it onto the stack
 4. A → B: B is new, so push it onto the stack
 5. B is on top of the stack, so visit it
 6. B → D: D is new, so push it onto the stack
 7. B → C: C is on the stack but not visited yet, so move it to the top of the stack; B → A: A is already visited, so skip it
 8. C is on top of the stack, so visit it
 9. C → E: E is new, so push it onto the stack; C → B: B is already visited, so skip it; C → A: A is already visited, so skip it
10. E is on top of the stack, so visit it
11. E → F: F is new, so push it onto the stack
12. E → D: D is on the stack but not visited yet, so move it to the top of the stack; E → C: C is already visited, so skip it
13. D is on top of the stack, so visit it
14. D → F: F is on the stack but not visited yet, so move it to the top of the stack; D → E: E is already visited, so skip it; D → B: B is already visited, so skip it
15. F is on top of the stack, so visit it
16. F → E: E is already visited, so skip it; F → D: D is already visited, so skip it; F has no edges left to follow, so it is done; go back to D
17. D has no edges left to follow, so it is done; go back to E
18. E has no edges left to follow, so it is done; go back to C
19. C has no edges left to follow, so it is done; go back to B
20. B has no edges left to follow, so it is done; go back to A
21. A has no edges left to follow, so it is done
22. The stack is empty, so every node reachable from A is visited, in the order A, B, C, E, D, F

## Standard graph, steered to C first

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

Steered: takes A, C, then goes on as usual

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → C: C is new, so push it onto the stack
 4. A → B: B is new, so push it onto the stack
 5. B and C came from A, so either can be on top of the stack; visit C
 6. C → E: E is new, so push it onto the stack
 7. C → B: B is on the stack but not visited yet, so move it to the top of the stack; C → A: A is already visited, so skip it
 8. B is on top of the stack, so visit it
 9. B → D: D is new, so push it onto the stack; B → C: C is already visited, so skip it; B → A: A is already visited, so skip it
10. D is on top of the stack, so visit it
11. D → F: F is new, so push it onto the stack
12. D → E: E is on the stack but not visited yet, so move it to the top of the stack; D → B: B is already visited, so skip it
13. E is on top of the stack, so visit it
14. E → F: F is on the stack but not visited yet, so move it to the top of the stack; E → D: D is already visited, so skip it; E → C: C is already visited, so skip it
15. F is on top of the stack, so visit it
16. F → E: E is already visited, so skip it; F → D: D is already visited, so skip it; F has no edges left to follow, so it is done; go back to E
17. E has no edges left to follow, so it is done; go back to D
18. D has no edges left to follow, so it is done; go back to B
19. B has no edges left to follow, so it is done; go back to C
20. C has no edges left to follow, so it is done; go back to A
21. A has no edges left to follow, so it is done
22. The stack is empty, so every node reachable from A is visited, in the order A, C, B, D, E, F

## Disconnected graph

From A. Edges: A–B, C–D

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → B: B is new, so push it onto the stack
 4. B is on top of the stack, so visit it
 5. B → A: A is already visited, so skip it; B has no edges left to follow, so it is done; go back to A
 6. A has no edges left to follow, so it is done
 7. The stack is empty, so every node reachable from A is visited, in the order A, B; C and D cannot be reached from A

## Same graph, two orders: from A

From A. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at A: it goes on the stack, and every other node is unvisited for now
 2. A is on top of the stack, so visit it
 3. A → C: C is new, so push it onto the stack
 4. A → B: B is new, so push it onto the stack
 5. B is on top of the stack, so visit it
 6. B → D: D is new, so push it onto the stack
 7. B → C: C is on the stack but not visited yet, so move it to the top of the stack; B → A: A is already visited, so skip it
 8. C is on top of the stack, so visit it
 9. C → E: E is new, so push it onto the stack; C → B: B is already visited, so skip it; C → A: A is already visited, so skip it
10. E is on top of the stack, so visit it
11. E → F: F is new, so push it onto the stack
12. E → D: D is on the stack but not visited yet, so move it to the top of the stack; E → C: C is already visited, so skip it
13. D is on top of the stack, so visit it
14. D → F: F is on the stack but not visited yet, so move it to the top of the stack; D → E: E is already visited, so skip it; D → B: B is already visited, so skip it
15. F is on top of the stack, so visit it
16. F → E: E is already visited, so skip it; F → D: D is already visited, so skip it; F has no edges left to follow, so it is done; go back to D
17. D has no edges left to follow, so it is done; go back to E
18. E has no edges left to follow, so it is done; go back to C
19. C has no edges left to follow, so it is done; go back to B
20. B has no edges left to follow, so it is done; go back to A
21. A has no edges left to follow, so it is done
22. The stack is empty, so every node reachable from A is visited, in the order A, B, C, E, D, F

## Same graph, two orders: from F

From F. Edges: A–B, A–C, C–B, B–D, C–E, D–E, D–F, E–F

 1. Start at F: it goes on the stack, and every other node is unvisited for now
 2. F is on top of the stack, so visit it
 3. F → E: E is new, so push it onto the stack
 4. F → D: D is new, so push it onto the stack
 5. D is on top of the stack, so visit it
 6. D → F: F is already visited, so skip it; D → E: E is on the stack but not visited yet, so move it to the top of the stack
 7. D → B: B is new, so push it onto the stack
 8. B is on top of the stack, so visit it
 9. B → D: D is already visited, so skip it; B → C: C is new, so push it onto the stack
10. B → A: A is new, so push it onto the stack
11. A is on top of the stack, so visit it
12. A → C: C is on the stack but not visited yet, so move it to the top of the stack; A → B: B is already visited, so skip it
13. C is on top of the stack, so visit it
14. C → E: E is on the stack but not visited yet, so move it to the top of the stack; C → B: B is already visited, so skip it; C → A: A is already visited, so skip it
15. E is on top of the stack, so visit it
16. E → F: F is already visited, so skip it; E → D: D is already visited, so skip it; E → C: C is already visited, so skip it; E has no edges left to follow, so it is done; go back to C
17. C has no edges left to follow, so it is done; go back to A
18. A has no edges left to follow, so it is done; go back to B
19. B has no edges left to follow, so it is done; go back to D
20. D has no edges left to follow, so it is done; go back to F
21. F has no edges left to follow, so it is done
22. The stack is empty, so every node reachable from F is visited, in the order F, D, B, A, C, E
