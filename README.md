# Tobby's Turn Planner

Private tactical turn planning for Foundry VTT v14.

## Current Features

- Aeris-derived tactical token movement overlay, path preview, animation, and movement sounds.
- Optional normal movement engine outside planning.
- Private local-only turn planner from the Token HUD route button.
- Local ghost destination and path overlay that are not broadcast to other players.
- dnd5e activity picker for spells, scroll-like consumables, weapons, and other attack/save/damage/healing activities.
- Average damage preview from dnd5e activity damage configuration. This does not roll dice or create chat messages.
- Cover preview from the planned position against current user targets, considering walls and visible intervening tokens.
- Client-side saved plans.
- Combat turn prompt to execute a saved plan.
- Execution moves the token only after confirmation and can prepare the dnd5e activity without rolling dice.

## Hard Rule

This module never rolls attack, damage, save, check, or healing dice for the player. Planned actions use the normal dnd5e usage flow with subsequent roll actions disabled; players still click their own roll buttons.

## Requirements

- Foundry VTT v14
- dnd5e v5.x for action/activity planning
- socketlib
- lib-wrapper
- color-picker

## Credits

Movement technology is adapted from Aeris Tokens by Robin Chand, MIT licensed.

Cover-rule behavior is inspired by Simple Cover 5e by Peterlankton, MIT licensed.

## Foundry V14 Areas

Foundry v14 moved activity areas toward Regions. Planned area shapes remain private local previews. On execution, this module lets dnd5e create the correct v14 area workflow rather than manually creating a legacy measured template.

This module is intended for private table use.
