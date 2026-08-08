import type MarkdownIt from "markdown-it";
import type { Options } from "../types.js";
import { extractHeadingContent } from "./heading.js";
import { matchLocale } from "./locale.js";

interface ParseI18nMacroOptions {
	/**
	 * Specify the source root language.
	 *
	 * When `currentLang` is missing in the translation, it will automatically fallback to this language.
	 *
	 * Defaults to "en".
	 */
	rootLang?: string;
	/**
	 * Ensure that the same heading title has a consistent ID across different languages,
	 * which will allow the page to scroll in the same position when switching languages.
	 */
	consistentHeadingId?: Options["consistentHeadingId"];
	/**
	 * Allows you use aliases for certain languages without long language tags in each declaration.\
	 * This can further modify the language tags without changing the env variable.
	 */
	langAlias?: Options["langAlias"];
	/**
	 * Markdown it instance. (Optional)
	 */
	md?: MarkdownIt;
	/**
	 * Markdown it environment variables. (Optional)
	 */
	env?: any;
}

/**
 * A util function that to parse i18n macro in a markdown string to pure markdown.
 * @remarks This is a pure util function, without markdown-it or any other markdown parser.
 * @param src - Markdown source string which has i18n macro syntax.
 * @param currentLang - Specify the current language.
 * @param rootLang - Specify the source root language.
 * When `currentLang` is missing in the translation, it will automatically fallback to this language.
 * Defaults to "en".
 * @returns The parsed single language markdown string.
 */
