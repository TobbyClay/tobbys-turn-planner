import { MODULE_ID } from "../constants";

export const log = (...msg: any[]) => console.log(`${MODULE_ID} | `, ...msg);
