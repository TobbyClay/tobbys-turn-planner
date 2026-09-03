### `tobbys-turn-planner.getGridTravelSoundOverride`

Allows modules or systems to override the travel sound used when a token moves. Called during path playback, per movement mode and actor.

```ts
Hooks.on(
    "tobbys-turn-planner.getGridTravelSoundOverride",
    (actor, mode, index, results) => {
        if (mode === "fly") {
            results.push("sounds/wing-flap.ogg");
        }
    }
);
```

#### Parameters:

-   `actor`: The `Actor` being moved.
-   `mode`: The current movement mode (e.g. `"walk"`, `"fly"`, `"swim"`).
-   `index`: The current movement index during playback.
-   `results`: An empty array to which you can push a sound path (`string`). If any valid string is pushed, it will override the default sound behavior.

#### Notes:

-   Only the **first valid string** in the array is used.
-   Strings must be non-empty; invalid values are ignored (once with a warning).
-   This is evaluated before default sound resolution.
