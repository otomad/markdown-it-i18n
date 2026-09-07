import dedent from "dedent";
import { describe, it, expect } from "vitest";
import { collectAllIds } from "./ids";

// #region expect toIncludeSameMembers
declare module "vitest" {
	interface Assertion<T = any> {
		toIncludeSameMembers(expected: T[]): void;
	}
}

expect.extend({
	toIncludeSameMembers(actual: unknown, expected: unknown[]) {
		if (!Array.isArray(actual)) {
			return {
				pass: false,
				message: () => `expected receive an array, but actually receive: ${typeof actual}`,
			};
		}

		if (actual.length !== expected.length) {
			return {
				pass: false,
				message: () =>
					`these arrays have a different length. Expected length: ${expected.length}, actual length: ${actual.length}`,
			};
		}

		const remaining = [...actual];

		for (const expectedItem of expected) {
			const index = remaining.findIndex(actualItem => this.equals(actualItem, expectedItem));

			if (index === -1) {
				return {
					pass: false,
					message: () =>
						`assertion failed: cannot match the expected element ${JSON.stringify(expectedItem)}`,
				};
			}

			remaining.splice(index, 1);
		}

		return {
			pass: true,
			message: () => "these array are equals (ignore sequence)",
		};
	},
});
// #endregion

describe("collectAllIds", () => {
	it("collects IDs in markdown attrs", () => {
		const src = collectAllIds(`# foo {#bar}`);
		const dist = ["bar"];
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in HTML attrs", () => {
		const src = collectAllIds(`<h1 id="baz">foo</h1>`);
		const dist = ["baz"];
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in nested markdown attrs", () => {
		const src = collectAllIds(`# The *quick*{#inline-id} brown box {.class #title-id hidden}`);
		const dist = ["inline-id", "title-id"];
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in nested markdown and HTML attrs", () => {
		const src = collectAllIds(dedent`
			<div id="wrapper">

			# The *quick*{#inline-id} brown box {.class #title-id hidden}
			</div>
		`);
		const dist = ["wrapper", "inline-id", "title-id"];
		expect(src).toIncludeSameMembers(dist);
	});
	it("collects IDs in markdown attrs even if it is duplicated", () => {
		const src = collectAllIds(`# Title { .class #id-1 .class-2 #id-2 id=id-3 key=value id="id-4" data-id=id-5 }`);
		const dist = ["id-1", "id-2", "id-3", "id-4"];
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the text", () => {
		const src = collectAllIds(`#text {#id}`);
		const dist = ["id"];
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the inline code", () => {
		const src = collectAllIds(`Use \`#include "stdio.h"\` to start`);
		const dist: string[] = [];
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the code block", () => {
		const src = collectAllIds(dedent`
			\`\`\`js
			class Foo { #privateField = null; }
			\`\`\`
		`);
		const dist: string[] = [];
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the HTML content", () => {
		const src = collectAllIds(`<p> #id </p>`);
		const dist: string[] = [];
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the markdown link href", () => {
		const src = collectAllIds(`[link](#url){#anchor} start`);
		const dist = ["anchor"];
		expect(src).toIncludeSameMembers(dist);
	});
	it("does not collect IDs in the HTML link href", () => {
		const src = collectAllIds(`<img src="example.com/#hash">`);
		const dist: string[] = [];
		expect(src).toIncludeSameMembers(dist);
	});
});
