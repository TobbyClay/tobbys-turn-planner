export function disablePixiInteraction(displayObject: PIXI.DisplayObject) {
    const object = displayObject as PIXI.DisplayObject & {
        eventMode?: string;
        interactive?: boolean;
        interactiveChildren?: boolean;
    };

    object.eventMode = "none";
    object.interactive = false;
    object.interactiveChildren = false;
}
