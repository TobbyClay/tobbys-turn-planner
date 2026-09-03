### Movement Path

Tobby's Turn Planner needs a **data path** (dot-path) to your actor’s movement value in its data. This is the field it reads to determine how far your token can move.

Below are the built-in defaults for common systems:

-   **D&D 5E**
    `system.attributes.movement.walk`

-   **Pathfinder 2E**
    `system.attributes.speed.total`

If your system stores speed elsewhere, you'll need to find where it's located and input the correct path into the settings.
