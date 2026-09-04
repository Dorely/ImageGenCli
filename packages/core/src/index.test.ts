import { describe, expect, it } from "vitest";
import { scaffold } from "./index.js";

describe("scaffold", () => {
  it("marks the repo as scaffolded", () => {
    expect(scaffold).toBe(true);
  });
});
