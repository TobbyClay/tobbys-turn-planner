import "http://localhost:30001/modules/tobbys-turn-planner/@vite/client";

window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.global = window;

import("http://localhost:30001/modules/tobbys-turn-planner/src/main.ts");
