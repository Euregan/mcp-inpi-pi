import { describe, it, expect, vi } from "vitest";
import { handleSearchTool } from "../../src/tools/search.js";
import type { INPIClient } from "../../src/api/client.js";

function makeClient(overrides: Partial<Pick<INPIClient, "search">> = {}): INPIClient {
  return {
    search: vi.fn().mockResolvedValue({
      results: [
        {
          applicationNumber: "4216963",
          mark: "FRESHMEAL",
          classNumbers: [29, 43],
          status: "Registered",
          holder: "FRESHMEAL SAS",
          ukey: "FR4216963",
        },
      ],
      total: 1,
      position: 0,
    }),
    getNotice: vi.fn(),
    getImageUrl: vi.fn(),
    ...overrides,
  } as unknown as INPIClient;
}

describe("tool: search_trademarks", () => {
  it("should return results for a valid query", async () => {
    const client = makeClient();
    const result = await handleSearchTool({ query: "FRESHMEAL" }, client);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain("FRESHMEAL");
    expect(result.content[0].text).toContain("4216963");
    expect(result.content[0].text).toContain("Registered");
    expect(result.content[0].text).toContain("FRESHMEAL SAS");
  });

  it("should include disclaimer in response", async () => {
    const client = makeClient();
    const result = await handleSearchTool({ query: "test" }, client);

    expect(result.content[0].text).toContain("ne constitue pas un avis juridique");
    expect(result.content[0].text).toContain("indépendant");
  });

  it("should respect limit parameter", async () => {
    const client = makeClient();
    await handleSearchTool({ query: "test", limit: 50 }, client);

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it("should filter by nice classes when provided", async () => {
    const client = makeClient();
    await handleSearchTool({ query: "test", nice_classes: [29, 43] }, client);

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({ niceClasses: [29, 43] })
    );
  });

  it("should return error for empty query", async () => {
    const client = makeClient();
    const result = await handleSearchTool({ query: "" }, client);

    expect(result.content[0].text).toContain("requis");
    expect(client.search).not.toHaveBeenCalled();
  });
});
