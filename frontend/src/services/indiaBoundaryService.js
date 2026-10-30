import suppliedIndiaGeoJson from '../../assets/in.json';

const ISO_EXCEPTIONS = { INCT: 'IN-CG', INOR: 'IN-OD', INUT: 'IN-UK' };
const REQUIRED_NORTHERN_BOUNDARIES = {
  'IN-JK': 'Jammu and Kashmir', 'IN-LA': 'Ladakh', 'IN-HP': 'Himachal Pradesh',
  'IN-UK': 'Uttaranchal', 'IN-AR': 'Arunachal Pradesh',
};

let cachedFeatures;
let pendingRequest;

async function loadBoundaries() {
  const geojson = suppliedIndiaGeoJson;
  if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features) || geojson.features.length !== 36) {
    throw new Error('The India state boundary dataset is incomplete.');
  }
  const features = geojson.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      'iso3166-2': ISO_EXCEPTIONS[feature.properties?.id] || `IN-${feature.properties?.id?.slice(2) || ''}`,
    },
  }));
  const stateIds = features.map((feature) => feature.properties?.['iso3166-2']);
  if (stateIds.some((id) => !id || !id.startsWith('IN-')) || new Set(stateIds).size !== stateIds.length) {
    throw new Error('The India state boundary dataset has missing or duplicate state identifiers.');
  }
  const namesById = new Map(features.map((feature) => [
    feature.properties['iso3166-2'],
    feature.properties.name,
  ]));
  if (Object.entries(REQUIRED_NORTHERN_BOUNDARIES).some(([id, name]) => namesById.get(id) !== name)) {
    throw new Error('The India state boundary dataset is missing expected northern state geometry.');
  }
  return features;
}

export function getIndiaBoundaries() {
  if (cachedFeatures) return Promise.resolve(cachedFeatures);
  if (pendingRequest) return pendingRequest;

  pendingRequest = loadBoundaries()
    .then((features) => {
      cachedFeatures = features;
      return features;
    })
    .catch((error) => {
      pendingRequest = null;
      throw error;
    })
    .finally(() => { pendingRequest = null; });

  return pendingRequest;
}
