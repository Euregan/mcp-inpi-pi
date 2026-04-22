import { describe, it, expect } from "vitest";
import {
  buildMarkQuery,
  buildClassFilter,
  buildActiveFilter,
  buildHolderFilter,
  buildSearchQuery,
  buildSearchBody,
} from "../../src/api/query-builder.js";

describe("query-builder", () => {
  it("should build a simple Mark query with uppercase term", () => {
    expect(buildMarkQuery("FreshMeal")).toBe("[Mark=FRESHMEAL]");
    expect(buildMarkQuery("archidat")).toBe("[Mark=ARCHIDAT]");
    expect(buildMarkQuery("INPI")).toBe("[Mark=INPI]");
  });

  it("should build a class filter with OU operator", () => {
    expect(buildClassFilter([9, 16])).toBe("[ClassNumber=(9 OU 16)]");
    expect(buildClassFilter([29, 43])).toBe("[ClassNumber=(29 OU 43)]");
  });

  it("should build a single-class filter without OU", () => {
    expect(buildClassFilter([9])).toBe("[ClassNumber=9]");
  });

  it("should build an active-only filter with today's date", () => {
    const date = new Date("2026-04-02");
    expect(buildActiveFilter(date)).toBe("[ExpiryDate=20260402:99991231]");
  });

  it("should build an active-only filter for another date", () => {
    const date = new Date("2025-01-15");
    expect(buildActiveFilter(date)).toBe("[ExpiryDate=20250115:99991231]");
  });

  it("should build a holder filter on DEPOSANT and DEPOTIT", () => {
    expect(buildHolderFilter("INPI")).toBe("[(DEPOSANT OU DEPOTIT)=INPI]");
    expect(buildHolderFilter("apple")).toBe("[(DEPOSANT OU DEPOTIT)=APPLE]");
  });

  it("should combine multiple filters with ET", () => {
    const result = buildSearchQuery({
      query: "FreshMeal",
      niceClasses: [29, 43],
      activeOnly: true,
    });
    expect(result).toMatch(/^\[Mark=FRESHMEAL\]/);
    expect(result).toContain("ET [ClassNumber=(29 OU 43)]");
    expect(result).toMatch(/ET \[ExpiryDate=\d{8}:99991231\]$/);
  });

  it("should omit class filter when niceClasses is empty", () => {
    const result = buildSearchQuery({ query: "test", activeOnly: false });
    expect(result).toBe("[Mark=TEST]");
  });

  it("should omit active filter when activeOnly is false", () => {
    const result = buildSearchQuery({ query: "test", activeOnly: false });
    expect(result).not.toContain("ExpiryDate");
  });

  it("should include holder filter when provided", () => {
    const result = buildSearchQuery({
      query: "test",
      holder: "Apple",
      activeOnly: false,
    });
    expect(result).toBe("[Mark=TEST] ET [(DEPOSANT OU DEPOTIT)=APPLE]");
  });

  it("should build a complete search body with collections and size", () => {
    const body = buildSearchBody({
      query: "FreshMeal",
      collections: ["FR"],
      limit: 50,
      position: 20,
    });
    expect(body.collections).toEqual(["FR"]);
    expect(body.size).toBe(50);
    expect(body.position).toBe(20);
    expect(body.query).toMatch(/^\[Mark=FRESHMEAL\]/);
  });

  it("should cap size at 200 and default collections to all three", () => {
    const body = buildSearchBody({ query: "test", limit: 999 });
    expect(body.size).toBe(200);
    expect(body.collections).toEqual(["FR", "EU", "WO"]);
    expect(body.position).toBe(0);
  });
});
