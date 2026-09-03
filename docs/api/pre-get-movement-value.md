### `tobbys-turn-planner.preGetMovementValue`

Allows you to override the movement rings shown for a given actor and movement mode. This hook is called per mode (e.g. `"walk"`, `"fly"`), and pushing entries into `ranges` replaces the module’s defaults.

```ts
Hooks.on("tobbys-turn-planner.preGetMovementValue", (actor, ranges, mode) => {
    if (mode === "walk") {
        ranges.push({ value: 30, preset: "available" }); // 30 ft = 6 grid units (on 5 ft grid)
    }
});
```

#### Parameters:

-   `actor`: The `Actor` being evaluated.
-   `ranges`: An empty array of `MovementRange` entries. If you push anything into this array, the default behavior is skipped.
-   `mode`: The movement mode being evaluated (e.g. `"walk"`, `"fly"`).

---

#### `MovementRange`:

```ts
interface MovementRange {
    value: number; // distance in *world units* (e.g. feet or meters)
    rgb?: number; // optional 0xRRGGBB color
    a?: number; // optional opacity (0–1)
    preset?: "available" | "bonus"; // optional styling preset
}
```

---

#### Important: Grid Conversion

-   The `value` you supply is interpreted in **distance units** (e.g. feet).
-   Internally, each `value` is **divided by the scene's grid distance** (`canvas.grid?.distance`) to determine how many **grid cells** it spans.

    -   Example: on a 5 ft grid, `value: 30` spans 6 tiles (`30 / 5`).

-   This conversion is done automatically.

---

#### Behavior:

-   If any entries are pushed, default movement ranges are ignored.
-   Entries are sorted by `value`, and the module applies the **first range where `value >= tile distance`**.
-   If no range matches, the last one is used.
