let activePlanningTokenId: string | null = null;

export function setActivePlanningToken(tokenId: string | null) {
    activePlanningTokenId = tokenId;
}

export function isPlanningToken(tokenId: string | null | undefined): boolean {
    return !!tokenId && activePlanningTokenId === tokenId;
}
