
import { MODULE_ID } from "../constants";
import { ColorPickerField } from "../types/colorPicker";
import { COLOR_FORMAT, colorSettings } from "./gridColor";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ColorConfigMenu extends HandlebarsApplicationMixin(ApplicationV2<any>) {
    static DEFAULT_OPTIONS = {
        classes: ["form"],
        id: "color-config",
        tag: "form",
        position: {
            width: 560,
        },
        form: {
            handler: ColorConfigMenu.#onSubmit,
            closeOnSubmit: true,
        },
        window: {
            contentClasses: ["standard-form"],
            title: "Color Config"
        },
    };

    static PARTS = {
        config: {
            template: "modules/tobbys-turn-planner/templates/colorConfigMenu.hbs"
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    /** @override */
    _getButtons() {
        return [
            { type: "submit", icon: "fa-solid fa-save", label: "Save" },
        ];
    }

    /** @override */
    async _prepareContext(_options: any) {
        type ColorSettingData = {key: string, value: string, settingData: any, type: ColorPickerField };
        let colorSettingsData: ColorSettingData[] = [];
        let buttons: any = [];
        let context = { colorSettingsData, buttons };
        for (const key of colorSettings) {
            const settingKey = MODULE_ID + "." + key;
            const settingData = game.settings!.settings.get(settingKey as any);
            const value = game.settings!.get(MODULE_ID, key as any) as string;
            context.colorSettingsData.push({key, value, settingData, type: new game.colorPicker!.ColorPickerField({ format: COLOR_FORMAT })});
        }

        context.buttons = [{ type: "submit", icon: "fa-solid fa-save", label: "MACRO.Save" }];
        return context;
    }

    static async #onSubmit(_event: SubmitEvent|Event, _form: HTMLFormElement, formData: FormDataExtended) {
		const settings = foundry.utils.expandObject(formData.object);
        for (let [k, v] of Object.entries(settings)) {
            game.settings!.set(MODULE_ID, (k as any), v);
        }
    }
}