export function getGameInterfaceVolume(): number {
    return Number(
        game.settings?.storage.get("client")?.["core.globalInterfaceVolume"] ??
            "1"
    );
}
