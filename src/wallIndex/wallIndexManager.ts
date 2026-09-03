import { HexagonalGrid } from "../types/canvas";
import { debounce } from "../utils/debounce";
import { getGridIntersections, hexLineOffsets } from "../utils/hexLineOffsets";
import { getRowsCol } from "../utils/rowsCols";

type Segment = {
	a: PIXI.Point;
	b: PIXI.Point;
	edge: foundry.canvas.geometry.edges.Edge;
};

export type CellRef = { row: number; col: number; segment: Segment };

class WallIndexManager {
	private _wallIndex: Segment[][][] = [];
	private _wallToCells = new Map<WallDocument, CellRef[]>();
	private _pendingWallUpdates = new Set<foundry.canvas.geometry.edges.Edge>();

	private _buildId = 0;
	private _isRebuilding = false;

	rebuild() {
		this._debouncedRebuild();
	}

	private _debouncedRebuild = debounce(() => this._rebuild(), 1000);

	private _rebuild() {
		const buildId = ++this._buildId;
		this._isRebuilding = true;

		const { ROWS, COLS } = getRowsCol();
		const rows = ROWS;
		const cols = COLS;

		const index: Segment[][][] = Array.from({ length: rows }, () =>
			Array.from({ length: cols }, () => [])
		);
		const map = new Map<WallDocument, CellRef[]>();

		const isHexagonal = canvas!.grid?.isHexagonal;

		for (const edge of canvas!.edges.values()) {
			const { a, b } = edge;

			const walk = isHexagonal
				? hexLineOffsets(a, b, canvas!.grid as HexagonalGrid)
				: getGridIntersections(a, b, canvas!.grid?.size ?? 100);

			const segments: CellRef[] = [];

			for (const { i, j } of walk) {
				if (!index[i]?.[j]) continue;
				const segment = { a: edge.a, b: edge.b, edge };
				index[i][j].push(segment);
				segments.push({ row: i, col: j, segment });
			}

			const doc = edge.object?.document;
			if (doc && edge.type === "wall") map.set(doc as WallDocument, segments);

			// Early bailout for newer rebuild requests
			if (buildId !== this._buildId) return;
		}

		if (buildId === this._buildId) {
			this._wallIndex = index;
			this._wallToCells = map;

			while (this._pendingWallUpdates.size > 0) {
				const updates = new Set(this._pendingWallUpdates);
				this._pendingWallUpdates.clear();

				for (const edge of updates) {
					this._applyWallUpdate(edge);
				}
			}

			Hooks.callAll("wallIndexBuilt");
			this._isRebuilding = false;
		}
	}

	updateWall(edge: foundry.canvas.geometry.edges.Edge) {
		if (this._isRebuilding) {
			this._pendingWallUpdates.add(edge);
			return;
		}

		const updates = this._applyWallUpdate(edge);

		if (updates) Hooks.callAll("wallIndexUpdated", updates);
	}

	private _applyWallUpdate(
		edge: foundry.canvas.geometry.edges.Edge
	): CellRef[] | void {
		const doc = edge.object?.document as WallDocument | undefined;
		if (!doc) return;

		const old = this._wallToCells.get(doc);
		if (old) {
			for (const { row, col, segment } of old) {
				const cell = this._wallIndex[row]?.[col];
				const i = cell?.indexOf(segment);
				if (cell && i >= 0) cell.splice(i, 1);
			}
		}

		const { a, b } = edge;
		const size = canvas?.grid?.size ?? 100;
		const [minX, maxX] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
		const [minY, maxY] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
		const x0 = Math.floor(minX / size),
			x1 = Math.floor(maxX / size);
		const y0 = Math.floor(minY / size),
			y1 = Math.floor(maxY / size);

		const newRefs: CellRef[] = [];

		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				if (!this._wallIndex[y]?.[x]) continue;
				const segment = { a, b, edge };
				this._wallIndex[y][x].push(segment);
				newRefs.push({ row: y, col: x, segment });
			}
		}

		this._wallToCells.set(doc, newRefs);

		return newRefs;
	}

	removeWall(wall: WallDocument): CellRef[] | void {
		const old = this._wallToCells.get(wall);
		if (!old) return;

		for (const { row, col, segment } of old) {
			const cell = this._wallIndex[row]?.[col];
			const i = cell?.indexOf(segment);
			if (cell && i >= 0) cell.splice(i, 1);
		}

		this._wallToCells.delete(wall);
		Hooks.callAll("wallIndexUpdated", old);

		return old;
	}

	getIndex(): Segment[][][] {
		return this._wallIndex;
	}

	getSegmentsForWall(doc: WallDocument): Segment[] {
		return this._wallToCells.get(doc)?.map((ref) => ref.segment) ?? [];
	}
}

export const wallIndexManager = new WallIndexManager();
