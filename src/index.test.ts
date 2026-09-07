import dedentEscaped from "dedent";
import MarkdownIt from "markdown-it";
import { describe, it, expect } from "vitest";
import i18nMacroPlugin from "./index";
import type { Options } from "./types";
export const dedent = dedentEscaped.withOptions({ escapeSpecialCharacters: false });

function createMd(options?: Options) {
	const md = MarkdownIt({ html: true });
	md.use(i18nMacroPlugin, options);
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
		const md = createMd({ getCurrentLang: () => "ja" });
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
		const md = createMd({ rootLang: "zh" });
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
		const md = createMd({
			langAlias: {
				zhs: "zh-CN",
				zht: "zh-TW",
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
	it("has consistent heading id", () => {
		const md = createMd({ consistentHeadingId: true });
		const src = dedent`
			@en ## This is *English* content.
			@zh ## 这是*中文*内容。
		`;
		const dist = "<h2>这是<em>中文</em>内容。 {#this-is-english-content}</h2>";
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("has consistent heading id without link url", () => {
		const md = createMd({ consistentHeadingId: true });
		const src = dedent`
			@en ## This is "English" content with [link](#url) and ![img](.jpg).
			@zh ## 这是“中文”内容带有[链接](#url)和![图片](.jpg)。
		`;
		const dist =
			'<h2>这是“中文”内容带有<a href="#url">链接</a>和<img src=".jpg" alt="图片">。 {#this-is-english-content-with-link-and}</h2>';
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("has consistent heading id which not based on english", () => {
		const md = createMd({ consistentHeadingId: { useLang: "zh" } });
		const src = dedent`
			@en ## This is "English" content with [link](#url) and ![img](.jpg).
			@zh ## 这是“中文”内容带有[链接](#url)和![图片](.jpg)。
		`;
		const dist =
			'<h2>这是“中文”内容带有<a href="#url">链接</a>和<img src=".jpg" alt="图片">。 {#这是-中文-内容带有链接和}</h2>';
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("has consistent heading id without creating duplicated ids", () => {
		const md = createMd({ consistentHeadingId: true });
		const src = dedent`
			@en # Foo
			@zh # 甲
			@en # Foo
			@zh # 甲
			@en # Foo
			@zh # 甲
		`;
		const dist = dedent`
			<h1>甲 {#foo}</h1>
			<h1>甲 {#foo-1}</h1>
			<h1>甲 {#foo-2}</h1>
		`;
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("should not change ids that has been manually defined", () => {
		const md = createMd({ consistentHeadingId: true });
		const src = dedent`
			@en # Foo {#en-id}
			@zh # 甲 {#zh-id}
			@en # Foo
			@zh # 甲
			@en # Foo
			@zh # 甲
		`;
		const dist = dedent`
			<h1>甲 {#zh-id}</h1>
			<h1>甲 {#foo}</h1>
			<h1>甲 {#foo-1}</h1>
		`;
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("has consistent heading id without creating ids that has been manually defined", () => {
		const md = createMd({ consistentHeadingId: true });
		const src = dedent`
			@en # Foo {#foo-1}
			@zh # 甲 {#foo-1}
			@en # Foo
			@zh # 甲
			@en # Foo
			@zh # 甲
		`;
		const dist = dedent`
			<h1>甲 {#foo-1}</h1>
			<h1>甲 {#foo}</h1>
			<h1>甲 {#foo-2}</h1>
		`;
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
	it("has consistent heading id without creating ids that has been manually defined in html", () => {
		const md = createMd({ consistentHeadingId: true });
		const src = dedent`
			@en # Foo {#foo-2}
			@zh # 甲 {#foo-2}
			@en # Foo
			@zh # 甲
			@en # Foo
			@zh # 甲
			<img id="foo" />
		`;
		const dist = dedent`
			<h1>甲 {#foo-2}</h1>
			<h1>甲 {#foo-1}</h1>
			<h1>甲 {#foo-3}</h1>
			<img id="foo" />
		`;
		const rendered = md.render(src, { localeIndex: "zh" }).trimEnd();
		expect(rendered).toBe(dist);
	});
});
