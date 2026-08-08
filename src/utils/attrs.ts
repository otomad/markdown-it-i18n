export function replaceId(source: string, replacer: (oldId: string) => string): string {
	const block = findBlockAttr(source);

	// 1. No block attrs
	if (!block) {
		const newId = replacer(undefined!);
		if (!newId) return source; // falsy → do not add

		const attrStr = buildIdAttr(newId);
		// Add attrs after the last non-whitespace char, preserve original whitespaces.
		let lastNonSpace = source.length - 1;
		while (lastNonSpace >= 0 && isSpace(source[lastNonSpace])) lastNonSpace--;
		const prefix = source.substring(0, lastNonSpace + 1);
		const tailSpaces = source.substring(lastNonSpace + 1);
		return `${prefix} {${attrStr}}${tailSpaces}`;
	}

	// 2. Exist block attrs
	const inner = block.attr.slice(1, -1);
	const attrs = parseAttrs(inner);

	let oldId: string | undefined;
	const newAttrParts: string[] = [];

	for (const attr of attrs) {
		if (attr.type === "id") {
			oldId = attr.value;
			// The old id attr will not add to newAttrParts, equivalent to delete.
		} else {
			newAttrParts.push(attr.raw);
		}
	}

	const newId = replacer(oldId!);
	if (newId) {
		newAttrParts.push(buildIdAttr(newId));
	}

	const newInner = newAttrParts.join(" ");
	// Original separated whitespace char (i.e. the char before `{`)
	const sepIdx = block.start - 1;
	const separator = source[sepIdx]; // Must be a whitespace.
	const afterBlock = source.substring(block.end + 1); // The part after the attrs (includes trailing whitespaces).

	if (newInner.length === 0) {
		// Delete the whole block attrs with the leading whitespace, preserve the part after.
		return source.substring(0, sepIdx) + afterBlock;
	}

	const replacement = `${separator}{${newInner}}`;
	return source.substring(0, sepIdx) + replacement + afterBlock;
}

/**
 * Check if the character is a Unicode whitespace.
 */
function isSpace(ch: string): boolean {
	// Use Regex /\s/ can fill almost every common whitespaces (spaces, tabs, line breaks),
	// Although line breaks hardly ever appear in a inline string, it's still safe.
	return /\s/.test(ch);
}

/**
 * Check the position of block attributes (line end, with a leading whitespace character).
 */
export function findBlockAttr(s: string): { start: number; end: number; attr: string } | null {
	let i = s.length - 1;
	while (i >= 0 && isSpace(s[i])) i--;
	if (i < 0 || s[i] !== "}") return null;

	let depth = 0;
	let inString = false;
	let stringChar = "";
	let escape = false;
	const end = i;

	for (let j = i; j >= 0; j--) {
		const ch = s[j];
		if (escape) {
			escape = false;
			continue;
		}
		if (inString) {
			if (ch === "\\") {
				escape = true;
			} else if (ch === stringChar) {
				inString = false;
			}
			continue;
		}
		if (ch === '"' || ch === "'") {
			inString = true;
			stringChar = ch;
			continue;
		}
		if (ch === "}") {
			depth++;
		} else if (ch === "{") {
			depth--;
			if (depth === 0) {
				// The previous char must be a whitespace.
				if (j > 0 && isSpace(s[j - 1])) {
					return { start: j, end, attr: s.substring(j, end + 1) };
				}
				return null;
			}
		}
	}
	return null;
}

/**
 * Unescape the string within the quotes (attribute values).
 */
function unescape(str: string, quote: string): string {
	let result = "";
	let escaped = false;
	for (const ch of str) {
		if (escaped) {
			if (ch === quote || ch === "\\") {
				result += ch;
			} else {
				result += "\\" + ch;
			}
			escaped = false;
		} else if (ch === "\\") {
			escaped = true;
		} else {
			result += ch;
		}
	}
	if (escaped) result += "\\";
	return result;
}

/**
 * Parse attribute list.
 */
function parseAttrs(inner: string) {
	interface Attr {
		type: "id" | "class" | "attr" | "bool";
		value?: string;
		raw: string;
		key?: string;
	}
	const attrs: Attr[] = [];
	let i = 0;
	while (i < inner.length) {
		while (i < inner.length && isSpace(inner[i])) i++;
		if (i >= inner.length) break;

		const start = i;
		const ch = inner[i];

		if (ch === "#") {
			i++;
			const valStart = i;
			while (i < inner.length && !isSpace(inner[i]) && inner[i] !== "}") i++;
			attrs.push({
				type: "id",
				value: inner.substring(valStart, i),
				raw: inner.substring(start, i),
			});
		} else if (ch === ".") {
			i++;
			const valStart = i;
			while (i < inner.length && !isSpace(inner[i]) && inner[i] !== "}") i++;
			attrs.push({
				type: "class",
				value: inner.substring(valStart, i),
				raw: inner.substring(start, i),
			});
		} else {
			let keyStart = i;
			while (i < inner.length && inner[i] !== "=" && !isSpace(inner[i]) && inner[i] !== "}") i++;
			const key = inner.substring(keyStart, i);
			if (i < inner.length && inner[i] === "=") {
				i++; // Skip "=".
				let value: string, raw: string;
				if (i < inner.length && (inner[i] === '"' || inner[i] === "'")) {
					const quote = inner[i];
					i++;
					const valStart = i;
					let escaped = false;
					while (i < inner.length) {
						if (escaped) {
							escaped = false;
							i++;
							continue;
						}
						if (inner[i] === "\\") {
							escaped = true;
							i++;
							continue;
						}
						if (inner[i] === quote) break;
						i++;
					}
					value = unescape(inner.substring(valStart, i), quote);
					if (i < inner.length) i++; // Skip the end quote.
					raw = inner.substring(start, i);
				} else {
					const valStart = i;
					while (i < inner.length && !isSpace(inner[i]) && inner[i] !== "}") i++;
					value = inner.substring(valStart, i);
					raw = inner.substring(start, i);
				}
				// id attr will be marked as `type: "id"`.
				if (key === "id") {
					attrs.push({ type: "id", value, raw });
				} else {
					attrs.push({ type: "attr", key, value, raw });
				}
			} else {
				attrs.push({ type: "bool", key, raw: inner.substring(start, i) });
			}
		}
	}
	return attrs;
}

/**
 * Construct id attribute fragment.
 *
 * It will automatically choose to use `#id` or `id="..."`.
 */
function buildIdAttr(id: string): string {
	if (/[\s"'{}]/.test(id)) {
		const escaped = id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		return `id="${escaped}"`;
	}
	return `#${id}`;
}
