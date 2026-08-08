import { describe, it, expect } from "vitest";
import { parseLocale } from "./locale";

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
