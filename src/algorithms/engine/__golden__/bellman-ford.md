# Bellman-Ford

## Standard graph

From A to F. Edges: A–B 4, A–C 2, C–B 1, B–D 5, C–E 9, D–E 2, D–F 3, E–F 6

### Overview

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1 checks every edge and improves B to 3, C to 2, D to 9, E to 11 and F to 12
 3. Round 2 checks every edge and improves D to 8, E to 10 and F to 11
 4. Round 3 checks every edge and improves nothing, so every distance is final and there is no negative cycle
 5. Walk back from F to read the route: A → C → B → D → F, total distance 11

### Every edge

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1 begins; A → B costs 4: 0 + 4 = 4 beats ∞, so B gets 4
 3. A → C costs 2: 0 + 2 = 2 beats ∞, so C gets 2
 4. B → A costs 4: 4 + 4 = 8 is no better than 0, so A keeps 0
 5. B → C costs 1: 4 + 1 = 5 is no better than 2, so C keeps 2
 6. B → D costs 5: 4 + 5 = 9 beats ∞, so D gets 9
 7. C → A costs 2: 2 + 2 = 4 is no better than 0, so A keeps 0
 8. C → B costs 1: 2 + 1 = 3 beats 4, so B's distance drops to 3
 9. C → E costs 9: 2 + 9 = 11 beats ∞, so E gets 11
10. D → B costs 5: 9 + 5 = 14 is no better than 3, so B keeps 3
11. D → E costs 2: 9 + 2 = 11 is no better than 11, so E keeps 11
12. D → F costs 3: 9 + 3 = 12 beats ∞, so F gets 12
13. E → C costs 9: 11 + 9 = 20 is no better than 2, so C keeps 2
14. E → D costs 2: 11 + 2 = 13 is no better than 9, so D keeps 9
15. E → F costs 6: 11 + 6 = 17 is no better than 12, so F keeps 12
16. F → D costs 3: 12 + 3 = 15 is no better than 9, so D keeps 9
17. F → E costs 6: 12 + 6 = 18 is no better than 11, so E keeps 11
18. Round 2 begins; A → B costs 4: 0 + 4 = 4 is no better than 3, so B keeps 3
19. A → C costs 2: 0 + 2 = 2 is no better than 2, so C keeps 2
20. B → A costs 4: 3 + 4 = 7 is no better than 0, so A keeps 0
21. B → C costs 1: 3 + 1 = 4 is no better than 2, so C keeps 2
22. B → D costs 5: 3 + 5 = 8 beats 9, so D's distance drops to 8
23. C → A costs 2: 2 + 2 = 4 is no better than 0, so A keeps 0
24. C → B costs 1: 2 + 1 = 3 is no better than 3, so B keeps 3
25. C → E costs 9: 2 + 9 = 11 is no better than 11, so E keeps 11
26. D → B costs 5: 8 + 5 = 13 is no better than 3, so B keeps 3
27. D → E costs 2: 8 + 2 = 10 beats 11, so E's distance drops to 10
28. D → F costs 3: 8 + 3 = 11 beats 12, so F's distance drops to 11
29. E → C costs 9: 10 + 9 = 19 is no better than 2, so C keeps 2
30. E → D costs 2: 10 + 2 = 12 is no better than 8, so D keeps 8
31. E → F costs 6: 10 + 6 = 16 is no better than 11, so F keeps 11
32. F → D costs 3: 11 + 3 = 14 is no better than 8, so D keeps 8
33. F → E costs 6: 11 + 6 = 17 is no better than 10, so E keeps 10
34. Round 3 begins; A → B costs 4: 0 + 4 = 4 is no better than 3, so B keeps 3
35. A → C costs 2: 0 + 2 = 2 is no better than 2, so C keeps 2
36. B → A costs 4: 3 + 4 = 7 is no better than 0, so A keeps 0
37. B → C costs 1: 3 + 1 = 4 is no better than 2, so C keeps 2
38. B → D costs 5: 3 + 5 = 8 is no better than 8, so D keeps 8
39. C → A costs 2: 2 + 2 = 4 is no better than 0, so A keeps 0
40. C → B costs 1: 2 + 1 = 3 is no better than 3, so B keeps 3
41. C → E costs 9: 2 + 9 = 11 is no better than 10, so E keeps 10
42. D → B costs 5: 8 + 5 = 13 is no better than 3, so B keeps 3
43. D → E costs 2: 8 + 2 = 10 is no better than 10, so E keeps 10
44. D → F costs 3: 8 + 3 = 11 is no better than 11, so F keeps 11
45. E → C costs 9: 10 + 9 = 19 is no better than 2, so C keeps 2
46. E → D costs 2: 10 + 2 = 12 is no better than 8, so D keeps 8
47. E → F costs 6: 10 + 6 = 16 is no better than 11, so F keeps 11
48. F → D costs 3: 11 + 3 = 14 is no better than 8, so D keeps 8
49. F → E costs 6: 11 + 6 = 17 is no better than 10, so E keeps 10
50. Walk back from F to read the route: A → C → B → D → F, total distance 11

