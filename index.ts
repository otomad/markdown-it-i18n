import type { PluginWithOptions } from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import { parseI18nMacro } from "./utils.js";

interface Options {
	/**
	 * Get current language from env variables or markdown-it state core.
	 * Defaults to VitePress behavior.
	 * @default `state => state.env.localeIndex`
	 */
	getCurrentLang?: (state: StateCore) => string | undefined;
	/**
	 * the source root language.
	 * When current language is missing in the translation, it will automatically fallback to this language.
	 * @default "en" // (English)
	 */
	rootLang?: string | ((state: StateCore) => string);
}

const getCurrentLangInVitePress: NonNullable<Options["getCurrentLang"]> = state => state.env.localeIndex;

/**
 * VitePress / Markdown-it Single-Page I18n Macro Plugin.
 * @remarks Supports mix with all other markdown syntax.
 */
const i18nMacroPlugin: PluginWithOptions<Options> = (md, { getCurrentLang, rootLang = "en" } = {}) => {
	// Register at the beginning of the `md.core` process.
	// The `state.src` is still pure string at this moment.
	md.core.ruler.before("block", "i18n_macro_preprocessor", state => {
		getCurrentLang ??= getCurrentLangInVitePress;
		const currentLang = getCurrentLang(state);
		if (typeof rootLang === "function") rootLang = rootLang(state);

		state.src = parseI18nMacro(state.src, currentLang, rootLang);
	});
};

export default i18nMacroPlugin;
export { parseI18nMacro };
