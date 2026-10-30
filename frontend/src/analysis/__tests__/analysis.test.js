import { describe, expect, it } from "vitest";
import {
  calculateTrend,
  calculateYearOverYearChange,
  calculateGrowthRate,
} from "../trendAnalysis";
import { detectAnomalies } from "../anomalyDetection";
import { calculateTrustScore } from "../trustScore";
import { calculateRank, calculateRankMovement } from "../rankingAnalysis";
import { compareSeries, compareWithReference } from "../comparisonAnalysis";
import { calculateCorporateAnalysis } from "../corporateAnalysis";

describe("historical trends", () => {
  const rows = [
    { year: 2023, value: 150 },
    { year: 2020, value: 100 },
    { year: 2021, value: 110 },
  ];
  it("orders observations without mutating and filters invalid values", () => {
    expect(
      calculateTrend([...rows, { year: 2022, value: null }]).map(
        (row) => row.year,
      ),
    ).toEqual([2020, 2021, 2023]);
    expect(rows[0].year).toBe(2023);
  });
  it("requires consecutive years for YoY and preserves endpoint growth", () => {
    expect(calculateYearOverYearChange(rows)).toEqual([
      expect.objectContaining({ year: 2021, change: 10, changePercent: 10 }),
    ]);
    expect(calculateGrowthRate(rows)).toBe(50);
    expect(
      calculateYearOverYearChange([
        { year: 2020, value: 0 },
        { year: 2021, value: 5 },
      ])[0].changePercent,
    ).toBeNull();
  });
});

// Alternating changes have mean 0 and sample deviation 50, exactly.
function changesFixture(lastChange, baseline = [-50, 50, -50, 50, 0]) {
  let value = 100;
  return [
    { year: 2000, value },
    ...[...baseline, lastChange].map((percent, index) => {
      value *= 1 + percent / 100;
      return { year: 2001 + index, value };
    }),
  ];
}

describe("rolling anomalies", () => {
  it("requires five baseline changes", () => {
    expect(detectAnomalies(changesFixture(50, [-1, 1, -1, 1]))).toEqual([]);
  });
  it.each([
    [2.01, "low"],
    [2.51, "medium"],
    [3.01, "high"],
    [-3.01, "high"],
  ])("screens absolute z and severity at %s", (change, severity) => {
    expect(detectAnomalies(changesFixture(change * 50))).toEqual([
      expect.objectContaining({ severity }),
    ]);
  });
  it("rejects below-threshold changes and zero deviation", () => {
    expect(detectAnomalies(changesFixture(1.99 * 50))).toEqual([]);
    expect(detectAnomalies(changesFixture(50, [0, 0, 0, 0, 0]))).toEqual([]);
  });
  it.each([
    [2, "low"],
    [2.5, "medium"],
    [3, "high"],
  ])("includes exact threshold %s", (z, severity) => {
    const result = detectAnomalies(changesFixture(z * 50));
    expect(result).toHaveLength(1);
    expect(Math.abs(result[0].deviation)).toBeCloseTo(z, 10);
    expect(result[0].severity).toBe(severity);
  });
});

const scoreInput = {
  source: "Fixture",
  sourceCredibility: 100,
  entityCount: 1,
  expectedEntityCount: 1,
  observations: [{ entity: "A", year: 2024, value: 1 }],
  latestYear: 2024,
  assessedYear: 2024,
  validationRate: 100,
};

describe("trust rubric", () => {
  it("weights sum to one and freshness decays 15 points per year", () => {
    const score = calculateTrustScore(scoreInput);
    expect(
      Object.values(score.weights).reduce((sum, value) => sum + value, 0),
    ).toBeCloseTo(1);
    expect(score.score).toBe(100);
    expect(
      calculateTrustScore({ ...scoreInput, assessedYear: 2026 }).criteria
        .freshness,
    ).toBe(70);
    expect(
      calculateTrustScore({ ...scoreInput, assessedYear: 2040 }).criteria
        .freshness,
    ).toBe(0);
  });
  it.each([
    [40, 1, 100, "Strong"],
    [39, 1, 100, "Good"],
    [0, 0.75, 100, "Good"],
    [0, 0.74, 100, "Moderate"],
    [0, 0, 75, "Moderate"],
    [0, 0, 74, "Limited"],
  ])(
    "applies grade boundaries",
    (sourceCredibility, entityCount, validationRate, grade) => {
      expect(
        calculateTrustScore({
          ...scoreInput,
          sourceCredibility,
          entityCount,
          validationRate,
        }).grade,
      ).toBe(grade);
    },
  );
  it("clamps rubric inputs including negative coverage", () => {
    const score = calculateTrustScore({
      ...scoreInput,
      sourceCredibility: 200,
      entityCount: -1,
      validationRate: -20,
    });
    expect(score.criteria).toMatchObject({
      sourceCredibility: 100,
      coverage: 0,
      validation: 0,
    });
    expect(
      calculateTrustScore({ ...scoreInput, entityCount: 1000 }).criteria
        .coverage,
    ).toBe(100);
  });
});

describe("ranking and comparisons", () => {
  it("ranks finite values, handles missing entities and movement", () => {
    const rows = [
      { id: "A", value: 10 },
      { id: "B", value: 20 },
      { id: "C", value: null },
    ];
    expect(calculateRank(rows, "A")).toEqual({ rank: 2, total: 2, value: 10 });
    expect(calculateRank(rows, "C")).toBeNull();
    expect(calculateRank(rows, "A", { descending: false }).rank).toBe(1);
    expect(
      calculateRankMovement(
        rows,
        [
          { id: "A", value: 30 },
          { id: "B", value: 20 },
        ],
        "A",
      ).direction,
    ).toBe("down");
  });
  it("compares only shared finite years and valid references", () => {
    expect(
      compareSeries(
        [
          { year: 2020, value: 10 },
          { year: 2022, value: null },
        ],
        [
          { year: 2020, value: 7 },
          { year: 2021, value: 8 },
        ],
      ),
    ).toEqual([{ year: 2020, first: 10, second: 7, difference: 3 }]);
    expect(compareWithReference(9, [2, null, 6])).toEqual({
      average: 4,
      difference: 5,
      relation: "above",
    });
    expect(compareWithReference(9, [])).toBeNull();
  });
});

describe("corporate boundaries", () => {
  const metric = (value) => ({
    value,
    unit: "t CO₂e",
    source: "Fixture PDF",
    page: 1,
    reportingColumn: "FY2024-25 standalone",
  });
  const report = {
    reportingYear: "FY2024-25",
    confirmedMetrics: { scope1: metric(10), scope2: metric(5) },
  };
  it("excludes undisclosed scopes from subtotals", () => {
    const result = calculateCorporateAnalysis({ report, reports: [report] });
    expect(result.latestTotal).toMatchObject({
      value: 15,
      kind: "scope_1_2_subtotal",
    });
    expect(result.currentMetrics.scope3).toBeUndefined();
    expect(
      calculateCorporateAnalysis({
        report,
        reports: [{ ...report, confirmedMetrics: { scope1: metric(10) } }],
      }).latestTotal,
    ).toBeNull();
  });
  it("normalizes weights over available dimensions and leaves absent data unavailable", () => {
    const result = calculateCorporateAnalysis({ report, reports: [report] });
    expect(result.scoreDimensions).toHaveLength(1);
    expect(result.score).toBe(Math.round(100 - (2 / 7) * 100));
    expect(calculateCorporateAnalysis().score).toBeNull();
  });
});
