import { regionIndexManager } from "../../regionIndex/regionIndexManager";
import { MinHeap } from "../../structures/minHeap";
import { HexagonalGrid, Offset } from "../../types/canvas";
import { useAlternateDiagonalCost } from "../../utils/diagonals";
import { CUBE_NEIGHBORS, SQ_DIRS } from "../../utils/directions";
import { maxMovementRange } from "../../utils/movement";
import { AerisToken } from "../aerisToken";
import { isLegalStep } from "./isLegalStep";

type OffsetNode = {
    coord: Offset;
    penalisedCost: number;
    realCost: number;
    parity: 0 | 1;
};

export type CostOffset = Offset & {
    cost: number;
    parity: 0 | 1;
    mode: MovementMode;
    validRange: boolean;
};

export function costPath(
    start: CostOffset,
    goal: Offset,
    token: AerisToken,
    mode: MovementMode,
    uncap: boolean,
    rangesOverride?: MovementRange[]
): CostOffset[] {
    const width = token.document.width ?? 1;
    const height = token.document.height ?? 1;

    const stateKey = (t: Offset, p: 0 | 1) => `${t.j},${t.i},${p}`;

    const heap = new MinHeap<OffsetNode>((a, b) => {
        if (a.penalisedCost !== b.penalisedCost)
            return a.penalisedCost - b.penalisedCost;
        return a.parity - b.parity;
    });
    const dist = new Map<string, number>();
    const realDist = new Map<string, number>();
    const prev = new Map<string, string>();

    // seed
    const startKey = stateKey(start, start.parity);
    dist.set(startKey, start.cost);
    realDist.set(startKey, start.cost);
    heap.push({
        coord: start,
        penalisedCost: start.cost,
        realCost: start.cost,
        parity: start.parity,
    });

    const useAlternateDiagCost = useAlternateDiagonalCost();

    let foundKey: string | null = null;

    const isHexagonal = !!canvas?.grid?.isHexagonal;

    while (!heap.isEmpty()) {
        const {
            coord: cur,
            penalisedCost: curCost,
            realCost: curRealCost,
            parity,
        } = heap.pop()!;
        //@ts-expect-error undefined
        globalThis.heap = heap;

        const curKey = stateKey(cur, parity);

        // skip stale
        if (curCost !== dist.get(curKey)) continue;

        // goal reached
        if (cur.i === goal.i && cur.j === goal.j) {
            foundKey = curKey;
            break;
        }

        let neighbors: Offset[];
        if (isHexagonal) {
            const hexGrid = canvas.grid as HexagonalGrid;
            const cube = hexGrid.offsetToCube(cur);
            neighbors = CUBE_NEIGHBORS.map(({ dq, dr, ds }) => {
                const nbCube = {
                    q: cube.q + dq,
                    r: cube.r + dr,
                    s: cube.s + ds,
                };
                return hexGrid.cubeToOffset(nbCube);
            });
        } else {
            neighbors = SQ_DIRS.map((d) => ({
                j: cur.j + d.j,
                i: cur.i + d.i,
            }));
        }

        for (const nb of neighbors) {
            // cost and parity
            const isDiag = !isHexagonal && nb.j !== cur.j && nb.i !== cur.i;
            const newParity = (parity ^ (isDiag ? 1 : 0)) as 0 | 1;
            let stepCost = 1;
            if (isDiag && useAlternateDiagCost && newParity === 0) {
                stepCost = 2;
            }
            const terrainMult = regionIndexManager.getMultiplier(
                0,
                nb.i,
                nb.j,
                mode
            );

            stepCost *= terrainMult;

            const newRealCost = curRealCost + stepCost;

            const legal = isLegalStep(cur, nb, width, height);

            if (legal === undefined) continue;
            if (legal === false) continue;

            const nextPenalisedCost = curCost + stepCost;
            const nbKey = stateKey(nb, newParity);
            if (nextPenalisedCost >= (dist.get(nbKey) ?? Infinity)) {
                continue;
            }

            dist.set(nbKey, nextPenalisedCost);
            realDist.set(nbKey, newRealCost);
            prev.set(nbKey, curKey);
            heap.push({
                coord: nb,
                penalisedCost: nextPenalisedCost,
                realCost: newRealCost,
                parity: newParity,
            });
        }
    }

    if (!foundKey) return [];

    const ranges = rangesOverride ?? token.dragActionHandler.getRangesForMode(mode);
    const max = Math.floor(
        maxMovementRange(ranges) / (canvas?.grid?.distance ?? 1)
    );

    const path: CostOffset[] = [];
    let k: string | undefined = foundKey;
    while (k) {
        const [xs, ys, ps] = k.split(",");
        path.unshift({
            j: +xs,
            i: +ys,
            cost: realDist.get(k)!,
            parity: +ps as 0 | 1,
            mode,
            validRange: uncap ? true : dist.get(k)! <= max,
        });
        k = prev.get(k);
    }

    return path;
}
