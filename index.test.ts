import { describe, it, expect } from "vitest";
import dedentEscaped from "dedent";
import { parseI18nMacro, parseLocale } from "./utils";
import i18nMacroPlugin from "./index";
import markdownit from "markdown-it";

const dedent = dedentEscaped.withOptions({ escapeSpecialCharacters: false });

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
});

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
		expect(parseI18nMacro(src, "ja", "zh")).toBe(dist);
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

function createMd() {
	const md = markdownit();
	md.use(i18nMacroPlugin);
	return md;
}

describe("i18nMacroPlugin", () => {
	it("keeps English only in line multilingual", () => {
		const md = createMd();
		const src = dedent`
			@en ## This is *English* content.
			@zh ## 这是*中文*内容。
			@ja ## これは*日本語*の内容です。
		`;
		const dist = "<h2>This is <em>English</em> content.</h2>";
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("keeps English only in block multilingual", () => {
		const md = createMd();
		const src = dedent`
			@@@en
			> This is a large block of English content.\
			> It can span multiple lines and include **formatting**.
			@@@zh
			> 这是一大段中文内容。\
			> 它可以跨越多行并包含**格式**。
			@@@
		`;
		const dist = dedent`
			<blockquote>
			<p>This is a large block of English content.<br>
			It can span multiple lines and include <strong>formatting</strong>.</p>
			</blockquote>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should keep the list from breaking", () => {
		const md = createMd();
		const src = dedent`
			@en * This is English content.
			@zh * 这是中文内容。
			@en * This is another content.
			@zh * 这是另一段内容。
		`;
		const dist = dedent`
			<ul>
			<li>This is English content.</li>
			<li>This is another content.</li>
			</ul>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should break the list", () => {
		const md = createMd();
		const src = dedent`
			@en * This is English content.
			@zh * 这是中文内容。

			@en * This is another content.
			@zh * 这是另一段内容。
		`;
		const dist = dedent`
			<ul>
			<li>
			<p>This is English content.</p>
			</li>
			<li>
			<p>This is another content.</p>
			</li>
			</ul>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should take priority over parsing tables", () => {
		const md = createMd();
		const src = dedentEscaped`
			@en | Key | Value |
			@zh | 键 | 值 |
			|---|---|
			@en | Foo | \`"bar"\` |
			@zh | 甲 | \`"乙"\` |
		`;
		const dist = dedent`
			<table>
			<thead>
			<tr>
			<th>Key</th>
			<th>Value</th>
			</tr>
			</thead>
			<tbody>
			<tr>
			<td>Foo</td>
			<td><code>&quot;bar&quot;</code></td>
			</tr>
			</tbody>
			</table>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
});
