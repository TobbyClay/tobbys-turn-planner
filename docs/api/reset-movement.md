### `tobbys-turn-planner.resetMovement`

Fires when movement-related state (e.g. dashing) should be reset - typically at the start of a new turn.

```ts
Hooks.on("tobbys-turn-planner.resetMovement", (actor: Actor) => {
    actor.setFlag("my-module", "dashed", false);
});
```

#### Parameters:

-   `actor`: The actor whose movement-related flags should be reset.

#### Use cases:

-   Resetting temporary bonuses like "dashed"
-   Clearing status effects related to movement
