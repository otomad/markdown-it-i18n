import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";

export interface Options {
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
	/**
	 * Ensure that the same heading title has a consistent ID across different languages,
	 * which will allow the page to scroll in the same position when switching languages.
	 *
	 * Note: It does not consider the issue of titles with the same name.
	 * @default false
	 * @example
	 * ```markdown
	 * <!-- Disable `consistentHeadingId` -->
	 * @en # This is English title
	 * @zh # 这是中文标题
	 *
	 * <!-- Enable `consistentHeadingId` -->
	 * @en # This is English title {#this-is-english-title}
	 * @zh # 这是中文标题 {#this-is-english-title}
	 * ```
	 */
	consistentHeadingId?: boolean;
}
