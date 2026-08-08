import type MarkdownIt from "markdown-it";
import { findBlockAttr } from "./attrs.js";

export function extractHeadingContent(source: string, { md, env }: { md?: MarkdownIt; env?: any } = {}): string | null {
	if (!source.includes("# ")) return null;
	if (!md) {
		const blockAttrInfo = findBlockAttr(source);
		if (blockAttrInfo) source = source.slice(0, blockAttrInfo.start).trimEnd();
		const matched = source.trim().match(/^(?:(?:>|[*+-]\s)\s*)*#{1,6}\s+(.*)$/); // Consider standard markdown syntax only.
		const content = matched?.[1].trim();
		return content || null;
	} else {
		const html = md.render(source, env);
		if (/<\/h[123456]>/i.test(html)) {
			return extractHtmlHeadingContent(html);
		}
		return null;
	}
}

/**
 * Find the first heading element (h1-h6) in an HTML string and return its innerText.\
 * Returns null if no heading is found.
 *
 * Features:
 *  - Pure string parsing, no third‑party dependencies.
 *  - Correctly handles void elements (e.g., <img>) without self-closing slash.
 *  - Handles escaped quotes inside attributes.
 *  - Decodes common HTML entities (named and numeric).
 *  - Ignores comments, CDATA, and self‑closing tags.
 */
export function extractHtmlHeadingContent(html: string) {
	// Tag parsing
	const headingRegex = /^h[1-6]$/i; // Matches h1 through h6 (case-insensitive).
	let i = 0;
	let targetTag = null; // Lowercased heading tag name once found.
	let depth = 0; // Nesting depth for the target heading.
	let textContent = ""; // Accumulated text.

	while (i < html.length) {
		if (html[i] === "<") {
			// Skip comments, DOCTYPE, and XML declarations.
			const next = html[i + 1];
			if (next === "!") {
				if (html[i + 2] === "-" && html[i + 3] === "-") {
					const end = html.indexOf("-->", i + 4);
					i = end === -1 ? html.length : end + 3;
					continue;
				} else {
					const end = html.indexOf(">", i);
					i = end === -1 ? html.length : end + 1;
					continue;
				}
			}
			if (next === "?") {
				const end = html.indexOf("?>", i);
				i = end === -1 ? html.length : end + 2;
				continue;
			}

			// Parse a regular tag.
			let j = i + 1;
			let isClosing = false;
			let selfClose = false;

			if (html[j] === "/") {
				isClosing = true;
				j++;
			}

			// Extract tag name.
			const nameStart = j;
			while (j < html.length && /[a-zA-Z0-9]/.test(html[j])) j++;
			const tagName = html.slice(nameStart, j).toLowerCase();
			if (!tagName) {
				// Not a valid tag; treat `<` as ordinary text.
				if (depth > 0) textContent += html[i];
				i++;
				continue;
			}

			// Scan attributes until `>` or `/>`.
			while (j < html.length && html[j] !== ">") {
				if (html[j] === '"' || html[j] === "'") {
					const quote = html[j];
					j++; // move past opening quote.
					while (j < html.length) {
						if (html[j] === "\\") {
							// Escaped character: skip both backslash and the next char.
							j += 2;
							continue;
						}
						if (html[j] === quote) {
							j++; // move past closing quote.
							break;
						}
						j++;
					}
				} else if (html[j] === "/" && html[j + 1] === ">") {
					selfClose = true;
					j += 2;
					break;
				} else {
					j++;
				}
			}
			if (j < html.length && html[j] === ">") j++; // skip `>`.

			// Update state based on the tag.
			if (!isClosing && !selfClose) {
				if (headingRegex.test(tagName) && depth === 0) {
					targetTag = tagName;
					depth = 1;
					// Start collecting inner text (the tag itself is not added).
				} else if (depth > 0) {
					depth++; // nested start tag inside heading.
				}
			} else if (isClosing) {
				if (depth > 0 && tagName === targetTag) {
					depth--;
					if (depth === 0) {
						// Found matching closing tag.
						return decodeEntities(textContent).trim();
					}
				} else if (depth > 0) {
					depth--; // other closing tag inside heading.
				}
			} else if (selfClose) {
				// Self‑closing heading: return empty string.
				if (headingRegex.test(tagName) && depth === 0) {
					return "";
				}
				// Otherwise ignore (doesn't affect depth).
			}

			i = j; // advance main index.
		} else {
			// Ordinary character – collect if inside the heading.
			if (depth > 0) textContent += html[i];
			i++;
		}
	}

	// End of string: if heading was opened but never closed, return accumulated text.
	if (targetTag && depth > 0) {
		return decodeEntities(textContent).trim();
	}
	return null; // No heading found.
}

const entityMap: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	"#39": "'",
	nbsp: "\xa0",
	copy: "©",
	reg: "®",
	// Extend as needed...
};

/**
 * Decode HTML entities (common named entities and numeric entities).
 */
function decodeEntities(str: string) {
	return str.replace(/&([#a-zA-Z0-9]+);/g, (full, name) => {
		if (name.charAt(0) === "#") {
			// Numeric entity: &#dddd; or &#xHHHH;
			const code =
				name[1].toLowerCase() === "x" ? parseInt(name.substring(2), 16) : parseInt(name.substring(1), 10);
			return isNaN(code) ? full : String.fromCodePoint(code);
		}
		return entityMap[name] || full; // Unknown entities stay as-is.
	});
}
