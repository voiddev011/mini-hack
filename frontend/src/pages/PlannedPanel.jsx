export default function PlannedPanel({ title }) {
  return (
    <div className="tc-page">
      <header className="tc-page-heading">
        <div>
          <span className="tc-eyebrow">TRUSTCARBON / INTELLIGENCE</span>
          <h1>{title}</h1>
          <p>This workspace is reserved for the next product phase.</p>
        </div>
        <span className="tc-stage-tag">NOT IN THIS RELEASE</span>
      </header>
      <section className="tc-panel tc-planned-panel">
        <span className="tc-planned-mark" aria-hidden="true">
          ⌁
        </span>
        <h2>Built on the TrustCarbon data layer</h2>
        <p>
          This feature is intentionally not implemented in this release. The
          current phase focuses on a stable dashboard shell, historical global
          context, India state intelligence, and source-level emissions data.
        </p>
      </section>
    </div>
  );
}
