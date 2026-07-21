import type { PluginWithOptions } from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import { parseI18nMacro, parseLocale } from "./utils.js";

interface Options {
	/**
	 * Get current language from env variables or markdown-it state core.\
	 * Defaults to VitePress behavior.
	 * @default `state => state.env.localeIndex`
	 */
	getCurrentLang?: (state: StateCore) => string | undefined;
	/**
	 * Allows you use aliases for certain languages without long language tags in each declaration.\
	 * This can further modify the language tags without changing the env variable of `getCurrentLang`.
	 * @default `lang => lang`
	 * @example
	 * ```markdown
	 * <!-- Without `langAlias` -->
	 * @en This is English content.
	 * @zh-CN 这是简体中文内容。
	 * @zh-TW 這是繁體中文內容。
	 *
	 * <!-- With `langAlias` -->
	 * @en This is English content.
	 * @zhs 这是简体中文内容。
	 * @zht 這是繁體中文內容。
	 * ```
	 * ```javascript
	 *
	 * // Options
	 * {
	 *     langAlias(locale) {
	 *         if (locale && locale.language === "zh") {
	 *             if (locale.script === "Hans") return "zhs";
	 *             else if (locale.script === "Hant") return "zht";
	 *         }
	 *         return locale;
	 *     }
	 * }
	 * ```
	 * @param locale - The parsed maximized `Intl.Locale` object. `null` for locales which parse failed.
	 * @param lang - The raw language get from env variables of `getCurrentLang`, maybe undefined if no `env` provided.\
	 * Especially, if you are using VitePress, the source root language may be `"root"` instead of the real language.
	 */
	langAlias?: (locale: Intl.Locale | null, lang: string | undefined) => string | undefined;
	/**
	 * the source root language.\
	 * When current language is missing in the translation, it will automatically fallback to this language.
	 * @default "en" // (English)
	 */
	rootLang?: string | ((state: StateCore) => string);
}

const getCurrentLangInVitePress: NonNullable<Options["getCurrentLang"]> = state => state.env.localeIndex;
const returnAsIs: NonNullable<Options["langAlias"]> = (_locale, lang) => lang;

/**
 * markdown-it / VitePress Single-Page I18n Macro Plugin.
 * @remarks Supports mix with all other markdown syntax.
 */
const i18nMacroPlugin: PluginWithOptions<Options> = (
	md,
	{ getCurrentLang = getCurrentLangInVitePress, langAlias = returnAsIs, rootLang = "en" } = {},
) => {
	// Register at the beginning of the `md.core` process.
	// The `state.src` is still pure string at this moment.
	md.core.ruler.before("block", "i18n_macro_preprocessor", state => {
		let currentLang = getCurrentLang(state);
		currentLang = langAlias(parseLocale(currentLang), currentLang) ?? undefined;
		if (typeof rootLang === "function") rootLang = rootLang(state);

		state.src = parseI18nMacro(state.src, currentLang, rootLang);
	});
};

export default i18nMacroPlugin;
export { parseI18nMacro };
