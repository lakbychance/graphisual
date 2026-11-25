# Bellman-Ford

## Standard graph

From A to F. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 4: 0 + 4 = 4 beats ∞, so B gets 4
 3. Round 1: A → C costs 2: 0 + 2 = 2 beats ∞, so C gets 2
 4. Round 1: B → A and B → C are no better; B → D costs 5: 4 + 5 = 9 beats ∞, so D gets 9
 5. Round 1: C → A is no better; C → B costs 1: 2 + 1 = 3 beats 4, so B's distance drops to 3
 6. Round 1: C → E costs 9: 2 + 9 = 11 beats ∞, so E gets 11
 7. Round 1: D → B and D → E are no better; D → F costs 3: 9 + 3 = 12 beats ∞, so F gets 12; 5 edges are no better
 8. Round 2: 4 edges are no better; B → D costs 5: 3 + 5 = 8 beats 9, so D's distance drops to 8
 9. Round 2: 4 edges are no better; D → E costs 2: 8 + 2 = 10 beats 11, so E's distance drops to 10
10. Round 2: D → F costs 3: 8 + 3 = 11 beats 12, so F's distance drops to 11; 5 edges are no better
11. Round 3: checking every edge improves nothing, so every distance is final and there is no negative cycle
12. Walk back from F to read the route: A → C → B → D → F, total distance 11

## A negative edge

From A to D. Edges: A→B 2, A→C 5, C→B −4, B→D 1

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 2: 0 + 2 = 2 beats ∞, so B gets 2
 3. Round 1: A → C costs 5: 0 + 5 = 5 beats ∞, so C gets 5
 4. Round 1: B → D costs 1: 2 + 1 = 3 beats ∞, so D gets 3
 5. Round 1: C → B costs −4: 5 − 4 = 1 beats 2, so B's distance drops to 1
 6. Round 2: A → B and A → C are no better; B → D costs 1: 1 + 1 = 2 beats 3, so D's distance drops to 2; C → B is no better
 7. Round 3: checking every edge improves nothing, so every distance is final and there is no negative cycle
 8. Walk back from D to read the route: A → C → B → D, total distance 2

## A negative cycle

From A to C. Edges: A→B 1, B→C −2, C→B 1

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 1: 0 + 1 = 1 beats ∞, so B gets 1
 3. Round 1: B → C costs −2: 1 − 2 = −1 beats ∞, so C gets −1
 4. Round 1: C → B costs 1: −1 + 1 = 0 beats 1, so B's distance drops to 0
 5. Round 2: A → B is no better; B → C costs −2: 0 − 2 = −2 beats −1, so C's distance drops to −2
 6. Round 2: C → B costs 1: −2 + 1 = −1 beats 0, so B's distance drops to −1
 7. One more pass: A → B is still no better; B → C costs −2: −1 − 2 = −3 still beats −2 after every round, so a negative cycle can lower distances forever and there is no shortest route

The app says: A negative cycle can lower the cost forever, so there's no shortest route

## No route

From A to C. Edges: A→B 3, C→B 1

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 3: 0 + 3 = 3 beats ∞, so B gets 3; C → B starts from unreached C
 3. Round 2: checking every edge improves nothing, so every distance is final and there is no negative cycle
 4. Every round is done and C was never reached, so there is no route from A to C

The app says: No route from A to C

## Parallel edges

From A to C. Edges: A→B 2, B→A 5, B→A 7, B→C 1, D→C 1, D→C 4

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 2: 0 + 2 = 2 beats ∞, so B gets 2
 3. Round 1: two B → A edges are no better; B → C costs 1: 2 + 1 = 3 beats ∞, so C gets 3; two D → C edges start from unreached D
 4. Round 2: checking every edge improves nothing, so every distance is final and there is no negative cycle
 5. Walk back from C to read the route: A → B → C, total distance 3

## Parallel edges, one of them improves

From A to B. Edges: A→B 6, A→B 9, A→B 5, A→B 7

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 6: 0 + 6 = 6 beats ∞, so B gets 6
 3. Round 1: A → B costs 5: 0 + 5 = 5 beats 6, so B's distance drops to 5; two more A → B edges are no better
 4. One more pass checks every edge again and nothing improves, so there is no negative cycle
 5. Walk back from B to read the route: A → B, total distance 5

## Parallel edges around another change

