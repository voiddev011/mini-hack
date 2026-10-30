import {
  EARLIEST_YEAR,
  KPI_DATA,
  LATEST_YEAR,
  TOTAL_COUNTRIES,
  TOTAL_REGIONS,
} from '../data/realData';

export default function Hero({ onGlobalDataClick, onPersonalClick }) {
  return (
    <section className="hero editorial-hero" id="overview">
      <div className="hero-main">
        <div className="hero-copy">
          <p className="eyebrow">TRUSTCARBON / EMISSIONS DATA</p>
          <h1>Environmental emissions<br />data, made <span>understandable.</span></h1>
          <p className="hero-lede">
            Explore reported carbon dioxide emissions by country, region,
            industry, and Indian state. Every figure is tied to its source and
            dataset.
          </p>
          <div className="hero-buttons">
            <button onClick={onGlobalDataClick} className="btn btn-primary">Explore the data</button>
            <button onClick={onPersonalClick} className="btn btn-secondary">Personal tracker</button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <svg className="earth-paths" viewBox="0 0 620 500" focusable="false">
            <path className="earth-orbit earth-orbit-one" d="M35 294 C63 186 151 103 254 82 C340 64 414 86 476 132" />
            <path className="earth-orbit earth-orbit-two" d="M91 397 C168 446 277 453 371 420 C439 396 497 348 544 283" />
            <path className="earth-orbit earth-orbit-three" d="M114 122 C163 77 226 54 290 52 C337 51 380 62 419 83" />
            <path className="earth-orbit earth-orbit-four" d="M465 146 C514 193 540 248 542 305 C543 326 539 344 533 362" />
            <path className="earth-orbit earth-orbit-five" d="M75 344 C52 300 49 251 62 206" />
            <circle className="earth-orbit-point point-one" cx="35" cy="294" r="3" />
            <circle className="earth-orbit-point point-two" cx="544" cy="283" r="2.5" />
            <circle className="earth-orbit-point point-three" cx="290" cy="52" r="2" />
            <circle className="earth-orbit-point point-four" cx="371" cy="420" r="2.5" />
            <circle className="earth-orbit-particle particle-one" cx="476" cy="132" r="2" />
            <circle className="earth-orbit-particle particle-two" cx="75" cy="344" r="1.7" />
          </svg>
          <img className="hero-earth" src="/earth.png" alt="" />
        </div>
      </div>
      <dl className="hero-data-strip" aria-label="Dataset coverage">
        <div><dt>Countries covered</dt><dd>{TOTAL_COUNTRIES}</dd></div>
        <div><dt>Regions covered</dt><dd>{TOTAL_REGIONS}</dd></div>
        <div><dt>Years covered</dt><dd>{EARLIEST_YEAR} to {LATEST_YEAR}</dd></div>
        <div><dt>Latest data</dt><dd>{KPI_DATA.latestDataYear.value}</dd></div>
      </dl>
    </section>
  );
}
