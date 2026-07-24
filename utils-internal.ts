import type Token from "markdown-it/lib/token.mjs";

/**
 * Parse language or locale tag without raise any error.
 * @param tag - Language tag or `Intl.Locale` object.
 * @returns Get an `Intl.Locale` object with the most likely values for the language, script, and region.
 * If the passed locale is invalid, it will return `null` instead of raise an error.
 */
export function parseLocale(tag: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale | undefined | null) {
	try {
		return new Intl.Locale(tag!).maximize();
	} catch {
		return null;
	}
}

/**
 * Reduce backslash pairs (`\\` → `\`) inside code blocks and inline code spans.
 * In normal text, markdown-it handles `\\` → `\` via its own backslash escaping.
 * In code blocks/spans, backslashes are literal, so we must process these pairs ourselves.
 * Note: `\@` escaping is already handled by parseI18nMacro at the source level.
 */
function unescapeCodeContent(content: string): string {
	let result = "";
	for (let i = 0; i < content.length; i++) {
		if (content[i] === "\\" && i + 1 < content.length && content[i + 1] === "\\") {
			// Backslash pair: reduce to one backslash
			result += "\\";
			i++; // skip the second backslash
		} else {
			result += content[i];
		}
	}
	return result;
}

/** Recursively walk tokens and process backslash pairs in code blocks/spans. */
export function unescapeCodeTokens(tokens: Token[]): void {
	for (const token of tokens) {
		if (token.type === "fence" || token.type === "code_block") {
			token.content = unescapeCodeContent(token.content);
		} else if (token.type === "inline" && token.children) {
			for (const child of token.children) {
				if (child.type === "code_inline") {
					child.content = unescapeCodeContent(child.content);
				}
			}
		} else if (token.children) {
			unescapeCodeTokens(token.children);
		}
	}
}
