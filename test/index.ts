import { describe, it, expect } from "vitest";
import dedentEscaped from "dedent";
import { parseI18nMacro } from "../src/utils/index";
import { parseLocale } from "../src/utils/internal";
import i18nMacroPlugin from "../src/index";
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
	it('expects "xdi8" to be "Shidinn (Latin, Shaoyang, Hunan, China)"', () => {
		const locale = parseLocale("zh-Latn-x-xdi8")?.toString();
		expect(locale).toBe("zh-Latn-CN-x-xdi8");
	});
	it('expects "invalid_locale" to be null instead of throw an error', () => {
		const locale = parseLocale("invalid_locale");
		expect(locale).toBe(null);
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
	it("keeps Chinese only in line multilingual with VitePress environment variable", () => {
		const md = createMd();
		const src = dedent`
			@en ## This is *English* content.
			@zh ## 这是*中文*内容。
			@ja ## これは*日本語*の内容です。
		`;
		const dist = "<h2>这是<em>中文</em>内容。</h2>";
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("keeps Japanese only in line multilingual with custom getCurrentLang", () => {
		const md = markdownit();
		md.use(i18nMacroPlugin, { getCurrentLang: () => "ja" });
		const src = dedent`
			@en ## This is *English* content.
			@zh ## 这是*中文*内容。
			@ja ## これは*日本語*の内容です。
		`;
		const dist = "<h2>これは<em>日本語</em>の内容です。</h2>";
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("keeps Chinese only because change source language to Chinese", () => {
		const md = markdownit();
		md.use(i18nMacroPlugin, { rootLang: "zh" });
		const src = dedent`
			@en ## This is *English* content.
			@zh ## 这是*中文*内容。
			@ja ## これは*日本語*の内容です。
		`;
		const dist = "<h2>这是<em>中文</em>内容。</h2>";
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("keeps Traditional Chinese only in line multilingual when you don't want to change environment variables", () => {
		const md = markdownit();
		md.use(i18nMacroPlugin, {
			langAlias(locale) {
				if (locale && locale.language === "zh") {
					if (locale.script === "Hans") return "zhs";
					else if (locale.script === "Hant") return "zht";
				}
				return locale;
			},
		});
		const src = dedent`
			@en This is English content.
			@zhs 这是简体中文内容。
			@zht 這是繁體中文內容。
		`;
		const dist = "<p>這是繁體中文內容。</p>";
		const rendered = md.render(src, { localeIndex: "zh-TW" }).trimEnd();
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
	it("should be escaped and not be processed by the macro", () => {
		const md = createMd();
		const src = dedent`
			\@en ## This is *English* content.
			\@zh ## 这是*中文*内容。
			\@ja ## これは*日本語*の内容です。
		`;
		const dist = dedent`
			<p>@en ## This is <em>English</em> content.
			@zh ## 这是<em>中文</em>内容。
			@ja ## これは<em>日本語</em>の内容です。</p>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should escaped at sign in line multilingual", () => {
		const md = createMd();
		const src = dedent`
			\@en This is English content.
			\@zh 这是中文内容。
		`;
		const dist = dedent`
			<p>@en This is English content.
			@zh 这是中文内容。</p>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should escaped backslash in line multilingual", () => {
		const md = createMd();
		const src = dedent`
			\\@en This is English content.
			\\@zh 这是中文内容。
		`;
		const dist = dedent`
			<p>\@en This is English content.
			\@zh 这是中文内容。</p>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	const BACKTICK_X3 = "```";
	it("should escaped at sign in line multilingual in a code block", () => {
		const md = createMd();
		const src = dedent`
			${BACKTICK_X3}
			\@en This is English content.
			\@zh 这是中文内容。
			${BACKTICK_X3}
		`;
		const dist = dedent`
			<pre><code>@en This is English content.
			@zh 这是中文内容。
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should escaped backslash in line multilingual in a code block", () => {
		const md = createMd();
		const src = dedent`
			${BACKTICK_X3}
			\\@en This is English content.
			\\@zh 这是中文内容。
			${BACKTICK_X3}
		`;
		const dist = dedent`
			<pre><code>\@en This is English content.
			\@zh 这是中文内容。
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not care about block multilingual tag inside a sentence", () => {
		const md = createMd();
		const src = dedent`
			Use @@@en and @@@zh to open a block, and use @@@ to close a block.
		`;
		const dist = dedent`
			<p>Use @@@en and @@@zh to open a block, and use @@@ to close a block.</p>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not care about block multilingual tag inside a sentence, then with a block multilingual", () => {
		const md = createMd();
		const src = dedent`
			@en - For large blocks (warnings, tables, etc.), use the @@@en / @@@zh / @@@ block format.
			@zh - 对于大块内容（警告框、表格等），请使用 @@@en / @@@zh / @@@ 块格式。

			@@@en
			## Project Structure
			@@@zh
			## 项目结构
			@@@
		`;
		const dist = dedent`
			<ul>
			<li>For large blocks (warnings, tables, etc.), use the @@@en / @@@zh / @@@ block format.</li>
			</ul>
			<h2>Project Structure</h2>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should escaped at sign in block multilingual", () => {
		const md = createMd();
		const src = dedent`
			\@@@en
			This is English content.
			\@@@zh
			这是中文内容。
			\@@@
		`;
		const dist = dedent`
			<p>@@@en
			This is English content.
			@@@zh
			这是中文内容。
			@@@</p>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should escaped backslash in block multilingual", () => {
		const md = createMd();
		const src = dedent`
			\\@@@en
			This is English content.
			\\@@@zh
			这是中文内容。
			\\@@@
		`;
		const dist = dedent`
			<p>\@@@en
			This is English content.
			\@@@zh
			这是中文内容。
			\@@@</p>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should escaped at sign in block multilingual in a code block", () => {
		const md = createMd();
		const src = dedent`
			${BACKTICK_X3}
			\@@@en
			This is English content.
			\@@@zh
			这是中文内容。
			\@@@
			${BACKTICK_X3}
		`;
		const dist = dedent`
			<pre><code>@@@en
			This is English content.
			@@@zh
			这是中文内容。
			@@@
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should escaped backslash in block multilingual in a code block", () => {
		const md = createMd();
		const src = dedent`
			${BACKTICK_X3}
			\\@@@en
			This is English content.
			\\@@@zh
			这是中文内容。
			\\@@@
			${BACKTICK_X3}
		`;
		const dist = dedent`
			<pre><code>\@@@en
			This is English content.
			\@@@zh
			这是中文内容。
			\@@@
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not simply treat ``` as code block start or end when escaping", () => {
		const md = createMd();
		const src = dedent`
			${"````"}
			Input:
			${"```"}
			\@@@en
			This is English content.
			\@@@zh
			这是中文内容。
			\@@@
			${"```"}
			Output:
			${"```"}
			@@@en
			This is English content.
			@@@zh
			这是中文内容。
			@@@
			${"```"}
			${"````"}
		`;
		const dist = dedent`
			<pre><code>Input:
			${BACKTICK_X3}
			@@@en
			This is English content.
			@@@zh
			这是中文内容。
			@@@
			${BACKTICK_X3}
			Output:
			${BACKTICK_X3}
			This is English content.
			${BACKTICK_X3}
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not simply treat ``` as code block start or end when escaping", () => {
		const md = createMd();
		const src = dedent`
			${"```-```"}i-am-inline-code
			@@@en
			This is English content.
			@@@zh
			这是中文内容。
			@@@
			${"``` ` ```"}
		`;
		const dist = dedent`
			<p><code>-</code>i-am-inline-code
			This is English content.
			<code>${"`"}</code></p>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not convert at sign followed with a language tag which has indentation in line multilingual", () => {
		const md = createMd();
		const src = dedent`
			@en 1. This will not work:
			@zh 1. 这不会工作：
			   @en 1. The at sign with language tag has indentation, treat it as a normal text.
			   @zh 1. at符号带语言标签有缩进，将其视为普通文本。
			@en 2. This will work:
			@zh 2. 这才会工作：
			@en    1. The at sign with language tag has no indentation, works properly.
			@zh    1. at符号带语言标签没有缩进，正常工作。
		`;
		const dist = dedent`
			<ol>
			<li>This will not work:
			@en 1. The at sign with language tag has indentation, treat it as a normal text.
			@zh 1. at符号带语言标签有缩进，将其视为普通文本。</li>
			<li>This will work:
			<ol>
			<li>The at sign with language tag has no indentation, works properly.</li>
			</ol>
			</li>
			</ol>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not convert at sign followed with a language tag which has indentation in block multilingual", () => {
		const md = createMd();
		const src = dedent`
			@en 1. This will not work:
			@zh 1. 这不会工作：
				   @@@en
				   1. The at signs with language tag has indentation, treat it as a normal text.
				   @@@zh
				   1. at符号带语言标签有缩进，将其视为普通文本。
				   @@@
			@en 2. This will work:
			@zh 2. 这才会工作：
			@@@en
			   1. The at signs with language tag has no indentation, works properly.
			@@@zh
			   1. at符号带语言标签没有缩进，正常工作。
			@@@
		`;
		const dist = dedent`
			<ol>
			<li>This will not work:
			@@@en
			1. The at signs with language tag has indentation, treat it as a normal text.
			@@@zh
			1. at符号带语言标签有缩进，将其视为普通文本。
			@@@</li>
			<li>This will work:
			<ol>
			<li>The at signs with language tag has no indentation, works properly.</li>
			</ol>
			</li>
			</ol>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not convert at sign followed with an invalid language tag", () => {
		const md = createMd();
		const src = dedent`
			${BACKTICK_X3}java
			@Deprecated(since="9")
			public Boolean(boolean value) { }
			${BACKTICK_X3}
		`;
		const dist = dedent`
			<pre><code class="language-java">@Deprecated(since=&quot;9&quot;)
			public Boolean(boolean value) { }
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should support escape at sign followed with an invalid language tag", () => {
		const md = createMd();
		const src = dedent`
			${BACKTICK_X3}java
			\@Deprecated
			public Boolean(boolean value) { }
			${BACKTICK_X3}
		`;
		const dist = dedent`
			<pre><code class="language-java">@Deprecated
			public Boolean(boolean value) { }
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not convert at sign followed with an invalid language tag which has indentation", () => {
		const md = createMd();
		const src = dedent`
			${BACKTICK_X3}java
			public final class Boolean extends Object implements Serializable,Comparable<Boolean> {
				@Deprecated
				public Boolean(boolean value) { }
			}
			${BACKTICK_X3}
		`;
		const dist = dedent`
			<pre><code class="language-java">public final class Boolean extends Object implements Serializable,Comparable&lt;Boolean&gt; {
				@Deprecated
				public Boolean(boolean value) { }
			}
			</code></pre>
		`;
		const rendered = md.render(src).trimEnd();
		expect(rendered).toBe(dist);
	});
});
