/**
 * @typedef AbstractFormInputElement
 * @property {string} value  A hexadecimal string representation of the color.
 */
/**
 * A custom HTMLElement used to select a color and alpha
 * @extends {AbstractFormInputElement<string>}
 */
export class HTMLAlphaColorPickerElement {
    /** @override */
    static override tagName: string;
    /**
     * Create a HTMLAlphaColorPickerElement using provided configuration data.
     * @param {FormInputConfig} config
     * @returns {HTMLAlphaColorPickerElement}
     */
    static create(config: FormInputConfig): HTMLAlphaColorPickerElement;
    /**
     * @param {HTMLColorPickerOptions} [options]
     */
    constructor({ value }?: HTMLColorPickerOptions);
    /** @override */
    override _buildElements(): HTMLInputElement[];
    _primaryInput: HTMLInputElement;
    /** @override */
    override _refresh(): void;
    /** @override */
    override _activateListeners(): void;
    pickerOptions: {
        alpha: boolean;
        format: string;
        value: any;
    };
    value: any;
    /** @override */
    override _toggleDisabled(disabled: any): void;
    #private;
}
export type AbstractFormInputElement = {
    /**
     * A hexadecimal string representation of the color.
     */
    value: string;
};
