### `token.dragActionHandler.refreshMovement()`

Call this method to force a token to refresh its cached movement data.

This is useful when external changes (e.g. effects, conditions, settings) affect available movement ranges or modes.

```ts
token.dragActionHandler?.refreshMovement();
```

#### Behavior:

-   Recomputes movement modes via `callGetMovementModes(actor)`.
-   Recomputes movement ranges per mode.
-   Resets `currentAction` if it no longer matches any mode.
