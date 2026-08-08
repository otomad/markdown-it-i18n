import { describe, it, expect } from "vitest";
import { parseLocale, matchLocale } from "./locale";

describe("parseLocale", () => {
	it('expects "en" to be "English (Latin, United States)"', () => {
		const locale = parseLocale("en")?.toString();
		expect(locale).toBe("en-Latn-US");
	});
	it('expects "lzh" to be "Literary Chinese (Traditional, China)"', () => {
		const locale = parseLocale("lzh")?.toString();
		expect(locale).toBe("lzh-Hant-CN");
	});
	it('expects "yue" to be "Cantonese (Traditional, Hong Kong, China)"', () => {
		const locale = parseLocale("yue")?.toString();
		expect(locale).toBe("yue-Hant-HK");
	});
	it('expects "wuu" to be "Wu (Simplified, Shanghai, China)"', () => {
		const locale = parseLocale("wuu")?.toString();
		expect(locale).toBe("wuu-Hans-CN");
	});
	it('expects "sjo" to be "Xibe (Mongolian, Xinjiang, China)"', () => {
		const locale = parseLocale("sjo")?.toString();
		// Unfortunately JavaScript cannot recognize it well.
		expect(locale).toBeOneOf(["sjo-Mong-CN", "sjo"]);
	});
	it('expects "xdi8" to be "Shidinn (Latin, Shaoyang, Hunan, China)"', () => {
		const locale = parseLocale("zh-Latn-x-xdi8")?.toString();
		expect(locale).toBe("zh-Latn-CN-x-xdi8");
	});
	it('expects "xdi8" to be "Shidinn (Latin, Shaoyang, Hunan, China)"', () => {
		const locale = parseLocale("zh-Latn-x-xdi8")?.toString();
		expect(locale).toBe("zh-Latn-CN-x-xdi8");
	});
	it('expects "invalid_locale" to be null instead of throw an error', () => {
		const locale = parseLocale("invalid_locale");
		expect(locale).toBe(null);
	});
});

describe("matchLocale", () => {
	it("fallbacks fr to en", () => {
		expect(matchLocale("fr", ["zh", "ja"], "en")).toBe("en");
	});
	it("fallbacks zh-HK to zh-TW", () => {
		expect(matchLocale("zh-HK", ["zh-CN", "zh-TW"], "en")).toBe("zh-TW");
	});
	it("fallbacks zh-MO to zh-HK", () => {
		expect(matchLocale("zh-MO", ["zh-CN", "zh-HK", "zh-TW"], "en")).toBe("zh-HK");
	});
	it("fallbacks yue to zh-HK", () => {
		expect(matchLocale("yue", ["zh-CN", "zh-HK", "zh-TW"], "en")).toBe("zh-HK");
	});
	it("fallbacks zh-HK to yue", () => {
		expect(matchLocale("zh-HK", ["zh-CN", "yue"], "en")).toBe("yue");
	});
	it("fallbacks zh-Hant-CN to zh-TW", () => {
		expect(matchLocale("zh-Hant-CN", ["zh-CN", "zh-TW"], "en")).toBe("zh-TW");
	});
	it("fallbacks ms to id", () => {
		expect(matchLocale("ms", ["zh", "en", "vi", "id", "th", "lo", "my", "km"], "en")).toBe("id");
	});
	it("fallbacks da to no", () => {
		expect(matchLocale("da", ["zh", "en", "no", "sv", "nl"], "en")).toBe("no");
	});
	it("does not fallback fa to ar", () => {
		expect(matchLocale("fa", ["ar"], "en")).toBe("en");
	});
	it("handles aliases", () => {
		expect(matchLocale("zh-TW", ["zhs", "zht"], "en", { zhs: "zh-CN", zht: ["zh-TW", "yue"] })).toBe("zht");
	});
});
