## How It Works

When a token is placed or moved, the module runs a **bucketed Dijkstra** (a cost-ordered BFS) to find all reachable grid tiles based on movement speed, token size, and collision rules. Because alternating diagonals can carry a non-unit cost, bucketing by cost guarantees each tile’s recorded distance is the minimum possible. To prevent unbounded searches, any raw movement speed over 24 tiles triggers a one-time warning and the search is capped at 24.

Accurately checking each tile for collisions could be prohibitively slow using Foundry's default approach. Foundry's built-in collision system is designed for large-scale checks like vision and light propagation, where evaluating all canvas walls makes sense. But for pathfinding, we only need to test whether movement from one tile to an adjacent tile is blocked - requiring a much faster, localized check.
