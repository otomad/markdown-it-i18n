import type { PluginWithOptions } from "markdown-it";
import type { Options } from "./types.js";
import { parseI18nMacro } from "./utils/index.js";
import { parseLocale } from "./utils/locale.js";
import { unescapeCodeTokens } from "./utils/unescape.js";

const getCurrentLangInVitePress: NonNullable<Options["getCurrentLang"]> = state => state.env.localeIndex;
const returnAsIs: NonNullable<Options["langAlias"]> = (_locale, lang) => lang;

/**
 * Markdown-it / VitePress Single-Page I18n Macro Plugin.
 *
 * @remarks
 *   Supports mix with all other markdown syntax.
 */
const i18nMacroPlugin: PluginWithOptions<Options> = (
	md,
	{
		getCurrentLang = getCurrentLangInVitePress,
		langAlias = returnAsIs,
		rootLang = "en",
		consistentHeadingId = false,
	} = {},
) => {
	// Register at the beginning of the `md.core` process.
	// The `state.src` is still pure string at this moment.
	md.core.ruler.before("block", "i18n_macro_preprocessor", state => {
		let currentLang = getCurrentLang(state);
		currentLang = langAlias(parseLocale(currentLang), currentLang) ?? undefined;
		if (typeof rootLang === "function") rootLang = rootLang(state);

		state.src = parseI18nMacro(state.src, currentLang, { rootLang, consistentHeadingId });
	});

	// Register after `inline` to process backslash pairs (`\\` → `\`) inside code blocks/spans.
	// In normal text, markdown-it handles backslash escaping; in code blocks, backslashes are
	// literal, so we reduce pairs ourselves. Single `\@` escapes are already handled by parseI18nMacro.
	md.core.ruler.after("inline", "i18n_macro_code_unescape", state => {
		unescapeCodeTokens(state.tokens);
	});
};

export default i18nMacroPlugin;
export { parseI18nMacro };
export type { Options as I18nMacroPluginOptions };
