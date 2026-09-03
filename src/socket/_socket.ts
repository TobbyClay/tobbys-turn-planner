import { MODULE_ID } from "../constants";
import {
    handleDragEnd,
    handleSetDraggerUserId,
    handleTokenDragCancel,
} from "../token/aerisToken";
import { explorationHandleJumpTo } from "../token/exploration";
import { handleBroadcastPaint } from "../token/graphics/tokenPathGraphicsHandler";
import { tacticsHandleStartPreview } from "../token/preview/tokenPreviewPathHandler";
import { tacticsHandleSetQueuedPositionOffset } from "../token/tactics";
import { SocketLibType } from "../types/socketlib";
import { resolveWildcardMatches } from "../utils/resolveWildcard";

export var socketlibSocket: SocketLibType | undefined = undefined;

export const socketFunctions = {
    handleBroadcastPaint,
    handleSetDraggerUserId,
    tacticsHandleSetQueuedPositionOffset,
    tacticsHandleStartPreview,
    explorationHandleJumpTo,
    resolveWildcardMatches,
    handleDragEnd,
    handleTokenDragCancel,
};

export const setupSocket = () => {
    socketlibSocket = globalThis.socketlib.registerModule(MODULE_ID);
    if (!socketlibSocket) {
        console.error("Failed to register socketlib module.");
        return;
    }

    for (const [name, fn] of Object.entries(socketFunctions) as [
        keyof typeof socketFunctions,
        (...args: any[]) => any
    ][]) {
        socketlibSocket.register(name, fn);
    }
};
