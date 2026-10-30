import { describe, it, expect } from "vitest";
import { validateDataset } from "../datasetValidation";
const header = "Country,Year,CO2_Emissions,Unit,Source\n";
describe("dataset validation", () => {
  it("accepts valid zero emissions and reports year coverage", () => {
    expect(
      validateDataset(
        header + "India,2024,0,t,Example\nIndia,2025,10,t,Example",
        "Country",
        2026,
      ),
    ).toMatchObject({ errors: [], validRows: 2, yearRange: "2024 to 2025" });
  });
  it.each(["-1", "NaN", "Infinity", ""])(
    "rejects invalid emissions %s",
    (value) => {
      const result = validateDataset(
        header + "India,2024," + value + ",t,Example",
        "Country",
        2026,
      );
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validRows).toBe(0);
    },
  );
  it("rejects missing columns and unsupported types", () => {
    expect(
      validateDataset("Country,Year\nIndia,2024", "Country").errors[0],
    ).toContain("Missing required columns");
    expect(validateDataset(header, "Unknown").validRows).toBe(0);
  });
  it("rejects future years, duplicates and missing source citations", () => {
    const result = validateDataset(
      header +
        "India,2024,10,t,Example\nindia,2024,20,t,Example\nIndia,2027,2,t,Example\nIndia,2025,2,t,",
      "Country",
      2026,
    );
    expect(result.errors).toHaveLength(3);
    expect(result.validRows).toBe(1);
  });
  it("handles 150000 observations without argument stack overflow", () => {
    const csv =
      header +
      Array.from(
        { length: 150000 },
        (_, i) => "Place" + i + ",2024,10,t,Example",
      ).join("\n");
    expect(validateDataset(csv, "Country", 2026)).toMatchObject({
      errors: [],
      validRows: 150000,
      yearRange: "2024 to 2024",
    });
  });
});
