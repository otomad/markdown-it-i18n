import { match } from "@formatjs/intl-localematcher";

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
