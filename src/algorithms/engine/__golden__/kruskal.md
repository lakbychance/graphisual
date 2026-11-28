# Kruskal's

## Standard graph

Edges: A–B 5, A–C 3, C–B 2, B–D 6, C–E 10, D–E 3, D–F 4, E–F 7

 1. Sort the edges by weight, cheapest first; edges that cost the same go in name order
 2. Put each node in a group of its own; an edge joins the tree only when its ends are in two different groups
 3. B – C is next, at 2, and joins two groups, {B} and {C}, so add it to the tree
 4. A – C and D – E both cost 3 and each joins two groups, so either can go next; add A – C, which joins {A} and {B, C}
 5. D – E is next, at 3, and joins two groups, {D} and {E}, so add it to the tree
 6. D – F is next, at 4, and joins two groups, {D, E} and {F}, so add it to the tree
 7. A – B is next, at 5, but A and B are already in one group, joined by A – C – B, so it would close a loop; skip it
 8. B – D is next, at 6, and joins two groups, {A, B, C} and {D, E, F}, so add it to the tree
 9. E – F is next, at 7, but E and F are already in one group, joined by E – D – F, so it would close a loop; skip it
10. C – E is next, at 10, but C and E are already in one group, joined by C – B – D – E, so it would close a loop; skip it
11. Every edge has been looked at, so the tree is done: B – C, A – C, D – E, D – F and B – D, total weight 18

## Standard graph, steered to D – E first

Edges: A–B 5, A–C 3, C–B 2, B–D 6, C–E 10, D–E 3, D–F 4, E–F 7

Steered: takes B – C, D – E, then goes on as usual

 1. Sort the edges by weight, cheapest first; edges that cost the same go in name order
 2. Put each node in a group of its own; an edge joins the tree only when its ends are in two different groups
 3. B – C is next, at 2, and joins two groups, {B} and {C}, so add it to the tree
 4. A – C and D – E both cost 3 and each joins two groups, so either can go next; add D – E, which joins {D} and {E}
 5. A – C is next, at 3, and joins two groups, {A} and {B, C}, so add it to the tree
 6. D – F is next, at 4, and joins two groups, {D, E} and {F}, so add it to the tree
 7. A – B is next, at 5, but A and B are already in one group, joined by A – C – B, so it would close a loop; skip it
 8. B – D is next, at 6, and joins two groups, {A, B, C} and {D, E, F}, so add it to the tree
 9. E – F is next, at 7, but E and F are already in one group, joined by E – D – F, so it would close a loop; skip it
10. C – E is next, at 10, but C and E are already in one group, joined by C – B – D – E, so it would close a loop; skip it
11. Every edge has been looked at, so the tree is done: B – C, D – E, A – C, D – F and B – D, total weight 18

## A graph in two pieces: a forest

Edges: A–B 4, A–C 2, C–B 1, D–E 2, D–F 3, E–F 6

 1. Sort the edges by weight, cheapest first; edges that cost the same go in name order
 2. Put each node in a group of its own; an edge joins the tree only when its ends are in two different groups
 3. B – C is next, at 1, and joins two groups, {B} and {C}, so add it to the tree
 4. A – C and D – E both cost 2 and each joins two groups, so either can go next; add A – C, which joins {A} and {B, C}
 5. D – E is next, at 2, and joins two groups, {D} and {E}, so add it to the tree
 6. D – F is next, at 3, and joins two groups, {D, E} and {F}, so add it to the tree
 7. A – B is next, at 4, but A and B are already in one group, joined by A – C – B, so it would close a loop; skip it
 8. E – F is next, at 6, but E and F are already in one group, joined by E – D – F, so it would close a loop; skip it
 9. Every edge has been looked at; the graph is in 2 pieces, so this is a forest of 2 trees: B – C, A – C, D – E and D – F, total weight 8

## A node on its own: a tree of one node

