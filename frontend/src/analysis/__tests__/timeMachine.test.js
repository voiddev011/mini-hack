import { expect, it } from "vitest";
import {
  baselineChange,
  cumulativeChange,
  exploreYear,
  rankAtYear,
} from "../timeMachine";

const rows = [
  { year: 2020, value: 10 },
  { year: 2021, value: 12 },
  { year: 2023, value: 15 },
];
it("calculates exact baseline differences without inferring missing years", () => {
  expect(baselineChange(rows, 2023, 2020)).toEqual({
    change: 5,
    changePercent: 50,
  });
  expect(baselineChange(rows, 2022, 2020)).toBeNull();
  expect(
    baselineChange(
      [
        { year: 2020, value: 0 },
        { year: 2021, value: 5 },
      ],
      2021,
      2020,
    ).changePercent,
  ).toBeNull();
});
it("distinguishes the previous available observation from YoY", () => {
  expect(exploreYear(rows, 2021, 2020).isYearOverYear).toBe(true);
  expect(exploreYear(rows, 2023, 2020)).toMatchObject({
    isYearOverYear: false,
    previous: { year: 2021 },
    previousChange: { change: 3 },
  });
  expect(exploreYear(rows, 2022, 2020).current).toBeNull();
});
it("sums consecutive annual changes only across complete coverage", () => {
  expect(cumulativeChange(rows, 2021, 2020)).toBe(2);
  expect(cumulativeChange(rows, 2023, 2020)).toBeNull();
  expect(cumulativeChange(rows, 2020, 2021)).toBeNull();
  expect(cumulativeChange(rows, 2020, 2020)).toBe(0);
});
it("ranks only entities observed in that year", () => {
  const ranked = [
    { entity: "A", year: 2020, value: 10 },
    { entity: "B", year: 2020, value: 20 },
    { entity: "B", year: 2021, value: 100 },
  ];
  expect(rankAtYear(ranked, "A", 2020)).toEqual({
    rank: 2,
    total: 2,
    value: 10,
  });
  expect(rankAtYear(ranked, "A", 2021)).toBeNull();
});
