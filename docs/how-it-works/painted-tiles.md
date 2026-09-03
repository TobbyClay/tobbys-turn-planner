### Painted Tiles and Movement Trails

As the user drags a token, a **movement trail** is dynamically constructed from the origin to the current tile under the cursor. This trail:

-   Always remains within the set of precomputed reachable tiles.
-   Enforces per-step collision checks against nearby walls.
-   Supports full backtracking - returning over previous tiles will rewind the trail.
-   Merges minor directional changes to simplify the visual representation.
-   Only permits diagonal movement when at least one of the adjacent cardinal directions is valid.

Internally, this system uses a local BFS to recompute the path from the trail’s last valid step to the current tile. For square tiles, the path is rendered via shaders (see `src/pixi`).
