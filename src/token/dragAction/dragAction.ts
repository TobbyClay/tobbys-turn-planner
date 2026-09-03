import { AerisToken } from "../aerisToken";
import { MovementDataProvider } from "../dataProvider/dataProvider";

export class DragActionHandler {
    private movementData: MovementData[] = [];
    private _currentAction: MovementMode | null = null;

    constructor(private token: AerisToken) {}

    startDrag(provider: MovementDataProvider) {
        const data = provider.get(this.token.actor);
        this.movementData = data.length ? data : [{ mode: "walk", ranges: [] }];
        if (
            !this._currentAction ||
            !this.movementData.some((m) => m.mode === this._currentAction)
        ) {
            this._currentAction = this.movementData[0].mode;
        }
    }

    endDrag() {
        this.movementData = [];
    }

    get currentAction(): MovementMode {
        return this._currentAction ?? this.movementData[0]?.mode ?? "walk";
    }

    setCurrentAction(mode: MovementMode) {
        this._currentAction = mode;
        this.token.document.update({ movementAction: mode });
    }

    handleTab(reverse = false): MovementMode {
        if (!this.movementData.length) return this.currentAction;

        const modes = this.movementData.map((e) => e.mode);
        let idx = modes.indexOf(this.currentAction);
        if (idx === -1) idx = 0;

        idx = (idx + (reverse ? -1 : 1) + modes.length) % modes.length;

        const nextMode = modes[idx];
        this.setCurrentAction(nextMode);

        this.token.recalculatePlannedMovementPath();

        return nextMode;
    }

    getRangesForMode(mode: MovementMode): MovementRange[] {
        return this.movementData.find((e) => e.mode === mode)?.ranges ?? [];
    }

    getMaxMovementData(): MovementData | null {
        if (!this.movementData.length) return null;

        return this.movementData.reduce((max, current) => {
            const maxTotal = max.ranges.reduce((a, b) => a + b.value, 0);
            const currTotal = current.ranges.reduce((a, b) => a + b.value, 0);
            return currTotal > maxTotal ? current : max;
        });
    }

    hasSnapshot(): boolean {
        return this.movementData.length > 0;
    }
}
