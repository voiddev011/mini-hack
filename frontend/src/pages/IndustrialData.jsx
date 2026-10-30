import React, { useState } from 'react';
import SectionHeading from '../components/ui/SectionHeading';
import KpiGrid from '../components/ui/KpiGrid';
import KpiCard from '../components/ui/KpiCard';
import EmissionsTrend from '../components/charts/EmissionsTrend';
import RegionalChart from '../components/charts/RegionalChart';
import ComparisonChart from '../components/charts/ComparisonChart';
import DataTable from '../components/DataTable';
import DataSources from '../components/DataSources';

import {
  DEMO_KPI_DATA,
  DEMO_EMISSIONS_TREND,
  DEMO_REGIONAL_COMPARISON,
  DEMO_ENTITY_ANALYSIS,
  DEMO_TABLE_DATA,
  DEMO_DATA_SOURCES
} from '../data/mockData';

export default function IndustrialData() {
  const [dataConnected, setDataConnected] = useState(false);

  return (
    <div className="page-container">
      <div className="dashboard-head-actions" style={{ marginBottom: '16px' }}>
        <button 
          onClick={() => setDataConnected(!dataConnected)} 
          className="demo-connect-btn"
        >
          {dataConnected ? "🔌 Disconnect Dataset" : "🔌 Connect Demo Dataset"}
        </button>
      </div>

      <SectionHeading 
        title="Industrial Carbon Emissions" 
        subtitle="Detailed global environmental database including historical trends, region profiles, and verification tables."
      />

      {/* KPIs */}
      <KpiGrid>
        <KpiCard 
          title="Total Emissions" 
          value={dataConnected ? DEMO_KPI_DATA.totalEmissions.value : null} 
          desc={dataConnected ? DEMO_KPI_DATA.totalEmissions.desc : null} 
          isEmpty={!dataConnected}
        />
        <KpiCard 
          title="Countries / Regions" 
          value={dataConnected ? DEMO_KPI_DATA.countriesRegions.value : null} 
          desc={dataConnected ? DEMO_KPI_DATA.countriesRegions.desc : null} 
          isEmpty={!dataConnected}
        />
        <KpiCard 
          title="Latest Data Year" 
          value={dataConnected ? DEMO_KPI_DATA.latestDataYear.value : null} 
          desc={dataConnected ? DEMO_KPI_DATA.latestDataYear.desc : null} 
          isEmpty={!dataConnected}
        />
        <KpiCard 
          title="Average Per Capita" 
          value={dataConnected ? DEMO_KPI_DATA.averagePerCapita.value : null} 
          desc={dataConnected ? DEMO_KPI_DATA.averagePerCapita.desc : null} 
          isEmpty={!dataConnected}
        />
      </KpiGrid>

      {/* Grid of charts */}
      <div className="analytics-grid">
        <EmissionsTrend 
          data={dataConnected ? DEMO_EMISSIONS_TREND : null} 
        />
        <ComparisonChart 
          data={dataConnected ? DEMO_ENTITY_ANALYSIS : null} 
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <RegionalChart 
          data={dataConnected ? DEMO_REGIONAL_COMPARISON : null} 
        />
      </div>

      {/* Data Table */}
      <DataTable 
        data={dataConnected ? DEMO_TABLE_DATA : null} 
      />

      {/* Data Sources */}
      <DataSources 
        data={dataConnected ? DEMO_DATA_SOURCES : null} 
      />
    </div>
  );
}
