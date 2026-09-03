import { SocketLib } from "./socketlib";

declare global {
    var socketlib: SocketLib;
    var aerisCinema: {
        panToTargetScaleViaTicker: (
            mouseWorld: {
                x: number;
                y: number;
            },
            targetScale: number
        ) => void;
        panKeepEventViewportPosition: (
            origin: { x: number; y: number },
            paddedPositions: Vec4[]
        ) => Promise<{ scale: number; pivot: { x: number; y: number } } | null>;
    };
    interface GlobalThis {
        socketlib: SocketLib;
        aerisCinema: typeof aerisCinema;
    }
    interface Window {
        __customPan?: boolean;
    }

    namespace foundry {
        namespace canvas {
            namespace geometry {
                export import ClockwiseSweepPolygon = globalThis.ClockwiseSweepPolygon;
            }
        }
        namespace applications {
            namespace apps {
                export import FilePicker = globalThis.FilePicker;
            }
        }
    }
}
