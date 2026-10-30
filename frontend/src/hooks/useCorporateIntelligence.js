import { useContext } from 'react';
import { corporateDataStore } from '../contexts/corporateDataStore';

export function useCorporateIntelligence() {
  const context = useContext(corporateDataStore);
  if (!context) throw new Error('useCorporateIntelligence must be used within CorporateIntelligenceProvider.');
  return context;
}
