import * as vscode from "vscode";

const extensionShortName = "zenIndent";

function isArray(obj: unknown): obj is Array<unknown> {
	return Array.isArray(obj);
}

function isObject(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === "object" && !isArray(obj);
}

export function activate(context: vscode.ExtensionContext) {
	const zenIndent = new ZenIndent();

	vscode.workspace.onDidChangeConfiguration(
		(configEvent: vscode.ConfigurationChangeEvent) => {
			if (
				configEvent.affectsConfiguration(extensionShortName) ||
				configEvent.affectsConfiguration("workbench")
			) {
				zenIndent.updateConfigurations();
			}
		},
		null,
		context.subscriptions,
	);
	vscode.window.onDidChangeTextEditorSelection(
		(changeEvent: vscode.TextEditorSelectionChangeEvent) => {
			zenIndent.updateEditor(changeEvent.textEditor);
		},
		null,
		context.subscriptions,
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}

class ZenIndent {
	indentWidthByLanguageID = new Map<string, number>();
	decorations = new Map<number, vscode.TextEditorDecorationType>();

	constructor() {
		this.updateConfigurations();
	}

	updateConfigurations() {
		this.clearDecorations();
		for (const decorator of this.decorations.values()) {
			decorator.dispose();
		}

		const configurations =
			vscode.workspace.getConfiguration(extensionShortName);
		const enabled = configurations.get("enabled") ?? true;
		if (!enabled) {
			return;
		}

		const widthConfig = configurations.get("indentSize");

		this.indentWidthByLanguageID.clear();
		this.indentWidthByLanguageID.set("default", 4);
		if (typeof widthConfig === "number") {
			const [width, err] = this.validateWidth(widthConfig);
			if (width !== null) {
				this.indentWidthByLanguageID.set("default", width);
			} else {
				this.showInvalidConfigurationWarning(err);
			}
		} else if (isObject(widthConfig)) {
			for (const key in widthConfig) {
				if (typeof widthConfig[key] !== "number") {
					continue;
				}
				const [width, err] = this.validateWidth(widthConfig[key]);
				if (width === null) {
					this.showInvalidConfigurationWarning(err);
					continue;
				}
				for (const languageId of key.split(",")) {
					this.indentWidthByLanguageID.set(languageId, width);
				}
			}
		} else if (widthConfig !== undefined) {
			this.showInvalidConfigurationWarning("Value must be a number or an object");
		}

		this.decorations.clear();
		const diffWidths = Array.from(
			new Set(this.indentWidthByLanguageID.values()).values(),
		).sort((a, b) => a - b);

		for (const width of diffWidths) {
			if (width <= 0) {
				continue;
			}
			this.decorations.set(
				width,
				vscode.window.createTextEditorDecorationType({
					before: {
						contentText: "\u00A0".repeat(width), // Non-breaking space
						backgroundColor: new vscode.ThemeColor("zenIndent.indent"),
					},
					letterSpacing: "-10em", // Make spaces or a tab to zero width
				}),
			);
		}
		this.updateDecorations();
	}

	clearDecorations() {
		if (this.decorations === undefined) {
			return;
		}
		vscode.window.visibleTextEditors.forEach(this.clearEditor, this);
	}

	clearEditor(editor: vscode.TextEditor) {
		for (const decoration of this.decorations.values()) {
			editor.setDecorations(decoration, []);
		}
	}

	updateDecorations() {
		for (const editor of vscode.window.visibleTextEditors) {
			this.updateEditor(editor);
		}
	}

	updateEditor(editor: vscode.TextEditor) {
		const tabSize = this.getTabSize(editor);

		const whitespaceRanges = [];
		const defaultWidth = this.indentWidthByLanguageID.get("default") ?? 0;
		const width =
			this.indentWidthByLanguageID.get(editor.document.languageId) ??
			defaultWidth;

		console.log(`indentation width = ${width}`);

		const decoration = this.decorations.get(width);
		if (decoration === undefined) {
			return;
		}
		const { lineCount } = editor.document;
		for (let lineNum = 0; lineNum < lineCount; ++lineNum) {
			const line = editor.document.lineAt(lineNum).text;

			const lineLength = line.length;
			for (let charNum = 0; charNum < lineLength; ) {
				const ch = line[charNum];

				// Indent by tab
				if (ch === "\t") {
					whitespaceRanges.push(
						new vscode.Range(lineNum, charNum, lineNum, charNum + 1),
					);
					charNum++;
					continue;
				}

				// Indent by spaces
				const head = line.slice(charNum, charNum + tabSize);
				if (/^ +$/.test(head)) {
					whitespaceRanges.push(
						new vscode.Range(lineNum, charNum, lineNum, charNum + tabSize),
					);
					charNum += tabSize;
					continue;
				}

				// Not a whitespace
				break;
			}
		}

		editor.setDecorations(decoration, whitespaceRanges);
	}

	getTabSize(editor: vscode.TextEditor): number {
		if (typeof editor.options.tabSize === "number") {
			return editor.options.tabSize;
		}

		const lineCount = Math.max(50, editor.document.lineCount);
		let tabSize = 0;
		for (let lineNum = 0; lineNum < lineCount; ++lineNum) {
			const line = editor.document.lineAt(lineNum).text;
			const match = line.match(/^ {2,}/);
			if (match) {
				tabSize = gcd(tabSize, match[0].length);
			}
		}
		return tabSize;
	}

	validateWidth(width: number): [number | null, string] {
		if (width <= 0) {
			return [null, "Width must be greater than 0"];
		}
		const intWidth = Math.floor(width);
		if (intWidth !== width) {
			return [null, "Width must be an integer"];
		}
		return [intWidth, ""];
	}

	showInvalidConfigurationWarning(reason: string) {
		const message = `Invalid configuration for ${extensionShortName}.indentSize: ${reason}`;
		vscode.window.showWarningMessage(message, {
			modal: false,
		}, "Open Settings").then((result) => {
			if (result === "Open Settings") {
				vscode.commands.executeCommand(
					"workbench.action.openSettings",
					`${extensionShortName}.indentSize`,
				);
			}
		});
		// Log the message to the console
		console.warn(message);
	}
}

function gcd(aa: number, ab: number): number {
	let [a, b] = [aa, ab];
	while (b !== 0) {
		[a, b] = [b, a % b];
	}
	return a;
}