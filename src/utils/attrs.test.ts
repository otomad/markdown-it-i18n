import { describe, it, expect } from "vitest";
import { replaceId } from "./attrs";

describe("replaceId", () => {
	it("should add id", () => {
		const src = "Hello";
		const dist = "Hello {#world}";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	describe("should use id attr instead of #", () => {
		const src = "Hello";
		it('should escape "', () => {
			const dist = 'Hello {id="\\""}';
			expect(replaceId(src, () => '"')).toBe(dist);
		});
		it("should escape '", () => {
			const dist = 'Hello {id="\'"}';
			expect(replaceId(src, () => "'")).toBe(dist);
		});
		it("should escape space", () => {
			const dist = 'Hello {id=" "}';
			expect(replaceId(src, () => " ")).toBe(dist);
		});
	});
	it("should replace id", () => {
		const src = "Hello {#cloud}";
		const dist = "Hello {#world}";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	it("should replace id attr", () => {
		const src = "Hello {id=cloud}";
		const dist = "Hello {#world}";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	it("should replace id attr with quotes", () => {
		const src = 'Hello {id="cloud"}';
		const dist = "Hello {#world}";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	it("should replace id to id attr because of escape", () => {
		const src = "Hello {#cloud}";
		const dist = 'Hello {id="my world"}';
		expect(replaceId(src, () => "my world")).toBe(dist);
	});
	it("support other block tags", () => {
		const src = "# Hello {#cloud}";
		const dist = "# Hello {#world}";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	it("should replace block id only", () => {
		const src = "# Hello [there]{#user} {#client}";
		const dist = "# Hello [there]{#user} {#world}";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	it("should replace id by callback", () => {
		const src = "Hello {#world}";
		const dist = "Hello {#WORLD}";
		expect(replaceId(src, oldId => oldId.toUpperCase())).toBe(dist);
	});
	it("shouldn't modify other attrs", () => {
		const src = "Hello {.class hidden #world key=value}";
		const dist = "Hello {.class hidden key=value #WORLD}"; // Maybe attr order is unimportant, don't care.
		expect(replaceId(src, oldId => oldId.toUpperCase())).toBe(dist);
	});
	it("shouldn't care about leading and trailing white spaces", () => {
		const src = "# Hello  \t  {#client}     ";
		const dist = "# Hello  \t  {#world}     ";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	it("shouldn't care about trailing white spaces, even not the real spaces", () => {
		const src = "# Hello {#client} \t ";
		const dist = "# Hello {#world} \t ";
		expect(replaceId(src, () => "world")).toBe(dist);
	});
	it("should remove id", () => {
		const src = "# Hello {#client key=value}";
		const dist = "# Hello {key=value}";
		expect(replaceId(src, () => "")).toBe(dist);
	});
	it("should remove id along with the whole attrs, but keep trailing spaces", () => {
		const src = "# Hello {#client}     ";
		const dist = "# Hello     ";
		expect(replaceId(src, () => "")).toBe(dist);
	});
	it('should recognize {} inside attr value ""', () => {
		const src = '# Hello {#client key="{"}';
		const dist = '# Hello {key="{" #world}';
		expect(replaceId(src, () => "world")).toBe(dist);
	});
});
