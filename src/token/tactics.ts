import { socketlibSocket } from "../socket/_socket";
import { Offset } from "../types/canvas";
import { AerisToken } from "./aerisToken";

export async function tacticsBroadcastSetQueuedPositionOffset(
	tokenId: string,
	offset: Offset | null
) {
	await socketlibSocket?.executeForEveryone(
		"tacticsHandleSetQueuedPositionOffset",
		tokenId,
		offset
	);
}

export function tacticsHandleSetQueuedPositionOffset(
	tokenId: string,
	offset: Offset | null
) {
	const token = canvas!.tokens?.get(tokenId) as AerisToken | undefined;
	if (!token) return;

	token.queuedPositionOffset = offset;
}
