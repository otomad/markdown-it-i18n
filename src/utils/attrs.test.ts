import { describe, it, expect } from "vitest";
import { replaceId } from "./attrs";

describe("replaceId", () => {
	it("should add id", () => {
		const src = "Hello";
		const dist = "Hello {#world}";
		expect(
			replaceId(src, () => "world"),
			dist,
		);
	});
});
