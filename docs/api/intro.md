## API Hooks

This module exposes extensible behavior through a series of hook calls. These are intended for **system developers**, **module authors**, or GMs who want to customize or override behaviors such as movement modes, range indicators, and grid-travel sounds.

If you're building a system and want to integrate with these APIs easily, consider cloning [`tobbys-turn-planner-system-template`](https://gitlab.com/aeris-fvtt/tobbys-turn-planner-system-template). It provides:

-   A minimal, typed integration layer
-   Examples of how to implement and respond to hooks
-   In built ci to more easily create releases
