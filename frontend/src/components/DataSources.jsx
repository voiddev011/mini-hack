import { DATA_SOURCES_INFO } from "../data/realData";

export default function DataSources() {
  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">DATA / PROVENANCE</span>
          <h1>Sources and methodology</h1>
          <p>
            Trace historical context, detailed source estimates, and the
            fallback records used by TrustCarbon.
          </p>
        </div>
      </header>

      <section className="tc-source-catalog" aria-label="Data source catalog">
        <article className="tc-panel tc-source-card">
          <span className="tc-eyebrow">PRIMARY / GLOBAL HISTORY</span>
          <h2>
            <a
              href="https://ourworldindata.org/co2-and-greenhouse-gas-emissions"
              target="_blank"
              rel="noreferrer"
            >
              Our World in Data ↗
            </a>
          </h2>
          <p>
            Primary global historical CO₂ source for country totals, per-capita
            comparisons, annual trends and rankings. Historical estimates are
            not real-time measurements.
          </p>
          <dl>
            <div>
              <dt>Data</dt>
              <dd>Annual emissions and CO₂ emissions per capita</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Official OWID Grapher CSV exports</dd>
            </div>
            <div>
              <dt>Fallback</dt>
              <dd>Bundled country CSV when the source cannot be reached</dd>
            </div>
          </dl>
        </article>
        <article className="tc-panel tc-source-card">
          <span className="tc-eyebrow">DETAILED / SOURCES AND SECTORS</span>
          <h2>
            <a
              href="https://api.climatetrace.org/v7/docs/index.html"
              target="_blank"
              rel="noreferrer"
            >
              Climate TRACE ↗
            </a>
          </h2>
          <p>
            Official API v7 source and facility estimates, country sector
            totals, admin-level India estimates, subsectors and reported source
            metadata. Requests are made on demand without private browser
            credentials.
          </p>
          <dl>
            <div>
              <dt>Data</dt>
              <dd>
                CO₂-equivalent totals, sectors, state/admin rankings, source
                records and locations when available
              </dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>
                Country and sector coverage varies by year; India admin-level
                map and scenario totals are used from 2021 onward
              </dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Public Climate TRACE API v7</dd>
            </div>
          </dl>
        </article>
        {DATA_SOURCES_INFO.map((source) => (
          <article className="tc-panel tc-source-card" key={source.name}>
            <span className="tc-eyebrow">BUNDLED / FALLBACK</span>
            <h2>{source.name}</h2>
            <p>
              Retained as a fallback/reference dataset. Source coverage is
              described as supplied and is not merged into Climate TRACE or OWID
              records.
            </p>
            <dl>
              <div>
                <dt>Coverage</dt>
                <dd>{source.coverage}</dd>
              </div>
              <div>
                <dt>Reporting period</dt>
                <dd>{source.reportingPeriod}</dd>
              </div>
              <div>
                <dt>Metrics</dt>
                <dd>{source.metrics}</dd>
              </div>
              <div>
                <dt>File</dt>
                <dd>{source.source}</dd>
              </div>
            </dl>
          </article>
        ))}
        <article className="tc-panel tc-source-card tc-demo-source-card">
          <span className="tc-eyebrow">ILLUSTRATIVE / NOT VERIFIED</span>
          <h2>Industry emissions demonstration data</h2>
          <p>
            Illustrative values retained only as a labelled fallback when
            detailed sector data is unavailable. These values are not official
            TrustCarbon emissions data.
          </p>
          <dl>
            <div>
              <dt>Coverage</dt>
              <dd>Six sectors, 2010 to 2024</dd>
            </div>
            <div>
              <dt>Metrics</dt>
              <dd>Illustrative CO₂ values, million tonnes</dd>
            </div>
            <div>
              <dt>File</dt>
              <dd>industry_demo.csv</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="tc-panel tc-methodology-panel">
        <div className="tc-panel-heading">
          <div>
            <span className="tc-eyebrow">METHOD / TRUST BOUNDARIES</span>
            <h2>How to read these datasets</h2>
          </div>
        </div>
        <div className="tc-method-grid">
          <article>
            <h3>Separate data roles</h3>
            <p>
              Our World in Data provides global historical context. Climate
              TRACE provides detailed source and sector context. Their
              estimates, units, periods and coverage are not silently combined.
            </p>
          </article>
          <article>
            <h3>Fallback and cache</h3>
            <p>
              OWID observations are cached in memory and by the browser. If the
              remote historical source is unavailable, the bundled country CSV
              is clearly identified as the active fallback.
            </p>
          </article>
          <article>
            <h3>Private submissions</h3>
            <p>
              Supabase CSV submissions remain private through upload, validation
              and review. Approval alone does not publish or merge a dataset
              into public records.
            </p>
          </article>
          <article>
            <h3>India state data</h3>
            <p>
              From 2021 onward, state totals and trends use Climate TRACE
              admin-level CO₂e estimates. Earlier years use the bundled
              per-capita snapshot, which contains no reporting year or state
              totals; no missing data is inferred.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
