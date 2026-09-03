import { registerAllowPathBeyondRangeSetting } from "./allowOutOfGrid";
import { registerAutoPathSetting } from "./autoPath";
import { registerCameraPanPaddingSetting } from "./cameraPadding";
import { registerMovementBehaviourSetting } from "./enableGrid";
import { registerEnableOthersPreviewSetting } from "./enableOthersPreview";
import { registerGridColorSettings } from "./gridColor";
import { registerEnableDistanceLabelSettings } from "./gridDistance";
import { registerEnableGridPaintingSetting } from "./gridRangeMap";
import { registerGridMovementSoundSetting } from "./gridSound";
import { registerScaleJumpFactorSetting } from "./jumpPercent";
import { registerMoveCameraOnHoldSetting } from "./moveCameraOnHold";
import { registerMovementEngineSetting } from "./movementEngine";
import { registerEnableCombatMovementHistorySetting } from "./movementHistory";
import { registerMovementMultiplier } from "./movementMultiplier";
import { registerMovementDataPathSetting } from "./movementPropertyPath";
import { registerTokenMoveSpeedSetting } from "./tokenSpeed";
import { registerTurnPlannerSettings } from "./turnPlanner";
import { registerUncapExplorationSetting } from "./uncapExploration";
import { registerWorldFont } from "./worldFont";

// TODO CLEAN UP SETTING CATEGORIES
export function registerSettings() {
	registerTurnPlannerSettings();
	registerMovementEngineSetting();
	registerMovementBehaviourSetting();
	registerUncapExplorationSetting();
	registerMovementDataPathSetting();
	registerGridMovementSoundSetting();
	registerEnableDistanceLabelSettings();
	registerGridColorSettings();
	registerMovementMultiplier();
	registerScaleJumpFactorSetting();
	registerTokenMoveSpeedSetting();
	registerAllowPathBeyondRangeSetting();
	registerWorldFont();
	registerAutoPathSetting();
	registerMoveCameraOnHoldSetting();
	registerCameraPanPaddingSetting();
	registerEnableCombatMovementHistorySetting();
	registerEnableGridPaintingSetting();
	registerEnableOthersPreviewSetting();
}
