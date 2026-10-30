import { useEffect, useMemo, useState } from 'react';
import { dashboardDataStore } from './dashboardDataStore';
import { getTrustCarbonData } from '../services/trustCarbonDataService';

export function DashboardDataProvider({ children }) {
  const [dataState, setDataState] = useState({ data: null, loading: true, error: '' });
  const [selectedYear, setSelectedYear] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    getTrustCarbonData()
      .then((data) => {
        if (!active) return;
        setDataState({ data, loading: false, error: '' });
        setSelectedYear((current) => current ?? data.years.at(-1));
      })
      .catch((error) => {
        if (active) setDataState({ data: null, loading: false, error: error.message || 'Historical emissions data could not be loaded.' });
      });
    return () => { active = false; };
  }, []);

  const years = useMemo(() => dataState.data?.years ?? [], [dataState.data]);
  useEffect(() => {
    if (!playing || years.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setSelectedYear((current) => {
        const index = years.indexOf(current);
        return years[(index + 1) % years.length];
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, years]);

  const value = useMemo(() => ({
    ...dataState,
    years,
    selectedYear,
    setSelectedYear,
    playing,
    setPlaying,
  }), [dataState, years, selectedYear, playing]);

  return <dashboardDataStore.Provider value={value}>{children}</dashboardDataStore.Provider>;
}
