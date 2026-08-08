import { match } from "@formatjs/intl-localematcher";
import type { Options } from "../types.js";

/**
 * Parse language or locale tag without raise any error.
 *
 * @param tag - Language tag or `Intl.Locale` object.
 * @returns Get an `Intl.Locale` object with the most likely values for the language, script, and region. If the passed
 *   locale is invalid, it will return `null` instead of raise an error.
 */
export function parseLocale(tag: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale | undefined | null) {
	try {
		return new Intl.Locale(tag!).maximize();
	} catch {
		return null;
	}
}

let lastAliases: Options["langAlias"] = {};
let lastAliasesReverseMap!: Map<string, string>;

/**
 * Match the specified locale with the most mutually intelligible available locales.
 */
export function matchLocale(
	requestedLocale: string,
	availableAliasedLocales: readonly string[],
	defaultLocale: string,
	aliases: typeof lastAliases = {},
): string {
	// If the `aliases` are exactly the same as the previous ones, repeat the previous `lastAliasesReverseMap` to avoid repeated calculations.
	let aliasesReverseMap: Map<string, string> | undefined;
	if (Object.keys(aliases).length) {
		if (lastAliases !== aliases) {
			lastAliases = aliases;
			lastAliasesReverseMap = new Map();
			for (let [alias, locales] of Object.entries(aliases)) {
				if (!Array.isArray(locales)) locales = [locales];
				locales.forEach(locale => lastAliasesReverseMap.set(locale, alias));
			}
		}
		aliasesReverseMap = lastAliasesReverseMap;
	}

	const availableLocales = !aliases
		? availableAliasedLocales
		: availableAliasedLocales.flatMap(locale => (Object.hasOwn(aliases, locale) ? aliases[locale] : locale));
	let resultLocale: string;
	try {
		resultLocale = match([requestedLocale], availableLocales, defaultLocale);
	} catch {
		resultLocale = defaultLocale;
	}
	return aliasesReverseMap?.has(resultLocale) ? aliasesReverseMap.get(resultLocale)! : resultLocale;
}