From A to B. Edges: A→B 1, A→B 5, A→C 1, A→B 5

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 1: 0 + 1 = 1 beats ∞, so B gets 1
 3. Round 1: two A → B edges are no better; A → C costs 1: 0 + 1 = 1 beats ∞, so C gets 1
 4. Round 2: checking every edge improves nothing, so every distance is final and there is no negative cycle
 5. Walk back from B to read the route: A → B, total distance 1

## Parallel edges in a negative cycle

From A to B. Edges: A→B 1, B→C −2, C→B 1, C→B 3

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1: A → B costs 1: 0 + 1 = 1 beats ∞, so B gets 1
 3. Round 1: B → C costs −2: 1 − 2 = −1 beats ∞, so C gets −1
 4. Round 1: C → B costs 1: −1 + 1 = 0 beats 1, so B's distance drops to 0; another C → B edge is no better
 5. Round 2: A → B is no better; B → C costs −2: 0 − 2 = −2 beats −1, so C's distance drops to −2
 6. Round 2: C → B costs 1: −2 + 1 = −1 beats 0, so B's distance drops to −1; another C → B edge is no better
 7. One more pass: A → B is still no better; B → C costs −2: −1 − 2 = −3 still beats −2 after every round, so a negative cycle can lower distances forever and there is no shortest route

The app says: A negative cycle can lower the cost forever, so there's no shortest route

## The graph the app generates

From 1 to 12. Edges: 1→2 4, 1→5 2, 1→6 6, 2→3 3, 2→6 5, 2→7 9, 3→4 8, 3→7 4, 3→6 3, 4→8 3, 4→12 12, 5→6 7, 5→9 15, 5→10 8, 7→8 3, 7→11 4, 7→10 5, 8→12 5, 8→11 6, 9→10 12, 10→11 3, 11→12 2, 6→7 2, 6→10 6

 1. Start at 1 with distance 0; every other node is unreached (∞) for now
 2. Round 1: 1 → 2 costs 4: 0 + 4 = 4 beats ∞, so 2 gets 4
 3. Round 1: 1 → 5 costs 2: 0 + 2 = 2 beats ∞, so 5 gets 2
 4. Round 1: 1 → 6 costs 6: 0 + 6 = 6 beats ∞, so 6 gets 6
 5. Round 1: 2 → 3 costs 3: 4 + 3 = 7 beats ∞, so 3 gets 7
 6. Round 1: 2 → 6 is no better; 2 → 7 costs 9: 4 + 9 = 13 beats ∞, so 7 gets 13
 7. Round 1: 3 → 4 costs 8: 7 + 8 = 15 beats ∞, so 4 gets 15
 8. Round 1: 3 → 7 costs 4: 7 + 4 = 11 beats 13, so 7's distance drops to 11
 9. Round 1: 3 → 6 is no better; 4 → 8 costs 3: 15 + 3 = 18 beats ∞, so 8 gets 18
10. Round 1: 4 → 12 costs 12: 15 + 12 = 27 beats ∞, so 12 gets 27
11. Round 1: 5 → 6 is no better; 5 → 9 costs 15: 2 + 15 = 17 beats ∞, so 9 gets 17
12. Round 1: 5 → 10 costs 8: 2 + 8 = 10 beats ∞, so 10 gets 10
13. Round 1: 7 → 8 costs 3: 11 + 3 = 14 beats 18, so 8's distance drops to 14
14. Round 1: 7 → 11 costs 4: 11 + 4 = 15 beats ∞, so 11 gets 15
15. Round 1: 7 → 10 is no better; 8 → 12 costs 5: 14 + 5 = 19 beats 27, so 12's distance drops to 19
16. Round 1: 8 → 11 and 9 → 10 are no better; 10 → 11 costs 3: 10 + 3 = 13 beats 15, so 11's distance drops to 13
17. Round 1: 11 → 12 costs 2: 13 + 2 = 15 beats 19, so 12's distance drops to 15
18. Round 1: 6 → 7 costs 2: 6 + 2 = 8 beats 11, so 7's distance drops to 8; 6 → 10 is no better
19. Round 2: 14 edges are no better; 7 → 8 costs 3: 8 + 3 = 11 beats 14, so 8's distance drops to 11
20. Round 2: 7 → 11 costs 4: 8 + 4 = 12 beats 13, so 11's distance drops to 12
21. Round 2: 5 edges are no better; 11 → 12 costs 2: 12 + 2 = 14 beats 15, so 12's distance drops to 14; 6 → 7 and 6 → 10 are no better
22. Round 3: checking every edge improves nothing, so every distance is final and there is no negative cycle
23. Walk back from 12 to read the route: 1 → 6 → 7 → 11 → 12, total distance 14
