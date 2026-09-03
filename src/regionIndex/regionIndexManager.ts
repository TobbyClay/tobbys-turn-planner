import { debounce } from "../utils/debounce";
import { getRowsCol } from "../utils/rowsCols";
import { regionCellOffsets } from "./regionCellOffsets";

export type RegionCellRef = {
    k: number;
    row: number;
    col: number;
    region: RegionDocument;
};

class RegionIndexManager {
    private _regionIndex: RegionDocument[][][][] = []; // [k][row=j][col=i]
    private _multIndex: Record<string, number>[][][] = []; // same layout

    private _regionToCells = new Map<RegionDocument, RegionCellRef[]>();
    private _pendingRegionUpdates = new Set<RegionDocument>();
    private _buildId = 0;
    private _isRebuilding = false;

    rebuild() {
        this._debouncedRebuild();
    }

    updateRegion(region: RegionDocument) {
        if (this._isRebuilding) {
            this._pendingRegionUpdates.add(region);
            return;
        }
        const refs = this._applyRegionUpdate(region);
        if (refs) Hooks.callAll("regionIndexUpdated", refs);
    }

    removeRegion(region: RegionDocument): RegionCellRef[] | void {
        const refs = this._regionToCells.get(region);
        if (!refs) return;

        for (const { k, row: i, col: j } of refs) {
            const bucket = this._regionIndex[k]?.[i]?.[j];
            if (bucket) bucket.splice(bucket.indexOf(region), 1);
            delete this._multIndex[k]?.[i]?.[j];
        }
        this._regionToCells.delete(region);
        Hooks.callAll("regionIndexUpdated", refs);
        return refs;
    }

    getRegions(k: number, i: number, j: number): RegionDocument[] {
        return this._regionIndex[k]?.[i]?.[j] ?? [];
    }

    getMultiplier(k: number, i: number, j: number, mode: string): number {
        return this._multIndex[k]?.[i]?.[j]?.[mode] ?? 1;
    }

    private _debouncedRebuild = debounce(() => this._rebuild(), 500);

    private _rebuild() {
        const buildId = ++this._buildId;
        this._isRebuilding = true;

        this._regionIndex = [];
        this._multIndex = [];
        this._regionToCells.clear();

        for (const regionDoc of canvas!.scene?.regions ?? []) {
            const regionObj = (regionDoc as any).object as Region | undefined;
            if (!regionObj) continue;

            const covered = regionCellOffsets(regionDoc, regionObj);
            const refs: RegionCellRef[] = [];

            for (const { i, j, k } of covered) {
                this._ensureSlice(k);
                this._regionIndex[k][i][j].push(regionDoc);
                applyMovementBehaviours(
                    this._multIndex[k][i][j],
                    regionDoc.behaviors.contents
                );
                refs.push({ k, row: i, col: j, region: regionDoc });
            }
            this._regionToCells.set(regionDoc, refs);
            if (buildId !== this._buildId) return;
        }

        while (this._pendingRegionUpdates.size) {
            const batch = new Set(this._pendingRegionUpdates);
            this._pendingRegionUpdates.clear();
            for (const r of batch) this._applyRegionUpdate(r);
        }

        Hooks.callAll("regionIndexBuilt");
        this._isRebuilding = false;
    }

    private _applyRegionUpdate(
        regionDoc: RegionDocument
    ): RegionCellRef[] | void {
        this.removeRegion(regionDoc);
        const regionObj = (regionDoc as any).object as Region | undefined;
        if (!regionObj) return;

        const covered = regionCellOffsets(regionDoc, regionObj);
        const refs: RegionCellRef[] = [];

        for (const { i, j, k } of covered) {
            this._ensureSlice(k);
            this._regionIndex[k][i][j].push(regionDoc);
            applyMovementBehaviours(
                this._multIndex[k][i][j],
                regionDoc.behaviors.contents
            );
            refs.push({ k, row: i, col: j, region: regionDoc });
        }
        this._regionToCells.set(regionDoc, refs);
        return refs;
    }

    private _ensureSlice(k: number) {
        if (this._regionIndex[k]) return;
        const { ROWS, COLS } = getRowsCol();
        this._regionIndex[k] = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => [])
        );
        this._multIndex[k] = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => ({}))
        );
    }
}

export const regionIndexManager = new RegionIndexManager();

function applyMovementBehaviours(
    cell: Record<string, number>,
    behaviours: RegionBehavior[]
) {
    for (const b of behaviours) {
        if ((b as any).type !== "modifyMovementCost") continue;
        const sys = (b as any).system;
        const diffs = sys?.difficulties ?? {};
        for (const mode of Object.keys(diffs)) {
            const m = diffs[mode];
            if (m == null || m === 1) continue;
            cell[mode] = (cell[mode] ?? 1) * m;
        }
    }
}
