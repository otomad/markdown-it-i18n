import dedentEscaped from "dedent";
import { describe, it, expect } from "vitest";
import { dedent } from "../index.test";
import { parseI18nMacro } from "./index";

describe("parseI18nMacro", () => {
	it("keeps English only in line multilingual", () => {
		const src = dedent`
			@en This is English content.
			@zh 这是中文内容。
			@ja これは日本語の内容です。
		`;
		const dist = "This is English content.";
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("keeps Chinese only in line multilingual", () => {
		const src = dedent`
			@en This is English content.
			@zh 这是中文内容。
			@ja これは日本語の内容です。
		`;
		const dist = "这是中文内容。";
		expect(parseI18nMacro(src, "zh")).toBe(dist);
	});
	it("keeps English only in block multilingual", () => {
		const src = dedent`
			@@@en
			This is a large block of English content.
			It can span multiple lines and include **formatting**.
			@@@zh
			这是一大段中文内容。
			它可以跨越多行并包含**格式**。
			@@@
		`;
		const dist = dedent`
			This is a large block of English content.
			It can span multiple lines and include **formatting**.
		`;
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should fallback to English content because missing translation", () => {
		const src = dedent`
			@en This is English content.
			@zh 这是中文内容。
			@ja これは日本語の内容です。

			@en This is another content.
			@zh 这是另一段内容。
		`;
		const dist = dedent`
			これは日本語の内容です。

			This is another content.
		`;
		expect(parseI18nMacro(src, "ja")).toBe(dist);
	});
	it("should fallback to Chinese content because missing translation", () => {
		const src = dedent`
			@en This is English content.
			@zh 这是中文内容。
			@ja これは日本語の内容です。

			@en This is another content.
			@zh 这是另一段内容。
		`;
		const dist = dedent`
			これは日本語の内容です。

			这是另一段内容。
		`;
		expect(parseI18nMacro(src, "ja", { rootLang: "zh" })).toBe(dist);
	});
	it("should support content without empty line", () => {
		const src = dedent`
			@en * This is English content.
			@zh * 这是中文内容。
			@en * This is another content.
			@zh * 这是另一段内容。
		`;
		const dist = dedent`
			* This is English content.
			* This is another content.
		`;
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should take priority over parsing tables", () => {
		const src = dedentEscaped`
			@en | Key | Value |
			@zh | 键 | 值 |
			|---|---|
			@en | Foo | \`"bar"\` |
			@zh | 甲 | \`"乙"\` |
		`;
		const dist = dedentEscaped`
			| Key | Value |
			|---|---|
			| Foo | \`"bar"\` |
		`;
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should dropped translation in the result with line multilingual", () => {
		const src = dedent`
			@en Beef is the meat of cattle.
			@zh
		`;
		// Chinese literal meaning: 牛肉是牛的肉。This is redundant.
		const dist = "";
		expect(parseI18nMacro(src, "zh")).toBe(dist);
	});
	it("should dropped translation in the result with block multilingual", () => {
		const src = dedent`
			@@@en
			Beef is the meat of cattle.
			@@@zh
			@@@
		`;
		const dist = "";
		expect(parseI18nMacro(src, "zh")).toBe(dist);
	});
	it("should show translation in the result even though some translation has been dropped with line multilingual", () => {
		const src = dedent`
			@en Beef is the meat of cattle.
			@zh
		`;
		const dist = "Beef is the meat of cattle.";
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should show translation in the result even though some translation has been dropped with block multilingual", () => {
		const src = dedent`
			@@@en
			Beef is the meat of cattle.
			@@@zh
			@@@
		`;
		const dist = "Beef is the meat of cattle.";
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should dropped source language content in the result with line multilingual", () => {
		const src = dedent`
			@en
			@zh 西瓜是水分十足的瓜。
		`;
		// English literal meaning: Watermelon is a melon full of water. This is redundant.
		const dist = "";
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should dropped source language content in the result with block multilingual", () => {
		const src = dedent`
			@@@en
			@@@zh
			西瓜是水分十足的瓜。
			@@@
		`;
		const dist = "";
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should dropped source language content in the result with line multilingual", () => {
		const src = dedent`
			@en
			@zh 西瓜是水分十足的瓜。
		`;
		// English literal meaning: Watermelon is a melon full of water. This is redundant.
		const dist = "";
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should dropped source language content in the result with block multilingual", () => {
		const src = dedent`
			@@@en
			@@@zh
			西瓜是水分十足的瓜。
			@@@
		`;
		const dist = "";
		expect(parseI18nMacro(src, "en")).toBe(dist);
	});
	it("should dropped translation in the result because missing translation and source language content is dropped with line multilingual", () => {
		const src = dedent`
			@en
			@zh 西瓜是水分十足的瓜。
		`;
		const dist = "";
		expect(parseI18nMacro(src, "ja")).toBe(dist);
	});
	it("should dropped translation in the result because missing translation and source language content is dropped with block multilingual", () => {
		const src = dedent`
			@@@en
			@@@zh
			西瓜是水分十足的瓜。
			@@@
		`;
		const dist = "";
		expect(parseI18nMacro(src, "ja")).toBe(dist);
	});
});
