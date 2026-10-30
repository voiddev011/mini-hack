import { detectAnomalies, calculateGrowthRate } from "./analysisEngine";

const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

function fiscalYearStart(value) {
  const year = value?.match(/(?:FY)?\s*(20\d{2})/i)?.[1];
  return year ? Number(year) : null;
}

export function emissionsInTonnes(metric) {
  if (!Number.isFinite(metric?.value)) return null;
  if (/^\s*(?:kt|kilotonnes?)\b/i.test(metric.unit))
    return metric.value * 1_000;
  if (/^\s*(?:mt|megat(?:onnes?|ons?))\b/i.test(metric.unit))
    return metric.value * 1_000_000;
  if (/^\s*(?:t|tonnes?)\b/i.test(metric.unit)) return metric.value;
  return null;
}

export function calculateRestorationScenario({
  areaHectares,
  treesPerHectare,
} = {}) {
  if (!Number.isFinite(areaHectares) || areaHectares <= 0) return null;
  if (!Number.isFinite(treesPerHectare) || treesPerHectare <= 0) return null;
  return {
    areaHectares,
    treesPerHectare,
    estimatedTrees: Math.ceil(areaHectares * treesPerHectare),
    formula: `${areaHectares} ha × ${treesPerHectare} assumed trees/ha`,
    greenCredits: null,
    carbonCredits: null,
  };
}

function totalFromReport(report) {
  const reported = report?.confirmedMetrics?.reportedTotal;
  const reportedTonnes = emissionsInTonnes(reported);
  if (reportedTonnes !== null) {
    return {
      year:
        fiscalYearStart(reported.reportingColumn) ??
        fiscalYearStart(report.reportingYear),
      value: reportedTonnes,
      kind: "reported_total",
      metric: reported,
    };
  }

  const scope1 = report?.confirmedMetrics?.scope1;
  const scope2 = report?.confirmedMetrics?.scope2;
  if (!scope1 || !scope2) return null;
  const scope1Tonnes = emissionsInTonnes(scope1);
  const scope2Tonnes = emissionsInTonnes(scope2);
  if (scope1Tonnes === null || scope2Tonnes === null) return null;
  const scope1Year =
    fiscalYearStart(scope1.reportingColumn) ??
    fiscalYearStart(report.reportingYear);
  const scope2Year =
    fiscalYearStart(scope2.reportingColumn) ??
    fiscalYearStart(report.reportingYear);
  const scope1Boundary = scope1.reportingColumn
    ?.match(/\bstandalone\b|\bconsolidated\b/i)?.[0]
    ?.toLowerCase();
  const scope2Boundary = scope2.reportingColumn
    ?.match(/\bstandalone\b|\bconsolidated\b/i)?.[0]
    ?.toLowerCase();
  if (
    scope1Year !== scope2Year ||
    (scope1Boundary && scope2Boundary && scope1Boundary !== scope2Boundary)
  )
    return null;
  return {
    year: scope1Year,
    value: scope1Tonnes + scope2Tonnes,
    kind: "scope_1_2_subtotal",
    metrics: [scope1, scope2],
  };
}

