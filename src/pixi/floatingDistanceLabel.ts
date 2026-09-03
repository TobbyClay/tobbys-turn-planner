export function drawFloatingTokenLabel(
	container: PIXI.Container,
	text: string,
	{
		subHeader = "",
		baseFontSize = 36,
		baseGridSize = 100,
		textColor = 0xffffff,
		bgColor = 0x000000,
		bgAlpha = 0.4,
		outlineColor = 0x000000,
		padding = 8,
	} = {}
) {
	container.removeChildren();

	if (!text) return container;

	const gridSize = canvas!.grid?.sizeY ?? baseGridSize;
	const scaleFactor = gridSize / baseGridSize;

	const fontSize = baseFontSize * scaleFactor;

	const label = new PIXI.BitmapText(text, {
		fontName: "TrailFont",
		fontSize: fontSize,
		tint: textColor,
	});

	let subLabel: PIXI.BitmapText | null = null;
	if (subHeader) {
		subLabel = new PIXI.BitmapText(subHeader, {
			fontName: "TrailFont",
			fontSize: fontSize * 0.5,
			tint: textColor,
		});
	}

	const totalHeight =
		label.textHeight +
		(subLabel?.textHeight ?? 0) +
		(subLabel ? padding / 2 : 0);
	const maxWidth = Math.max(label.textWidth, subLabel?.textWidth ?? 0);

	const bg = new PIXI.Graphics();
	bg.lineStyle(2, outlineColor, 1);
	bg.beginFill(bgColor, bgAlpha);
	bg.drawRoundedRect(
		-maxWidth / 2 - padding,
		-totalHeight / 2 - padding,
		maxWidth + padding * 2,
		totalHeight + padding * 2,
		6
	);
	bg.endFill();

	let y = -totalHeight / 2;
	if (subLabel) {
		subLabel.position.set(-subLabel.textWidth / 2, y);
		y += subLabel.textHeight + padding / 2;
	}

	label.position.set(-label.textWidth / 2, y);

	if (subLabel) {
		container.addChild(bg, subLabel, label);
	} else {
		container.addChild(bg, label);
	}

	return container;
}