## A negative edge

From A to D. Edges: A→B 2, A→C 5, C→B −4, B→D 1

### Overview

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1 checks every edge and improves B to 1, C to 5 and D to 3
 3. Round 2 checks every edge and improves D to 2
 4. Round 3 checks every edge and improves nothing, so every distance is final and there is no negative cycle
 5. Walk back from D to read the route: A → C → B → D, total distance 2

### Every edge

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1 begins; A → B costs 2: 0 + 2 = 2 beats ∞, so B gets 2
 3. A → C costs 5: 0 + 5 = 5 beats ∞, so C gets 5
 4. B → D costs 1: 2 + 1 = 3 beats ∞, so D gets 3
 5. C → B costs −4: 5 − 4 = 1 beats 2, so B's distance drops to 1
 6. Round 2 begins; A → B costs 2: 0 + 2 = 2 is no better than 1, so B keeps 1
 7. A → C costs 5: 0 + 5 = 5 is no better than 5, so C keeps 5
 8. B → D costs 1: 1 + 1 = 2 beats 3, so D's distance drops to 2
 9. C → B costs −4: 5 − 4 = 1 is no better than 1, so B keeps 1
10. Round 3 begins; A → B costs 2: 0 + 2 = 2 is no better than 1, so B keeps 1
11. A → C costs 5: 0 + 5 = 5 is no better than 5, so C keeps 5
12. B → D costs 1: 1 + 1 = 2 is no better than 2, so D keeps 2
13. C → B costs −4: 5 − 4 = 1 is no better than 1, so B keeps 1
14. Walk back from D to read the route: A → C → B → D, total distance 2

## A negative cycle

From A to C. Edges: A→B 1, B→C −2, C→B 1

### Overview

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1 checks every edge and improves B to 0 and C to −1
 3. Round 2 checks every edge and improves C to −2 and B to −1
 4. One more pass finds that B → C still improves C, to −3, so a negative cycle can lower distances forever and there is no shortest route

### Every edge

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1 begins; A → B costs 1: 0 + 1 = 1 beats ∞, so B gets 1
 3. B → C costs −2: 1 − 2 = −1 beats ∞, so C gets −1
 4. C → B costs 1: −1 + 1 = 0 beats 1, so B's distance drops to 0
 5. Round 2 begins; A → B costs 1: 0 + 1 = 1 is no better than 0, so B keeps 0
 6. B → C costs −2: 0 − 2 = −2 beats −1, so C's distance drops to −2
 7. C → B costs 1: −2 + 1 = −1 beats 0, so B's distance drops to −1
 8. One more pass begins, to look for a negative cycle; A → B costs 1: 0 + 1 = 1 is still no better than −1
 9. B → C costs −2: −1 − 2 = −3 still beats −2 after every round, so a negative cycle can lower distances forever and there is no shortest route

## No route

From A to C. Edges: A→B 3, C→B 1

### Overview

 1. Start at A with distance 0; every other node is unreached (∞) for now
 2. Round 1 checks every edge and improves B to 3
 3. Round 2 checks every edge and improves nothing, so every distance is final and there is no negative cycle
 4. Every round is done and C was never reached, so there is no route from A to C
