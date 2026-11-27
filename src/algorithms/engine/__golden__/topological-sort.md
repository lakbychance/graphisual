# Topological sort

## Standard DAG

Edges: A→C, A→D, B→D, C→E, D→E, D→F

 1. Count the edges pointing into each node; a node with none left is ready to go in the order
 2. Nothing points into A, so it is ready
 3. Nothing points into B, so it is ready
 4. A and B are both ready, so either can go next; take A and add it to the order
 5. A → C no longer counts, so nothing points into C any more and it is ready
 6. A → D no longer counts, so D has 1 edge left pointing into it
 7. B and C are both ready, so either can go next; take B and add it to the order
 8. B → D no longer counts, so nothing points into D any more and it is ready
 9. C and D are both ready, so either can go next; take C and add it to the order
10. C → E no longer counts, so E has 1 edge left pointing into it
11. D is the only node ready, so take it and add it to the order
12. D → E no longer counts, so nothing points into E any more and it is ready
13. D → F no longer counts, so nothing points into F any more and it is ready
14. E and F are both ready, so either can go next; take E and add it to the order
15. F is the only node ready, so take it and add it to the order
16. The ready list is empty and every node is in the order: A, B, C, D, E, F; every edge points forwards along it

## Standard DAG, steered to B first

Edges: A→C, A→D, B→D, C→E, D→E, D→F

Steered: takes B, then goes on as usual

 1. Count the edges pointing into each node; a node with none left is ready to go in the order
 2. Nothing points into A, so it is ready
 3. Nothing points into B, so it is ready
 4. A and B are both ready, so either can go next; take B and add it to the order
 5. B → D no longer counts, so D has 1 edge left pointing into it
 6. A is the only node ready, so take it and add it to the order
 7. A → C no longer counts, so nothing points into C any more and it is ready
 8. A → D no longer counts, so nothing points into D any more and it is ready
 9. C and D are both ready, so either can go next; take C and add it to the order
10. C → E no longer counts, so E has 1 edge left pointing into it
11. D is the only node ready, so take it and add it to the order
12. D → E no longer counts, so nothing points into E any more and it is ready
13. D → F no longer counts, so nothing points into F any more and it is ready
14. E and F are both ready, so either can go next; take E and add it to the order
15. F is the only node ready, so take it and add it to the order
16. The ready list is empty and every node is in the order: B, A, C, D, E, F; every edge points forwards along it

## A node on its own

Edges: A→B, B→C

 1. Count the edges pointing into each node; a node with none left is ready to go in the order
 2. Nothing points into A, so it is ready
 3. Nothing points into D, so it is ready
 4. A and D are both ready, so either can go next; take A and add it to the order
 5. A → B no longer counts, so nothing points into B any more and it is ready
 6. D and B are both ready, so either can go next; take D and add it to the order
 7. B is the only node ready, so take it and add it to the order
 8. B → C no longer counts, so nothing points into C any more and it is ready
 9. C is the only node ready, so take it and add it to the order
10. The ready list is empty and every node is in the order: A, D, B, C; every edge points forwards along it

## Parallel edges

Edges: A→B, A→B, B→C

 1. Count the edges pointing into each node; a node with none left is ready to go in the order
 2. Nothing points into A, so it is ready
 3. A is the only node ready, so take it and add it to the order
 4. A → B no longer counts, so B has 1 edge left pointing into it
 5. A → B no longer counts, so nothing points into B any more and it is ready
 6. B is the only node ready, so take it and add it to the order
 7. B → C no longer counts, so nothing points into C any more and it is ready
 8. C is the only node ready, so take it and add it to the order
 9. The ready list is empty and every node is in the order: A, B, C; every edge points forwards along it

## A cycle

Edges: A→B, B→C, C→A, C→D

The app says: Topological Sort needs a graph with no cycle, but A → B → C → A goes round

## A node with an edge to itself

Edges: A→B, B→B

The app says: Topological Sort needs a graph with no cycle, but B has an edge to itself

## A two-way edge

Edges: A→B, B–C

The app says: Topological Sort needs one-way edges only, but B – C is two-way
