import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT } from "../constants";
import { toFormValues, validate } from "./validation";

describe("form validation", () => {
  it("accepts the default stone and returns numbers", () => {
    const { errors, input } = validate(toFormValues(DEFAULT_INPUT));
    expect(errors).toEqual({});
    expect(input).toEqual(DEFAULT_INPUT);
  });
  it("flags empty, non-numeric and out-of-range values", () => {
    const v = { ...toFormValues(DEFAULT_INPUT), carat: "", depth: "abc", table: "500", x: "0" };
    const { errors, input } = validate(v);
    expect(input).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["carat", "depth", "table", "x"]);
    expect(errors.table).toContain("between 40 and 100");
  });
  it("rejects Infinity and accepts boundary values", () => {
    expect(validate({ ...toFormValues(DEFAULT_INPUT), z: "1e999" }).errors.z).toBeDefined();
    expect(validate({ ...toFormValues(DEFAULT_INPUT), carat: "0.2", z: "8" }).input).not.toBeNull();
  });
});
