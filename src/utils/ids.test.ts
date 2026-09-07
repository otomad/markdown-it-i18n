import dedent from "dedent";
import { describe, it, expect } from "vitest";
import { collectAllIds } from "./ids";

// #region expect toIncludeSameMembers
declare module "vitest" {
	interface Assertion {
		toIncludeSameMembers(expected: string[] | Set<string>): void;
	}
}

function getFrequencyMap<T>(input: T[] | Set<T>): Map<T, number> {
	const map = new Map<T, number>();
	for (const item of input) {
		map.set(item, (map.get(item) ?? 0) + 1);
	}
	return map;
}

expect.extend({
	toIncludeSameMembers(actual: unknown, expected: unknown) {
		const isActualValid = Array.isArray(actual) || actual instanceof Set;
		const isExpectedValid = Array.isArray(expected) || expected instanceof Set;
		if (!isActualValid || !isExpectedValid) {
			return {
				pass: false,
				message: () => `expected receive an Array or Set, but actually receive: ${typeof actual}`,
			};
		}

		const actualMap = getFrequencyMap(actual as string[] | Set<string>);
		const expectedMap = getFrequencyMap(expected as string[] | Set<string>);
		const actualKeys = actualMap.keys().toArray();
		const expectedKeys = expectedMap.keys().toArray();

		if (actualKeys.length !== expectedKeys.length) {
			return {
				pass: false,
				message: () =>
					`they have a different length. Expected length: ${expectedKeys.length}, actual length: ${actualKeys.length}`,
			};
		}

		for (const key of actualKeys) {
			if (actualMap.get(key) !== expectedMap.get(key)) {
				return {
					pass: false,
					message: () =>
						`assertion failed: element "${key}" encounter times is not matched. Actual: ${actualMap.get(key)}, expected: ${expectedMap.get(key) ?? 0}`,
				};
			}
		}

		return {
			pass: true,
			message: () => "they are equal (ignore sequence)",
		};
	},
});
// #endregion

describe("collectAllIds", () => {
	it("collects IDs in markdown attrs id as hash", () => {
		const src = collectAllIds(`# foo {#bar}`);
		const dist = new Set(["bar"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in markdown attrs id as key=value", () => {
		const src = collectAllIds(`# foo {id=card}`);
		const dist = new Set(["card"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in HTML attrs", () => {
		const src = collectAllIds(`<h1 id="baz">foo</h1>`);
		const dist = new Set(["baz"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in nested markdown attrs", () => {
		const src = collectAllIds(`# The *quick*{#inline-id} brown box {.class #title-id hidden}`);
		const dist = new Set(["inline-id", "title-id"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in nested markdown and HTML attrs", () => {
		const src = collectAllIds(dedent`
			<div id="wrapper">

			# The *quick*{#inline-id} brown box {.class #title-id hidden}
			</div>
		`);
		const dist = new Set(["wrapper", "inline-id", "title-id"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in markdown attrs even if it is duplicated", () => {
		const src = collectAllIds(
			`# Title { .class #id-1 .class-2 #id-2 id=id-3 key=value id="id-4" data-id=id-5 id='id-6' }`,
		);
		const dist = new Set(["id-1", "id-2", "id-3", "id-4", "id-6"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the text", () => {
		const src = collectAllIds(`#text {#id}`);
		const dist = new Set(["id"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the inline code", () => {
		const src = collectAllIds(`Use \`#include "stdio.h"\` to start`);
		const dist = new Set<string>();
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the code block", () => {
		const src = collectAllIds(dedent`
			\`\`\`js
			class Foo { #privateField = null; }
			\`\`\`
		`);
		const dist = new Set<string>();
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the HTML content", () => {
		const src = collectAllIds(`<p> #id </p>`);
		const dist = new Set<string>();
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the markdown link href", () => {
		const src = collectAllIds(`[link](#url){#anchor} start`);
		const dist = new Set(["anchor"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the HTML link href", () => {
		const src = collectAllIds(`<img src="example.com/#hash">`);
		const dist = new Set<string>();
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the non-ID attrs", () => {
		const src = collectAllIds(`<input id="foo" data-id="bar">`);
		const dist = new Set(["foo"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects nested IDs in markdown attrs", () => {
		const src = collectAllIds(
			`# Title ~~_***\`insert\`{#code}***{#bold-italic}_{#underscore}~~{#strikethrough} Here {#title}`,
		);
		const dist = new Set(["code", "bold-italic", "underscore", "strikethrough", "title"]);
		expect(src).toIncludeSameMembers(dist);
	});
	it("is comprehensive testing", () => {
		const src = collectAllIds(dedent`
			# Title {#title-anchor}

			This is text with *italic*{#italic-word} and ![image](./img.src#bottom){.img #img-el}!

			#i-am-not-a-title

			The inline code is \`{ #private }\` and code block is:
			\`\`\`js
			class Also {
				#private = "to have";
			}
			\`\`\`

			:::: details Containing {#code-group open}
			:::info Inside the
			\`\`\`
			Container
			\`\`\`
			:::
			::::

			You can also use **HTML** in the [markdown]{#md} like

			<p id="hello" id="to" data-id="the">#world with <a id='rainbow'>colorful</a> days</p>

			[Back to top](#top)
		`);
		const dist = new Set(["title-anchor", "italic-word", "img-el", "code-group", "md", "hello", "to", "rainbow"]);
		expect(src).toIncludeSameMembers(dist);
	});
});
