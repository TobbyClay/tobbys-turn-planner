import { socketlibSocket } from "../socket/_socket";
import { AerisToken } from "./aerisToken";
import { CostOffset } from "./trail/costPath";

export async function explorationBroadcastJumpTo(
	tokenId: string,
	offset: CostOffset
) {
	await socketlibSocket?.executeForEveryone(
		"explorationHandleJumpTo",
		tokenId,
		offset
	);
}

export function explorationHandleJumpTo(tokenId: string, offset: CostOffset) {
	const token = canvas!.tokens?.get(tokenId) as AerisToken | undefined;
	if (!token) return;

	token.jumpHandler.enqueueJumps([offset], false, true);

	token.queuedPositionOffset = offset;
}