Edges: A–B 3, B–C 2, A–C 3

 1. Sort the edges by weight, cheapest first; edges that cost the same go in name order
 2. Put each node in a group of its own; an edge joins the tree only when its ends are in two different groups
 3. B – C is next, at 2, and joins two groups, {B} and {C}, so add it to the tree
 4. A – B and A – C both cost 3 and each joins two groups, so either can go next; add A – B, which joins {A} and {B, C}
 5. A – C is next, at 3, but A and C are already in one group, joined by A – B – C, so it would close a loop; skip it
 6. Every edge has been looked at; the graph is in 2 pieces, so this is a forest of 2 trees: B – C and A – B, and D on its own, total weight 5

## Negative weights are fine: the cheapest edge is still the most negative

Edges: A–B −2, B–C 4, A–C −1, C–D 0

 1. Sort the edges by weight, cheapest first; edges that cost the same go in name order
 2. Put each node in a group of its own; an edge joins the tree only when its ends are in two different groups
 3. A – B is next, at −2, and joins two groups, {A} and {B}, so add it to the tree
 4. A – C is next, at −1, and joins two groups, {A, B} and {C}, so add it to the tree
 5. C – D is next, at 0, and joins two groups, {A, B, C} and {D}, so add it to the tree
 6. B – C is next, at 4, but B and C are already in one group, joined by B – A – C, so it would close a loop; skip it
 7. Every edge has been looked at, so the tree is done: A – B, A – C and C – D, total weight −3

## Parallel edges and an edge to itself

Edges: A–B 6, A–B 3, B–B 1, B–C 3, A–C 3

 1. Sort the edges by weight, cheapest first; edges that cost the same go in name order
 2. Put each node in a group of its own; an edge joins the tree only when its ends are in two different groups
 3. B – B is next, at 1, but both its ends are B, so it would close a loop; skip it
 4. A – B, A – C and B – C all cost 3 and each joins two groups, so any of them can go next; add A – B, which joins {A} and {B}
 5. A – C and B – C both cost 3 and each joins two groups, so either can go next; add A – C, which joins {A, B} and {C}
 6. B – C is next, at 3, but B and C are already in one group, joined by B – A – C, so it would close a loop; skip it
 7. A – B is next, at 6, but A and B are already in one group, joined by another A – B edge, so it would close a loop; skip it
 8. Every edge has been looked at, so the tree is done: A – B and A – C, total weight 6

## Many edges tie: counted, not named, as is a long tree

Edges: A–B 2, B–C 2, C–D 2, D–E 2, E–F 2, F–G 2, A–G 3

 1. Sort the edges by weight, cheapest first; edges that cost the same go in name order
 2. Put each node in a group of its own; an edge joins the tree only when its ends are in two different groups
 3. 6 edges all cost 2 and each joins two groups, so any of them can go next; add A – B, which joins {A} and {B}
 4. 5 edges all cost 2 and each joins two groups, so any of them can go next; add B – C, which joins {A, B} and {C}
 5. 4 edges all cost 2 and each joins two groups, so any of them can go next; add C – D, which joins {A, B, C} and {D}
 6. D – E, E – F and F – G all cost 2 and each joins two groups, so any of them can go next; add D – E, which joins {A, B, C, D} and {E}
 7. E – F and F – G both cost 2 and each joins two groups, so either can go next; add E – F, which joins a group of 5 and {F}
 8. F – G is next, at 2, and joins two groups, a group of 6 and {G}, so add it to the tree
 9. A – G is next, at 3, but A and G are already in one group, joined by a path of 6 tree edges, so it would close a loop; skip it
10. Every edge has been looked at, so the tree is done: 6 edges, total weight 12

## Directed edges

Edges: A→B 3

The app says: Kruskal's MST needs an undirected graph, but A → B is one-way

## Mixed edges

Edges: A–B 3, B→C 2

The app says: Kruskal's MST needs an undirected graph, but B → C is one-way
