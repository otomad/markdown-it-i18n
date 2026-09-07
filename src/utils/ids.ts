import { parseAttrs } from "./attrs.js";

/**
 * Collect all IDs in a markdown source code.
 * Including IDs in both markdown attrs and plain HTML attrs.
 */
export function collectAllIds(md: string): Set<string> {
	const ids = new Set<string>();
	const len = md.length;
	let i = 0;

	while (i < len) {
		const ch = md[i];

		// Skip HTML comments (they may contain `>` inside, so handle them before tags).
		if (md.startsWith("<!--", i)) {
			const end = md.indexOf("-->", i + 4);
			i = end === -1 ? len : end + 3;
			continue;
		}

		// Skip fenced code blocks and inline code spans.
		if (ch === "`" || ch === "~") {
			if (isFenceStart(md, i)) {
				i = skipFence(md, i);
				continue;
			}
			if (ch === "`") {
				i = skipInlineCode(md, i);
				continue;
			}
			// A `~` run that is not a fence is just plain text (e.g., strikethrough).
		}

		// Collect IDs declared in plain HTML tags.
		if (ch === "<") {
			i = parseHtmlTag(md, i, ids);
			continue;
		}

		// Collect IDs declared in markdown attribute blocks `{...}`.
		if (ch === "{") {
			i = parseMarkdownAttrs(md, i, ids);
			continue;
		}

		i++;
	}

	return ids;
}

/**
 * Whether `md[i]` starts a fenced code block (a run of ``` or ~~~, at least 3 chars, at the start of a line).
 */
function isFenceStart(md: string, i: number): boolean {
	const ch = md[i];
	if (ch !== "`" && ch !== "~") return false;

	let j = i;
	while (j < md.length && md[j] === ch) j++;
	if (j - i < 3) return false;

	// The fence must be the first non-whitespace char on its line.
	let k = i - 1;
	while (k >= 0 && (md[k] === " " || md[k] === "\t")) k--;
	return k < 0 || md[k] === "\n";
}

/**
 * Skip a fenced code block and return the index just past its closing fence.
 */
function skipFence(md: string, i: number): number {
	const ch = md[i];
	let j = i;
	while (j < md.length && md[j] === ch) j++;
	const openLen = j - i;

	let pos = j;
	while (pos < md.length) {
		const nl = md.indexOf("\n", pos);
		const lineEnd = nl === -1 ? md.length : nl;

		// First non-whitespace char of this line.
		let k = pos;
		while (k < lineEnd && (md[k] === " " || md[k] === "\t")) k++;

		// Count the fence char run.
		let run = 0;
		while (k + run < lineEnd && md[k + run] === ch) run++;

		// A closing fence must be at least as long as the opening one, followed by whitespace only.
		if (run >= openLen) {
			let rest = k + run;
			while (rest < lineEnd && (md[rest] === " " || md[rest] === "\t")) rest++;
			if (rest === lineEnd) {
				return nl === -1 ? md.length : nl + 1;
			}
		}

		pos = nl === -1 ? md.length : nl + 1;
	}

	return md.length;
}

/**
 * Skip an inline code span and return the index just past its closing backtick run.
 */
function skipInlineCode(md: string, i: number): number {
	let j = i;
	while (j < md.length && md[j] === "`") j++;
	const runLen = j - i;

	let pos = j;
	while (pos < md.length) {
		const k = md.indexOf("`", pos);
		if (k === -1) return md.length;
		let run = 0;
		while (k + run < md.length && md[k + run] === "`") run++;
		if (run === runLen) return k + run;
		pos = k + run;
	}
	return md.length;
}

/**
 * Parse an HTML tag starting at `<`, collecting the value of every `id` attribute.
 * Returns the index just past the closing `>` of the tag.
 */
function parseHtmlTag(md: string, start: number, ids: Set<string>): number {
	const len = md.length;
	const next = md[start + 1];

	// Closing tag, doctype, or processing instruction: skip to the next `>`.
	if (next === "/" || next === "!" || next === "?") {
		const end = md.indexOf(">", start);
		return end === -1 ? len : end + 1;
	}

	// Not a tag name — treat `<` as ordinary text.
	if (!next || !/[a-zA-Z]/.test(next)) {
		return start + 1;
	}

	// Parse the tag name.
	let i = start + 1;
	while (i < len && /[a-zA-Z0-9-]/.test(md[i])) i++;

	// Parse attributes until the tag closes.
	while (i < len) {
		while (i < len && /\s/.test(md[i])) i++;
		if (i >= len) return len;

		const ch = md[i];
		if (ch === ">") return i + 1;
		if (ch === "/" && md[i + 1] === ">") return i + 2;

		// Attribute name.
		const nameStart = i;
		while (i < len && !/[\s=/>]/.test(md[i])) i++;
		const name = md.slice(nameStart, i).toLowerCase();

		// Optional `=` and value.
		while (i < len && /\s/.test(md[i])) i++;
		let value = "";
		if (md[i] === "=") {
			i++;
			while (i < len && /\s/.test(md[i])) i++;
			if (md[i] === '"' || md[i] === "'") {
				const quote = md[i++];
				const valueStart = i;
				while (i < len && md[i] !== quote) i++;
				value = md.slice(valueStart, i);
				if (i < len) i++; // Skip the closing quote.
			} else {
				const valueStart = i;
				while (i < len && !/[\s>]/.test(md[i])) i++;
				value = md.slice(valueStart, i);
			}
		}

		if (name === "id" && value) ids.add(value);
	}

	return len;
}

/**
 * Parse a markdown attribute block `{...}` starting at `start`, collecting any IDs.
 * Returns the index just past the closing `}` (or the string length if unclosed).
 */
function parseMarkdownAttrs(md: string, start: number, ids: Set<string>): number {
	let i = start + 1;
	let inQuote = "";
	let escaped = false;

	while (i < md.length) {
		const ch = md[i];
		if (escaped) {
			escaped = false;
		} else if (inQuote) {
			if (ch === "\\") escaped = true;
			else if (ch === inQuote) inQuote = "";
		} else if (ch === '"' || ch === "'") {
			inQuote = ch;
		} else if (ch === "}") {
			const inner = md.slice(start + 1, i);
			for (const attr of parseAttrs(inner)) {
				if (attr.type === "id" && attr.value) ids.add(attr.value);
			}
			return i + 1;
		}
		i++;
	}

	return md.length;
}
