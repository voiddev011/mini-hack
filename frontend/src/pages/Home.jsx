import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import Hero from '../components/Hero';
import SectionHeading from '../components/ui/SectionHeading';
import EmissionsTrend from '../components/charts/EmissionsTrend';
import RegionalChart from '../components/charts/RegionalChart';
import CountryExplorer from '../components/CountryExplorer';
import IndiaStateChart from '../components/maps/IndiaStateChart';
import DataTable from '../components/DataTable';
import DataSources from '../components/DataSources';
import PersonalTracker from '../components/PersonalTracker';
import IndustryOverview from '../components/IndustryOverview';

// Real data
import {
  EMISSIONS_TREND,
  REGIONAL_DATA,
  TABLE_DATA,
} from '../data/realData';

export default function Home({ isLoggedIn }) {
  const globalDataRef = useRef(null);
  const personalRef = useRef(null);
  const navigate = useNavigate();

  const scrollToGlobalData = () => {
    globalDataRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const scrollToPersonal = () => {
    personalRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-page">

      {/* Overview */}
      <Hero
        onGlobalDataClick={scrollToGlobalData}
        onPersonalClick={scrollToPersonal}
      />

      {/* Global */}
      <section
        className="industrial-section"
        id="global-carbon-data"
        ref={globalDataRef}
        style={{ scrollMarginTop: '100px' }}
      >
        <SectionHeading
          title="Global emissions"
          subtitle="Country and regional totals calculated from the supplied emissions records."
        />

        <div style={{ marginBottom: '32px' }}>
          <EmissionsTrend data={EMISSIONS_TREND} />
        </div>
      </section>

      {/* Regional */}
      <section
        className="industrial-section"
        id="regional-analysis"
        style={{ scrollMarginTop: '100px', paddingTop: '0' }}
      >
        <SectionHeading
          title="Regional Analysis"
          subtitle="Compare emissions across regions. Use the year filter to explore any year from 1990 to 2019."
        />
        <div style={{ marginBottom: '32px' }}>
          <RegionalChart data={REGIONAL_DATA} />
        </div>
      </section>

      {/* Country explorer */}
      <section
        className="industrial-section"
        id="country-explorer"
        style={{ scrollMarginTop: '100px', paddingTop: '0' }}
      >
        <SectionHeading
          title="Country Explorer"
          subtitle="Search any country from the dataset to see its CO₂ history, total emissions, and per-capita figures."
        />
        <CountryExplorer />
      </section>

      {/* India */}
      <section
        className="industrial-section"
        id="india-states"
        style={{ scrollMarginTop: '100px', paddingTop: '0' }}
      >
        <SectionHeading
          title="India state emissions"
          subtitle="A state-level snapshot of per-capita CO₂, CO and CH₄ values from the supplied India dataset."
        />
        <IndiaStateChart />
      </section>

      <section
        className="industrial-section"
        id="industries"
        style={{ scrollMarginTop: '100px', paddingTop: '0' }}
      >
        <IndustryOverview />
      </section>

      <section
        className="industrial-section public-dataset-status"
        id="latest-approved-datasets"
        style={{ scrollMarginTop: '100px', paddingTop: '0' }}
      >
        <span className="section-index">PUBLICATION STATUS</span>
        <h2>Latest approved datasets</h2>
        <p>No user-submitted datasets are currently published as official TrustCarbon data. Reviewer approval makes a submission eligible for a separate publication decision and does not make private files public.</p>
      </section>

      {/* Data table */}
      <section
        className="industrial-section"
        id="data-table"
        style={{ scrollMarginTop: '100px', paddingTop: '0' }}
      >
        <SectionHeading
          title="Data table"
          subtitle="Browse reported country and region values by year. Emissions are shown in megatonnes."
        />
        <DataTable data={TABLE_DATA} />
      </section>

      {/* Sources and methodology */}
      <section
        className="industrial-section"
        id="data-sources"
        style={{ scrollMarginTop: '100px', paddingTop: '0' }}
      >
        <DataSources />
      </section>

      <div
        ref={personalRef}
        id="personal-tracker"
        style={{ scrollMarginTop: '100px' }}
      >
        <PersonalTracker
          isLoggedIn={isLoggedIn}
          onLoginClick={() => navigate('/login')}
          onDashboardClick={() => navigate('/dashboard')}
          data={null}
        />
      </div>
    </div>
  );
}
