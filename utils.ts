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
export function parseI18nMacro(src: string, currentLang?: string, rootLang: string = "en") {
	currentLang ??= rootLang;

	// ==========================================
	// 1. Macro: Block Multilingual (@@@)
	// ==========================================
	if (src.includes("@@@")) {
		// Match consecutive multilingual blocks until encounter an independent `\n@@@` terminator.
		const blockClusterRegex = /(?:@@@[a-zA-Z0-9_-]+[\s\S]*?\n)+@@@(?:\n)?/g;

		src = src.replace(blockClusterRegex, cluster => {
			// Determine whether the captured block ends with a line break.
			// If so, it means that the line break needs to be removed when erasing the content.
			const endsWithNewline = cluster.endsWith("\n");

			const languagesData = {} as any;
			// 1. First, use precise line segmentation to extract each language block,
			// Remove the ending `@@@`, keep @@@en..., @@@zh... only.
			// Remove any possible line breaks at the end and the ending `@@@` delimiter to maintain a clean segmentation.
			const cleanCluster = cluster.replace(/\n?$/, "").replace(/\n\s*@@@$/, "");
			// Splitted by `@@@lang`.
			const parts = cleanCluster.split(/(?=^@@@[a-zA-Z0-9_-]+)/m);

			for (const part of parts) {
				const match = part.match(/^@@@([a-zA-Z0-9_-]+)(?:\n|$)([\s\S]*)$/);
				if (match) {
					const lang = match[1];
					const text = match[2] || "";
					languagesData[lang] = !text.trim()
						? // Explicitly assigning an empty string indicates that the language intentionally does not display any content.
							""
						: // Remove excess single line breaks at the beginning and end to prevent widening the spacing.
							text.replace(/^\n|\n$/g, "");
				}
			}

			// 2. Rigorous fallback strategy (Note: "" is also a valid value and cannot use `!languagesData[currentLang]` to determine).
			const finalBlockContent =
				languagesData[currentLang] !== undefined
					? // If the current language exists (even if it is an empty string ""), it should be strictly adopted without fallback.
						languagesData[currentLang]
					: languagesData[rootLang] !== undefined
						? // If the current language is missing, it will fallback to English.
							languagesData[rootLang]
						: // Backstop strategy.
							Object.values(languagesData)[0] || "";
			return finalBlockContent === ""
				? // If the content is completely empty, return an empty string directly.
					// Because regex has already captured the subsequent line breaks, returning an empty string is equivalent to eliminating the line breaks as well.
					""
				: // If the content is not empty, it will add the outer newline character that was just swallowed by the regex by false positive
					// to ensure the normal layout of the following content.
					finalBlockContent + (endsWithNewline ? "\n" : "");
		});
	}

	// ==========================================
	// 2. Macro: Line Multilingual (@)
	// ==========================================
	if (src.includes("@")) {
		const lines = src.split("\n");
		const newLines = [];

		let currentCluster = null as any; // Multilingual groups currently being collected.

		// Util function: Specially used to submit a group of multi-language, and insert the filtered text into the array.
		const flushCluster = (cluster: any) => {
			if (!cluster) return;
			if (cluster[currentLang] !== undefined) {
				newLines.push(cluster[currentLang]);
			} else if (cluster[rootLang] !== undefined) {
				newLines.push(cluster[rootLang]);
			} else {
				// If there is neither the current language nor root language fallback, the language written at the front will be selected.
				newLines.push(Object.values(cluster)[0] || "");
			}
		};

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const match = line.trim().match(/^@([\w-]+) (.*)$/);

			if (match) {
				const lang = match[1];
				const text = match[2];

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

	return src;
}

/**
 * Parse language or locale tag without raise any error.
 * @param tag - Language tag or `Intl.Locale` object.
 * @returns Get an `Intl.Locale` object with the most likely values for the language, script, and region.
 * If the passed locale is invalid, it will return `null` instead of raise an error.
 */
export function parseLocale(tag: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale) {
	try {
		return new Intl.Locale(tag).maximize();
	} catch {
		return null;
	}
}