export function parseI18nMacro(
	src: string,
	currentLang?: string,
	{ rootLang = "en", consistentHeadingId = false, langAlias, md, env }: ParseI18nMacroOptions = {},
) {
	currentLang ??= rootLang;
	if (consistentHeadingId) {
		if (consistentHeadingId === true) consistentHeadingId = {};
		consistentHeadingId.useLang ??= "en";
	}

	// A unique marker used to protect escaped macros from being processed.
	// Placed between the escape backslash and the @ sign so the macro regex won't match.
	const ESCAPE_MARKER = "\0I18N_ESC\0";

	// ==========================================
	// 0. Preprocess: protect escaped macros from being processed.
	//    - Escaped line macro: \@lang → marker-protected @lang
	//    - Escaped block macro: \@@@lang → marker-protected @@@lang
	//    - Escaped block terminator: \@@@ → marker-protected @@@
	// ==========================================
	// Note: we use `replace` with a callback to only protect patterns where
	// a SINGLE backslash escapes the @ — `\\@` (backslash pair + @) is left alone.
	src = src.replace(/^(\\+)@(?=[\w-]+|@@?)/gm, (_match, backslashes: string) => {
		// If odd number of backslashes, the last one escapes the @
		if (backslashes.length % 2 === 1) {
			// Keep the paired backslashes, consume the escape backslash,
			// and insert a marker so the macro regex won't match.
			return backslashes.slice(0, -1) + ESCAPE_MARKER + "@";
		}
		// Even number: all backslashes pair up, @ is NOT escaped — leave as-is
		return backslashes + "@";
	});

	// ==========================================
	// 1. Macro: Block Multilingual (@@@)
	// ==========================================
	if (src.includes("@@@")) {
		// Match consecutive multilingual blocks until encounter an independent `\n@@@` terminator.
		// The @@@lang must appear at the start of a line (after optional whitespace).
		const blockClusterRegex = /(?:^@@@[\w-]+[\s\S]*?\n)+^@@@(?:\n)?/gm;

		src = src.replace(blockClusterRegex, cluster => {
			// Determine whether the captured block ends with a line break.
			// If so, it means that the line break needs to be removed when erasing the content.
			const endsWithNewline = cluster.endsWith("\n");

			const languagesData: Record<string, string> = {};
			// 1. First, use precise line segmentation to extract each language block,
			// Remove the ending `@@@`, keep @@@en..., @@@zh... only.
			// Remove any possible line breaks at the end and the ending `@@@` delimiter to maintain a clean segmentation.
			const cleanCluster = cluster.replace(/\n?$/, "").replace(/\n\s*@@@$/, "");
			// Splitted by `@@@lang`.
			const parts = cleanCluster.split(/(?=^@@@[\w-]+)/m);

			for (const part of parts) {
				const match = part.match(/^@@@([\w-]+)(?:\n|$)([\s\S]*)$/);
				if (match) {
					const [, lang, text = ""] = match;
					languagesData[lang] = !text.trim()
						? // Explicitly assigning an empty string indicates that the language intentionally does not display any content.
							""
						: // Remove excess single line breaks at the beginning and end to prevent widening the spacing.
							text.replace(/^\n|\n$/g, "");
				}
			}

			// 2. Rigorous fallback strategy (Note: "" is also a valid value and cannot use `!languagesData[currentLang]` to determine).
			const finalContent = (() => {
				// If the current language exists (even if it is an empty string ""), it should be strictly adopted without fallback.
				if (languagesData[currentLang] !== undefined) return languagesData[currentLang];
				// If the current language is missing, it will use locale matcher to match the most mutually intelligible language.
				const matchedLang = matchLocale(currentLang, Object.keys(languagesData), rootLang, langAlias);
				if (languagesData[matchedLang] !== undefined) return languagesData[matchedLang];
				// If the current language is missing, it will fallback to English.
				if (languagesData[rootLang] !== undefined) return languagesData[rootLang];
				// Backstop strategy: If there is neither the current language nor root language fallback, the language written at the front will be selected.
				return Object.values(languagesData)[0] || "";
			})();
			return finalContent === ""
				? // If the content is completely empty, return an empty string directly.
					// Because regex has already captured the subsequent line breaks, returning an empty string is equivalent to eliminating the line breaks as well.
					""
				: // If the content is not empty, it will add the outer newline character that was just swallowed by the regex by false positive
					// to ensure the normal layout of the following content.
					finalContent + (endsWithNewline ? "\n" : "");
		});
	}

	// ==========================================
	// 2. Macro: Line Multilingual (@)
	// ==========================================
	if (src.includes("@")) {
		const lines = src.split("\n");
		const newLines = [];

		let currentCluster: Record<string, string> | null = null; // Multilingual groups currently being collected.

		// Util function: Specially used to submit a group of multi-language, and insert the filtered text into the array.
		const flushCluster = (cluster: typeof currentCluster) => {
			if (!cluster) return;
			const finalContent = (() => {
				// If the current language exists (even if it is an empty string ""), it should be strictly adopted without fallback.
				if (cluster[currentLang] !== undefined) return cluster[currentLang];
				// If the current language is missing, it will use locale matcher to match the most mutually intelligible language.
				const matchedLang = matchLocale(currentLang, Object.keys(cluster), rootLang, langAlias);
				if (cluster[matchedLang] !== undefined) return cluster[matchedLang];
				// If the current language is missing, it will fallback to English.
				if (cluster[rootLang] !== undefined) return cluster[rootLang];
				// Backstop strategy: If there is neither the current language nor root language fallback, the language written at the front will be selected.
				return Object.values(cluster)[0] || "";
			})();
			if (consistentHeadingId) {
				// const headingContent = extractHeadingContent()
			}
			newLines.push(finalContent);
		};

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			const match = line.match(/^@([\w-]+)(?: (.*))?$/);
			if (match) {
				const [, lang, text = ""] = match;

				// Initialize a new group.
				if (!currentCluster) {
					currentCluster = {};
				}
				// If the current language already exists in the group (for example, there is an `en` already, and the next `en` is encountered),
				// it means that a new line has been opened (for example, item 2 of the list), the old group must be submit immediately,
				// and a new group must be opened for the new line.
				else if (currentCluster[lang] !== undefined) {
					flushCluster(currentCluster);
					currentCluster = {};
				}

				// Save the contents of the current language into the group.
				currentCluster[lang] = text;
			} else {
				// Encounters an normal Markdown line (not starting with @), it will submit the possible backlog of groups first.
				if (currentCluster) {
					flushCluster(currentCluster);
					currentCluster = null;
				}
				newLines.push(line);
			}
		}

		// After the completion of the Iteration, if there are groups that have not been submitted at the end, the last submission will be made.
		if (currentCluster) {
			flushCluster(currentCluster);
		}

		src = newLines.join("\n");
	}

	// ==========================================
	// 3. Postprocess: remove escape markers.
	//    The escape backslash has been consumed, and the marker prevented macro processing.
	//    Now we just remove the marker, leaving the un-escaped @ text.
	// ==========================================
	src = src.replaceAll(ESCAPE_MARKER, "");

	return src;
}
