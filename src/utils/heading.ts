import type MarkdownIt from "markdown-it";
import { findBlockAttr } from "./attrs.js";

/**
 * Zero-width and other invisible format characters are not matched by `\s`,
 * so `String.prototype.trim()` leaves them behind (e.g., U+200B zero width space).
 * Strip them explicitly when trimming heading content.
 */
function trim(str: string): string {
	return str.replace(/^[\s\u200B-\u200D\u2060\uFEFF]+|[\s\u200B-\u200D\u2060\uFEFF]+$/g, "");
}

export function extractHeadingContent(source: string, { md, env }: { md?: MarkdownIt; env?: any } = {}): string | null {
	if (!source.includes("# ")) return null;
	if (!md) {
		// If no markdown it instance provided, it will use regex to extract title, maybe not correct,
		// and the inline syntax will not parse and return as is.
		const blockAttrInfo = findBlockAttr(source);
		if (blockAttrInfo) source = source.slice(0, blockAttrInfo.start).trimEnd();
		const matched = source.trim().match(/^(?:(?:>|[*+-]\s)\s*)*#{1,6}\s+(.*)$/); // Consider standard markdown syntax only.
		const content = trim(matched?.[1] ?? "");
		return content || null;
	} else {
		// If markdown it instance provided, the title extraction will be more precise. It supports inline syntax,
		// and if some other markdown it plugin adds some extra headings, they will also be handled.
		const html = md.render(source, env);
		if (/<\/h[123456]>/i.test(html)) {
			return extractHtmlHeadingContent(html);
		}
		return null;
	}
}

// Void elements (never have closing tags)
const voidElements = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

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
	const headingRegex = /^h[1-6]$/i;
	const tagStack = []; // tracks open non-void tags.
	let insideHeading = false;
	let targetHeadingTag = null; // lowercase tag name of the heading we are inside.
	let textContent = "";
	let i = 0;

	while (i < html.length) {
		if (html[i] === "<") {
			const next = html[i + 1];

			// Skip comments, DOCTYPE, and XML declarations.
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

			// Parse regular tag
			let j = i + 1;
			let isClosing = false;
			let selfClose = false;

			if (html[j] === "/") {
				isClosing = true;
				j++;
			}

			const nameStart = j;
			while (j < html.length && /[a-zA-Z0-9]/.test(html[j])) j++;
			const tagName = html.slice(nameStart, j).toLowerCase();
			if (!tagName) {
				// Not a valid tag, treat '<' as ordinary text.
				if (insideHeading) textContent += html[i];
				i++;
				continue;
			}

			// Scan attributes until `>` or `/>`, handling escaped quotes.
			while (j < html.length && html[j] !== ">") {
				if (html[j] === '"' || html[j] === "'") {
					const quote = html[j];
					j++; // skip opening quote
					while (j < html.length) {
						if (html[j] === "\\") {
							j += 2; // skip escaped character.
							continue;
						}
						if (html[j] === quote) {
							j++; // closing quote.
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

			// Handle the tag
			if (selfClose) {
				// Self-closing heading tag (e.g., <h1 />).
				if (headingRegex.test(tagName) && !insideHeading) {
					return "";
				}
				// Otherwise ignore (no nesting)
			} else if (isClosing) {
				// Closing tag
				// Pop from stack if the top matches (ignore mismatched end tags)
				if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
					const popped = tagStack.pop();
					if (popped === targetHeadingTag) {
						// Matched our heading end tag -> return collected text.
						return trim(decodeEntities(textContent));
					}
				}
				// If we are inside the heading and encounter a closing tag that *is* the heading tag
				// but the stack top doesn't match (e.g., malformed HTML), we still treat it as closing.
				if (insideHeading && tagName === targetHeadingTag) {
					// Forcefully close it (robustness).
					return trim(decodeEntities(textContent));
				}
			} else {
				// Opening tag.
				if (headingRegex.test(tagName) && !insideHeading) {
					// This is the first heading we care about.
					targetHeadingTag = tagName;
					insideHeading = true;
					// Note: we still push it onto the stack (unless void, but headings are never void).
				}

				// Push onto stack if not a void element.
				if (!voidElements.has(tagName)) {
					tagStack.push(tagName);
				}
			}

			i = j; // advance past the tag.
		} else {
			// Ordinary character – collect if inside heading.
			if (insideHeading) textContent += html[i];
			i++;
		}
	}

	// End of string: if heading was opened but never closed, return collected text.
	if (insideHeading) {
		return trim(decodeEntities(textContent));
	}
	return null;
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
