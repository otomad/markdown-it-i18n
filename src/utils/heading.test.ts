import MarkdownIt from "markdown-it";
import attrsPlugin from "markdown-it-attrs";
import { describe, it, expect } from "vitest";
import { extractHtmlHeadingContent, extractHeadingContent } from "./heading";

describe("extractHtmlHeadingContent", () => {
	it("should support lowercase heading", () => {
		expect(extractHtmlHeadingContent("<h1>Hello</h1>")).toBe("Hello");
	});
	it("should support uppercase heading", () => {
		expect(extractHtmlHeadingContent("<H2>World</H2>")).toBe("World");
	});
	it("should support heading with attributes and nested", () => {
		expect(extractHtmlHeadingContent('<h3 class="title">Test <span>text</span></h3>')).toBe("Test text");
	});
	it("should support heading with nested", () => {
		expect(extractHtmlHeadingContent("<div>Before <h4>Heading</h4> After</div>")).toBe("Heading");
	});
	it("should ignore self closed heading tags", () => {
		expect(extractHtmlHeadingContent("<h1 />Extra")).toBe("");
	});
	it("should support HTML entities", () => {
		expect(extractHtmlHeadingContent("<h1>&amp;copy; 2026</h1>")).toBe("&copy; 2026");
		expect(extractHtmlHeadingContent("<h1>&copy; 2026</h1>")).toBe("© 2026");
	});
	it("has no heading here", () => {
		expect(extractHtmlHeadingContent("<p>no headings here</p>")).toBe(null);
	});
	it("could extract the first heading only", () => {
		expect(extractHtmlHeadingContent("<h1>First</h1><h2>Second</h2>")).toBe("First");
	});
	it("should escape characters", () => {
		expect(extractHtmlHeadingContent('<h1 id="a>b">Text</h1>')).toBe("Text");
		expect(extractHtmlHeadingContent('<h1 id="a\\"b">Text</h1>')).toBe("Text");
	});
	it("should support complex tags", () => {
		expect(extractHtmlHeadingContent('<h1>Hello <em>World</em> with <img src="./img.jpg" alt="Img"></h1>\n')).toBe(
			"Hello World with",
		);
	});
	it("should support complex tags", () => {
		expect(extractHtmlHeadingContent('<h1>Hello <em>World</em> with <img src="./img.jpg" alt="Img"></h1>\n')).toBe(
			"Hello World with",
		);
	});
	it("should support complex tags", () => {
		expect(
			extractHtmlHeadingContent(
				`<blockquote><ul><li><h1>Hello <em>World</em> with <img src="./img.jpg" alt="Img"></h1></li></ul></blockquote>`,
			),
		).toBe("Hello World with");
	});
});

describe("extractHeadingContent", () => {
	describe("Without markdown it environment", () => {
		it("extract heading", () => {
			expect(extractHeadingContent("> * # Hello World")).toBe("Hello World");
		});
		it("extract heading with attrs", () => {
			expect(extractHeadingContent("> * # Hello World {#title}")).toBe("Hello World");
		});
		it("returns null", () => {
			expect(extractHeadingContent("> * Hello World {#title}")).toBe(null);
		});
		it("handles nested tags", () => {
			expect(extractHeadingContent("# Hello *World* with ![Img](./img.jpg)")).toBe(
				"Hello *World* with ![Img](./img.jpg)",
			);
		});
		it("handles nested tags with quote", () => {
			expect(extractHeadingContent("> * # Hello *World* with ![Img](./img.jpg)")).toBe(
				"Hello *World* with ![Img](./img.jpg)",
			);
		});
		it("extract heading by removing spaces", () => {
			expect(extractHeadingContent("> * #    Hello World     ")).toBe("Hello World");
		});
		it("extract heading by removing tabs", () => {
			expect(extractHeadingContent("> * #    Hello World \t")).toBe("Hello World");
		});
		it("extract heading by removing zero width spaces", () => {
			expect(extractHeadingContent("> * # Hello World \u200b")).toBe("Hello World");
		});
	});
	describe("With markdown it environment", () => {
		const md = MarkdownIt();
		md.use(attrsPlugin);

		it("extract heading", () => {
			expect(extractHeadingContent("> * # Hello World", { md })).toBe("Hello World");
		});
		it("extract heading with attrs", () => {
			expect(extractHeadingContent("> * # Hello World {#title}", { md })).toBe("Hello World");
		});
		it("returns null", () => {
			expect(extractHeadingContent("> * Hello World {#title}", { md })).toBe(null);
		});
		it("handles nested tags", () => {
			expect(extractHeadingContent("# Hello *World* with ![Img](./img.jpg)", { md })).toBe("Hello World with");
		});
		it("handles nested tags with quote", () => {
			expect(extractHeadingContent("> * # Hello *World* with ![Img](./img.jpg)", { md })).toBe(
				"Hello World with",
			);
		});
		it("extract heading by removing spaces", () => {
			expect(extractHeadingContent("> * #    Hello World   \xa0 ", { md })).toBe("Hello World");
		});
		it("extract heading by removing tabs", () => {
			expect(extractHeadingContent("> * # \v Hello World \t", { md })).toBe("Hello World");
		});
		it("extract heading by removing zero width spaces", () => {
			expect(extractHeadingContent("> * # \ufeff Hello World \u200b", { md })).toBe("Hello World");
		});
	});
});
