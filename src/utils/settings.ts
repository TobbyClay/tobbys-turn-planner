export function isAutoRotateEnabled() {
    return game.settings?.get("core", "tokenAutoRotate") ?? false;
}
