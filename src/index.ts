import type { PluginWithOptions } from "markdown-it";
import type { Options } from "./types.js";
import { parseI18nMacro } from "./utils/index.js";
import { unescapeCodeTokens } from "./utils/unescape.js";

const getCurrentLangInVitePress: NonNullable<Options["getCurrentLang"]> = state => state.env.localeIndex;

/**
 * Markdown-it / VitePress Single-Page I18n Macro Plugin.
 *
 * @remarks Supports mix with all other markdown syntax.
 */
const i18nMacroPlugin: PluginWithOptions<Options> = (
	md,
	{ getCurrentLang = getCurrentLangInVitePress, langAlias, rootLang = "en", consistentHeadingId = false } = {},
) => {
	// Register at the beginning of the `md.core` process.
	// The `state.src` is still pure string at this moment.
	md.core.ruler.before("block", "i18n_macro_preprocessor", state => {
		const currentLang = getCurrentLang(state);
		if (typeof rootLang === "function") rootLang = rootLang(state);

		state.src = parseI18nMacro(state.src, currentLang, {
			rootLang,
			consistentHeadingId,
			langAlias,
			md,
			env: state.env,
		});
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
