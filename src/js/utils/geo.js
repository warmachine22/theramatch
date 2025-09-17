(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Geo = TMS.Geo = TMS.Geo || {};

  // OpenStreetMap Nominatim config
  const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
  // Provide contact per OSM policy
  const NOMINATIM_EMAIL = 'techadmin@aees.us.com';

  // Helpers
  const normalizeAddressString = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const composeAddressQuery = ({ address, crossStreets, city, state, zip }) => {
    const parts = [];
    if (address) parts.push(address);
    if (crossStreets) parts.push(crossStreets);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zip) parts.push(zip);
    return parts.filter(Boolean).join(', ');
  };

  const GEO_CACHE_KEY = 'tms_geo_cache_v1';
  const getGeoCache = () => {
    try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}'); } catch { return {}; }
  };
  const setGeoCache = (obj) => {
    try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(obj)); } catch {}
  };

  let lastGeocodeAt = 0;
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  /**
   * Geocode with localStorage cache and polite throttling (~1 req/sec).
   * Returns { lat: number, lon: number, ts: number }
   */
  async function geocodeAddressCached(addrParts) {
    const q = composeAddressQuery(addrParts);
    const key = normalizeAddressString(q);
    if (!key) throw new Error('EMPTY_ADDRESS');

    const cache = getGeoCache();
    if (cache[key]) return cache[key];

    const now = Date.now();
    const delta = now - lastGeocodeAt;
    if (delta < 1100) await sleep(1100 - delta);

    const url = `${NOMINATIM_BASE}?format=jsonv2&limit=1&email=${encodeURIComponent(NOMINATIM_EMAIL)}&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) throw new Error(`GEOCODE_HTTP_${resp.status}`);

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('GEOCODE_NOT_FOUND');

    const { lat, lon } = data[0];
    const out = { lat: Number(lat), lon: Number(lon), ts: Date.now() };
    cache[key] = out;
    setGeoCache(cache);
    lastGeocodeAt = Date.now();
    return out;
  }

  /**
   * Haversine distance between two lat/lon points in miles.
   */
  function haversineMiles(lat1, lon1, lat2, lon2) {
    const toRad = (v) => v * Math.PI / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c) / 1609.344;
  }

  // Expose API
  Geo.geocodeAddressCached = geocodeAddressCached;
  Geo.haversineMiles = haversineMiles;

  // Optionally expose internals if needed later (kept private for now)
  // Geo._normalizeAddressString = normalizeAddressString;
  // Geo._composeAddressQuery = composeAddressQuery;

})(window);
