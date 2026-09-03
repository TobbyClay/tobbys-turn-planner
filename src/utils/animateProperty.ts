import { getDeltaSeconds } from "./pixi";

export function animatePropertyDelta(
	getValue: () => number,
	setValue: (v: number) => void,
	deltaValue: number,
	duration: number,
	ease: (t: number) => number = (t) => t
): Promise<void> {
	return new Promise((resolve) => {
		const totalTime = duration / 1000;
		let elapsed = 0;
		let lastEased = 0;

		const ticker = () => {
			const deltaS = getDeltaSeconds();

			elapsed += deltaS;

			const t = Math.min(elapsed / totalTime, 1);

			const eased = ease(t);
			const diff = eased - lastEased;

			const actual = deltaValue * diff;
			setValue(getValue() + actual);

			lastEased = eased;

			if (t >= 1) {
				canvas!.app!.ticker.remove(ticker);
				resolve();
			}
		};

		canvas!.app!.ticker.add(ticker);
	});
}

export function animatePropertyRatio(
	getValue: () => number,
	setValue: (v: number) => void,
	multiplier: number,
	duration: number
): Promise<void> {
	return new Promise((resolve) => {
		const totalTime = duration / 1000;
		let elapsed = 0;
		let lastProgress = 0;

		const ticker = () => {
			const deltaS = getDeltaSeconds();
			elapsed += deltaS;

			const progress = Math.min(elapsed / totalTime, 1);

			const frameFraction = progress - lastProgress;
			lastProgress = progress;

			const frameMultiplier = Math.pow(multiplier, frameFraction);

			setValue(getValue() * frameMultiplier);

			if (progress >= 1) {
				canvas!.app!.ticker.remove(ticker);
				resolve();
			}
		};

		canvas!.app!.ticker.add(ticker);
	});
}

export function revertRotation(
	mesh: PIXI.DisplayObject,
	rotDiff: number,
	duration: number,
	ease: (x: number) => number = (x: number) => {
		return x * x;
	}
): Promise<void> {
	return animatePropertyDelta(
		() => mesh.rotation,
		(v) => (mesh.rotation = v),
		-rotDiff,
		duration,
		ease
	);
}

export function revertScaleMultiplier(
	mesh: PIXI.DisplayObject,
	finalMultiplier: number,
	duration: number
): Promise<void> {
	const revertFactor = 1 / finalMultiplier;
	return Promise.all([
		animatePropertyRatio(
			() => mesh.scale.x,
			(v) => (mesh.scale.x = v),
			revertFactor,
			duration
		),
		animatePropertyRatio(
			() => mesh.scale.y,
			(v) => (mesh.scale.y = v),
			revertFactor,
			duration
		),
	]).then(() => {});
}
