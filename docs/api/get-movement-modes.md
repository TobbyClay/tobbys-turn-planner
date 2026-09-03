### `tobbys-turn-planner.getMovementModes`

Allows systems or modules to specify which movement modes (e.g. `"walk"`, `"fly"`, `"swim"`) are available for a given actor.

```ts
Hooks.on("tobbys-turn-planner.getMovementModes", (actor: Actor, modes: string[]) => {
    // Add movement modes that should be available for this actor
    if (actor.system.attributes.movement.fly > 0) {
        modes.push("fly");
    }
});
```

#### Parameters:

-   `actor`: The `Actor` being queried.
-   `modes`: An empty array (`string[]`) you can push movement mode names into.

#### Notes:

-   This hook **only determines which movement modes exist**, not their distances or visual styles.
-   `string` entries are validated internally—non-strings or empty values are ignored with a one-time warning.
-   The returned list affects Tab-based mode cycling and visibility in labels.
