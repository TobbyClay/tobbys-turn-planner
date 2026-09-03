export function isModuleActive(module: string) {
	const mod = game.modules?.get(module);
	return mod && mod.active;
}
