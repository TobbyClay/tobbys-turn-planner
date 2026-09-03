/**
 * A field for picking a color and alpha
 */
export class ColorPickerField {
    constructor(options?: { format: string });
    /** @inheritdoc */
    static get _defaults(): any;
    /** @inheritdoc */
    _validateType(value: any, options: any): any;
    isAlphaColorString(color: any): boolean;
    createPickerInput(config: any): HTMLInputElement;
    /** @override */
    override _toInput(config: any): HTMLAlphaColorPickerElement;
}
import { HTMLAlphaColorPickerElement } from './alpha-color-picker-element.js';

declare global {
    namespace ColorPickerModule {
        class ColorPickerField {}
    }

    interface ColorPickerModule {
        ColorPickerField : ColorPickerField;
    }

    interface Game {
        colorPicker: {
            ColorPickerField: typeof ColorPickerField;
        };
    }
}