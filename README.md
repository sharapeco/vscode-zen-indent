# Zen Indent

**Zen Indent** is a VS Code extension that ensures visually consistent indentation, regardless of the actual characters or number of spaces used.

This extension normalizes the _visual width_ of indentation in the editor, so that code looks aligned and calm—whether it's using tabs, 2-space, 4-space, or even a mix. It’s especially helpful when working in codebases with inconsistent indentation styles or when switching between projects with different formatting conventions.

## ✨ Features

- Adjusts indentation rendering to ensure visual uniformity
- Works regardless of tab/space configuration or nesting level
- Non-intrusive: no changes to actual file contents

## 💡 Ideal For

- Developers working across multiple codebases with varying styles
- Anyone who prefers visual clarity and alignment
- Teams wanting consistent code appearance without enforcing a specific format

Zen Indent doesn’t force any formatting rules—it simply brings visual peace to your editor.

## 🔧 Extension Settings

This extension contributes the following settings:

* `zenIndent.enable`: Enable/disable this extension.
* `zenIndent.indentSize`: Set the visual width of indentation. Default is 4 spaces.

You can also configure indentation size per language by setting specific values in `zenIndent.indentSize`. For example:

```json
"zenIndent.indentSize": {
	"javascript": 2,
	"python": 4
}
```
