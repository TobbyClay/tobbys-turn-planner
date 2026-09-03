import { MovementMode } from "./movement";

export type LocalPaintData = {
    basePaintedTiles: Offset[];
    basePaintedKeys: Set<string>;
    previewPaintedTiles: Offset[];
    previewDistMap: Map<string, number>;
    currentMode: MovementMode;
    uncapped: boolean | null;
};
