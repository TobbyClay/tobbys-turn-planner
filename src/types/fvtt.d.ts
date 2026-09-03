import { RegionCellRef } from "../regionIndex/regionIndexManager";
import { MovementBehaviour } from "../settings/enableGrid";
import { CellRef } from "../wallIndex/wallIndexManager";

declare module "fvtt-types/configuration" {
	interface FlagConfig {
		Actor: {
			"tobbys-turn-planner": {
				distanceMoved: number;
			};
		};
	}

	namespace Hooks {
		interface HookConfig {
			"socketlib.ready": () => void;

			/** Hook to override travel sound effect per grid type */
			"tobbys-turn-planner.getGridTravelSoundOverride": (
				actor: Actor | undefined,
				mode: string | undefined,
				index: number | undefined,
				unvalidated: unknown[]
			) => void;

			/** Hook to override movement value */
			"tobbys-turn-planner.preGetMovementValue": (
				actor: Actor,
				apiOverride: UnvalidatedMovementRange[],
				mode: MovementMode
			) => void;

			/** Called to reset movement tracking for an actor */
			"tobbys-turn-planner.resetMovement": (actor: Actor) => void;

			"tobbys-turn-planner.getMovementModes": (
				actor: Actor,
				unvalidated: unknown[]
			) => void;

			wallIndexBuilt: () => void;

			wallIndexUpdated: (refs: CellRef[]) => void;

			regionIndexBuilt: () => void;

			regionIndexUpdated: (refs: RegionCellRef[]) => void;
		}
	}

	interface SettingConfig {
		"tobbys-turn-planner.moduleFunctionalityScopeOutOfCombat": MovementBehaviour;
		"tobbys-turn-planner.moduleFunctionalityScopeInCombat": MovementBehaviour;

		"tobbys-turn-planner.uncapExploration": boolean;

		"tobbys-turn-planner.movementDataPathSetting": string;
		"tobbys-turn-planner.flyMovementDataPathSetting": string;
		"tobbys-turn-planner.extendedMovementDataPathSetting": string;
		"tobbys-turn-planner.cameraPanPadding": number;
		"tobbys-turn-planner.moveCameraOnHold": boolean;
		"tobbys-turn-planner.enableGridPainting": boolean;

		"tobbys-turn-planner.gridActivePathColor": string;
		"tobbys-turn-planner.gridAvailableTilesColor": string;
		"tobbys-turn-planner.gridBonusTilesColor": string;
		"tobbys-turn-planner.gridInvalidTilesColor": string;
		"tobbys-turn-planner.gridUnreachableTilesColor": string;

		"tobbys-turn-planner.gridStrokeColor": string;
		"tobbys-turn-planner.gridAccentColor": string;
		"tobbys-turn-planner.gridTextColor": string;
		"tobbys-turn-planner.showOthersGridPaths": boolean;
		"tobbys-turn-planner.othersGridAlphaMultiplier": number;

		// Audio
		"tobbys-turn-planner.gridSelectSound": string;
		"tobbys-turn-planner.enableGridSelectSound": boolean;
		"tobbys-turn-planner.gridTravelSound": string;
		"tobbys-turn-planner.enableGridTravelSound": boolean;

		"tobbys-turn-planner.enableDistanceLabelToken": boolean;

		"tobbys-turn-planner.fontImport": string;
		"tobbys-turn-planner.fontFamily": string;
		"tobbys-turn-planner.movementMultiplier": number;
		"tobbys-turn-planner.baseMovementOverride": number;

		"tobbys-turn-planner.scaleJumpFactor": number;
		"tobbys-turn-planner.tokenMoveSpeed": number;

		"core.gridDiagonals": CONST.GRID_DIAGONALS;

		"tobbys-turn-planner.allowPathBeyondRange": boolean;

		"tobbys-turn-planner.enableCombatMovementHistory": boolean;

		"core.tokenAutoRotate": boolean;
		"tobbys-turn-planner.autoPath": boolean;

		"tobbys-turn-planner.enableOthersPreview": boolean;
	}
	interface Storage {
		"core.globalInterfaceVolume": number;

		//Audio
		"tobbys-turn-planner.gridSelectSound": string;
		"tobbys-turn-planner.enableGridSelectSound": boolean;
		"tobbys-turn-planner.gridTravelSound": string;
		"tobbys-turn-planner.enableGridTravelSound": boolean;

		"tobbys-turn-planner.enableDistanceLabelToken": boolean;

		"tobbys-turn-planner.movementMultiplier": number;
		"tobbys-turn-planner.baseMovementOverride": number;

		"tobbys-turn-planner.allowPathBeyondRange": boolean;
	}
	interface WorldSettings {
		"core.globalInterfaceVolume": number;

		//Audio
		"tobbys-turn-planner.gridSelectSound": string;
		"tobbys-turn-planner.enableGridSelectSound": boolean;
		"tobbys-turn-planner.gridTravelSound": string;
		"tobbys-turn-planner.enableGridTravelSound": boolean;

		"tobbys-turn-planner.enableDistanceLabelToken": boolean;

		"tobbys-turn-planner.movementMultiplier": number;
		"tobbys-turn-planner.baseMovementOverride": number;
		"tobbys-turn-planner.allowPathBeyondRange": boolean;
	}

	interface PlaceableObjectClassConfig {
		Token: typeof AerisToken;
	}
}

export {};
