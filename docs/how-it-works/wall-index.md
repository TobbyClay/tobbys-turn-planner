### Fast Collision via Wall Index

Rather than asking Foundry to test every wall on each step, we **preload** all walls into a **spatial index** and then use `LocalSweepPolygon` to compute - and cache - the outcome of **tile-to-adjacent-tile** collision tests in a **navigation grid** (`NavGrid`):

1. **Spatial Wall Index**
   On startup (and whenever walls are created, moved, or deleted), we divide the map into grid-aligned cells and record exactly which wall segments intersect each cell.

2. **Local Collision Cache**
   For each cell, we run `LocalSweepPolygon.testCollision` against its neighboring cells - using only the small set of walls in those two cells - and record whether movement between them is blocked.

3. **Navigation Grid Storage**
   Those pass/fail results become the `connections` list in each `NavGrid` cell (a 2D array of `NavCell`), so at runtime you never re-run a polygon test - you simply look up whether two adjacent cells are connected.

4. **Incremental Updates**
   When a wall changes, we recompute only its affected cells (and their neighbors), keeping the grid fresh in milliseconds without rebuilding the entire map.

By front-loading collision work into this spatial index plus navigation grid, per-tile movement checks are reduced to O(1) lookups - delivering around **20× faster** adjacency tests than `token.checkCollision`. Global vision and lighting still use Foundry’s default system.

You can benchmark the improvement with:

```js
tobbysTurnPlanner.benchmarkCollisionTest(_token, 10000, 100);
```

This will test 10,000 random movement directions from the token’s current position within a 100-pixel radius, comparing the results against `ClockwiseSweepPolgygon` and `token.checkCollision`.
