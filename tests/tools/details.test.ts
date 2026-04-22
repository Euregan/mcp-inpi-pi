import { describe, it, expect, vi } from "vitest";
import { handleDetailsTool } from "../../src/tools/details.js";
import type { INPIClient } from "../../src/api/client.js";

const SAMPLE_DETAILS = {
  applicationNumber: "4216963",
  mark: "FRESHMEAL",
  markType: "Word",
  status: "Registered",
  collection: "FR",
  classNumbers: [29, 43],
  applicationDate: "2018-01-15",
  registrationDate: "2018-06-01",
  expiryDate: "2028-01-15",
  holders: [
    { name: "FRESHMEAL SAS", identifier: "123456789", country: "FR" },
  ],
  events: [
    { type: "Registration", date: "2018-06-01", description: "Marque enregistrée" },
  ],
};

function makeClient(overrides: Partial<Pick<INPIClient, "getNotice">> = {}): INPIClient {
  return {
    search: vi.fn(),
    getNotice: vi.fn().mockResolvedValue(SAMPLE_DETAILS),
    getImageUrl: vi.fn(),
    ...overrides,
  } as unknown as INPIClient;
}

describe("tool: get_trademark_details", () => {
  it("should return parsed notice for a valid trademark number", async () => {
    const client = makeClient();
    const result = await handleDetailsTool({ trademark_number: "FR4216963" }, client);

    const text = result.content[0].text;
    expect(text).toContain("FRESHMEAL");
    expect(text).toContain("4216963");
    expect(text).toContain("Registered");
    expect(text).toContain("29");
    expect(text).toContain("43");
    expect(text).toContain("FRESHMEAL SAS");
    expect(text).toContain("2018-01-15");
    expect(text).toContain("Registration");
  });

  it("should include disclaimer in response", async () => {
    const client = makeClient();
    const result = await handleDetailsTool({ trademark_number: "FR4216963" }, client);

    expect(result.content[0].text).toContain("ne constitue pas un avis juridique");
    expect(result.content[0].text).toContain("indépendant");
  });

  it("should return error for invalid trademark number format", async () => {
    const client = makeClient();

    const cases = [
      { trademark_number: "" },
      { trademark_number: "INVALID" },
      { trademark_number: "FR123" },
    ];

    for (const params of cases) {
      const result = await handleDetailsTool(params, client);
      expect(result.content[0].text).toContain("invalide");
    }

    expect(client.getNotice).not.toHaveBeenCalled();
  });
});
