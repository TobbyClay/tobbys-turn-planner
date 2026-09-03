export function patchTokenLayer() {
    libWrapper.register(
        "tobbys-turn-planner",
        "foundry.canvas.layers.TokenLayer.prototype._onCycleViewKey",
        function (this: TokenLayer, wrapped, event) {
            const handled = wrapped.call(this, event);

            //@ts-expect-error untyped
            if (handled && this._draggedToken?.dragActionHandler) {
                //@ts-expect-error untyped
                this._draggedToken.dragActionHandler.handleTab(event.shiftKey);
            }
            return handled;
        },
        "MIXED"
    );
}