export function calculateCorporateAnalysis({
  company,
  report,
  reports = [],
  facilityMatches = [],
  benchmark,
} = {}) {
  const series = reports
    .map((item) => totalFromReport(item))
    .filter(
      (item) => Number.isInteger(item?.year) && Number.isFinite(item.value),
    )
    .sort((first, second) => first.year - second.year)
    .filter(
      (item, index, all) => index === 0 || item.year !== all[index - 1].year,
    );
  const growthPercent =
    series.length >= 2
      ? calculateGrowthRate(series.map(({ year, value }) => ({ year, value })))
      : null;
  const anomalies =
    series.length >= 6
      ? detectAnomalies(
          series.map(({ year, value }) => ({ year, value })),
          {
            entity: company,
            metric: "Reported or Scope 1+2 emissions (t CO₂e)",
            minimumBaseline: 5,
          },
        )
      : [];
  const currentIntensity = report?.confirmedMetrics?.emissionsIntensity;
  const intensityValue = Number.isFinite(currentIntensity?.value)
    ? currentIntensity.value
    : null;
  const benchmarkValue = Number.isFinite(benchmark?.value)
    ? benchmark.value
    : null;
  const benchmarkComparable =
    benchmarkValue !== null &&
    intensityValue !== null &&
    benchmark.unit === currentIntensity.unit;
  const intensityGap = benchmarkComparable
    ? intensityValue - benchmarkValue
    : null;
  const requiredImprovementPercent =
    benchmarkComparable && intensityValue > 0
      ? Math.max(0, (intensityGap / intensityValue) * 100)
      : null;
  const latestTotal = series.at(-1) || null;
  const currentMetrics = report?.confirmedMetrics || {};
  const completenessFields = [
    "scope1",
    "scope2",
    "scope3",
    "reportedTotal",
    "emissionsIntensity",
    "totalEnergy",
    "renewableEnergy",
  ];
  const completeCount = completenessFields.filter((field) =>
    Number.isFinite(currentMetrics[field]?.value),
  ).length;
  const completenessPercent = report
    ? (completeCount / completenessFields.length) * 100
    : null;

  const dimensions = [];
  if (growthPercent !== null) {
    dimensions.push({
      key: "trend",
      label: "Reported emissions trend",
      weight: 25,
      pressure: clamp(50 + growthPercent * 2),
      evidence: `${growthPercent >= 0 ? "+" : ""}${growthPercent.toFixed(1)}% across ${series.length} reported annual observations`,
      source:
        latestTotal.kind === "reported_total"
          ? latestTotal.metric.source
          : latestTotal.metrics.map((metric) => metric.source).join("; "),
    });
  }
  if (benchmarkComparable) {
    dimensions.push({
      key: "intensity",
      label: "Intensity vs TrustCarbon Benchmark",
      weight: 20,
      pressure: clamp((intensityValue / benchmarkValue) * 50),
      evidence: `${intensityValue.toFixed(3)} vs ${benchmarkValue.toFixed(3)} ${currentIntensity.unit}`,
      source: `${currentIntensity.source}; user-configured TrustCarbon Benchmark`,
    });
  }
  if (report) {
    dimensions.push({
      key: "data_completeness",
      label: "BRSR data completeness",
      weight: 25,
      pressure: 100 - (completenessPercent ?? 0),
      evidence: `${completeCount}/${completenessFields.length} supported environmental metrics confirmed`,
      source: report.sourceUrl || report.fileName,
    });
  }
  if (series.length >= 6) {
    const upwardAnomaly = anomalies
      .filter((item) => item.changePercent > 0)
      .reduce(
        (maximum, item) => Math.max(maximum, Math.abs(item.deviation)),
        0,
      );
    dimensions.push({
      key: "anomalies",
      label: "Upward statistical anomalies",
      weight: 15,
      pressure: clamp(upwardAnomaly * 25),
      evidence: upwardAnomaly
        ? `${upwardAnomaly.toFixed(2)}σ highest upward anomaly`
        : "No upward anomaly exceeded the configured threshold",
      source:
        "TrustCarbon rolling z-score calculation; reported annual observations",
    });
  }

  const availableWeight = dimensions.reduce(
    (total, dimension) => total + dimension.weight,
    0,
  );
  const corporatePressure = availableWeight
    ? Math.round(
        dimensions.reduce(
          (total, dimension) => total + dimension.pressure * dimension.weight,
          0,
        ) / availableWeight,
      )
    : null;
  const pressureLevel =
    corporatePressure === null
      ? "UNAVAILABLE"
      : corporatePressure >= 67
        ? "HIGH"
        : corporatePressure >= 34
          ? "MODERATE"
          : "LOW";

  const recommendations = [];
  const recommendation = (key, title, reason, metric, scenario, impact) =>
    recommendations.push({
      key,
      title,
      label: "TrustCarbon Recommendation",
      reason,
      currentMetric: metric,
      scenario,
      estimatedImpact: impact,
    });

  if (!currentMetrics.scope1) {
    recommendation(
      "scope1",
      "Establish a verified Scope 1 baseline",
      "No confirmed Scope 1 value is available in the selected BRSR document.",
      "Scope 1: Data unavailable",
      "Inventory direct emissions by facility, source and gas before setting a reduction pathway.",
      "Not calculated: no Scope 1 baseline.",
    );
  }
  if (!currentMetrics.scope2) {
    recommendation(
      "scope2",
      "Improve purchased-energy emissions data",
      "No confirmed Scope 2 value is available in the selected BRSR document.",
      "Scope 2: Data unavailable",
      "Reconcile electricity, heat and steam activity with the applicable grid factors.",
      "Not calculated: no Scope 2 baseline.",
    );
  }
  if (growthPercent !== null && growthPercent > 0) {
    recommendation(
      "trend",
      "Reduce operational emissions",
      `The available annual emissions series increased ${growthPercent.toFixed(1)}% across its observed endpoints.`,
      `${latestTotal.value.toFixed(2)} t CO₂e (${latestTotal.kind === "reported_total" ? "reported total" : "Scope 1+2 subtotal"})`,
      "Review source-level drivers and model a company-approved reduction against the latest reported baseline.",
      "No reduction amount inferred; no user-defined reduction scenario was supplied.",
    );
  }
  if (currentMetrics.totalEnergy) {
    recommendation(
      "energy",
      "Identify energy-efficiency opportunities",
      "A company-reported energy-consumption metric is available for review.",
      `${currentMetrics.totalEnergy.value} ${currentMetrics.totalEnergy.unit}`,
      "Investigate process, fuel and purchased-energy drivers using the company’s activity data.",
      "Not calculated: no energy-saving assumption or emissions factor supplied.",
    );
  }
  if (benchmarkComparable && intensityGap > 0) {
    recommendation(
      "intensity",
      "Reduce emissions intensity",
      `Reported intensity is ${intensityGap.toFixed(3)} ${currentIntensity.unit} above the user-configured TrustCarbon Benchmark.`,
      `${intensityValue.toFixed(3)} ${currentIntensity.unit}`,
      `Scenario threshold: ${benchmarkValue.toFixed(3)} ${benchmark.unit}; required improvement ${requiredImprovementPercent.toFixed(1)}%.`,
      "Intensity gap is calculated; no absolute emissions impact inferred without comparable output data.",
    );
  }
  if (!currentMetrics.renewableEnergy) {
    recommendation(
      "renewables",
      "Measure and evaluate renewable energy",
      "Renewable-energy consumption is not confirmed in the selected document.",
      "Renewable energy: Not reported",
      "Establish a sourced renewable-energy baseline before selecting a procurement or generation scenario.",
      "Not calculated: no energy baseline or procurement scenario.",
    );
  }
  if (facilityMatches.length) {
    recommendation(
      "facilities",
      "Investigate matched emissions sources",
      `${facilityMatches.length} Climate TRACE source names matched the company search in a limited high-emitter sample.`,
      facilityMatches
        .map(
          (source) =>
            `${source.name}: ${source.emissionsMt?.toFixed(2) ?? "n/a"} Mt CO₂e`,
        )
        .join("; "),
      "Verify asset ownership and boundary before integrating any facility estimate into a corporate inventory.",
      "Facility estimates are not additive company Scope 1/2/3 values.",
    );
  }
  recommendation(
    "restoration",
    "Consider eligible restoration activities",
    "A restoration scenario can describe land area and user-assumed planting density, but cannot close a carbon gap or establish Green Credit eligibility.",
    "No carbon-to-tree conversion is made.",
    "Review the applicable official Green Credit methodology and site eligibility before registration.",
    "No offsets, carbon credits or Green Credits are calculated.",
  );

  const alerts = [];
  if (growthPercent !== null && growthPercent > 0) {
    alerts.push({
      type: "emissions_increase",
      severity: growthPercent >= 10 ? "high" : "medium",
      title: "Reported emissions increased",
      explanation: `Reported emissions changed +${growthPercent.toFixed(1)}% across the available annual endpoints.`,
    });
  }
  anomalies
    .filter((item) => item.changePercent > 0)
    .forEach((item) =>
      alerts.push({
        type: "anomaly",
        severity: item.severity,
        title: `Upward statistical anomaly · ${item.year}`,
        explanation: item.explanation,
      }),
    );
  if (benchmarkComparable && intensityGap > 0) {
    alerts.push({
      type: "benchmark_gap",
      severity: "medium",
      title: "Intensity above TrustCarbon Benchmark",
      explanation: `Intensity is ${intensityGap.toFixed(3)} ${currentIntensity.unit} above the selected benchmark; this is not an official target.`,
    });
  }

  return {
    company,
    report,
    reports,
    series,
    growthPercent,
    anomalies,
    currentMetrics,
    latestTotal,
    intensityValue,
    intensityUnit: currentIntensity?.unit || null,
    benchmarkValue,
    benchmarkComparable,
    intensityGap,
    requiredImprovementPercent,
    completenessPercent,
    completenessCount: completeCount,
    score: corporatePressure,
    scoreLevel: pressureLevel,
    scoreDimensions: dimensions,
    recommendations,
    alerts,
    facilityMatches,
    officialTarget: null,
    complianceStatus:
      "No verified company-specific official target or applicability record.",
  };
}
