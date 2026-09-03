import fs from "fs";
import path from "path";

const root = process.cwd();
const builtModule = path.join(root, "tobbys-turn-planner");
const builtBundle = path.join(builtModule, "main.bundle.js");
const rootBundle = path.join(root, "main.bundle.js");

if (!fs.existsSync(builtBundle)) {
    throw new Error(`Missing built bundle: ${builtBundle}`);
}

fs.copyFileSync(builtBundle, rootBundle);
console.log("Copied built bundle to module root.");
