(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const SearchLegend = TMS.SearchLegend = TMS.SearchLegend || {};

  // Reuse the same palette as other renderers
  const CASE_COLORS = [
    '#aed6f1', // 0 Light Blue
    '#a9dfbf', // 1 Light Green
    '#f5b7b1', // 2 Light Red/Coral
    '#f7dc6f', // 3 Light Yellow
    '#d2b4de', // 4 Light Purple
    '#a3e4d7', // 5 Light Teal
    '#f1948a', // 6 Light Orange/Salmon
    '#e6b0aa', // 7 Light Brown
    '#d5dbdb', // 8 Light Gray
    '#b3d9ff'  // 9 Lighter Blue
  ];

  // Format hours from 15-min slot count
  function formatHoursFromSlots(slotCount) {
    const hours = slotCount / 4;
    return parseFloat(hours.toFixed(2)).toString();
  }

  /**
   * Render per-case hours and distance for a selected therapist on the Search tab.
   * - Resolves child coords:
   *   1) From referral by Child ID (lat/lon saved at referral save time), else
   *   2) Geocode from Search form fields if available
   * - Ensures therapist cases have lat/lon (one-time geocode + persist)
   * - Displays "<hours>h" and "<miles> mi" (or "— mi" if not resolvable)
   */
  async function render(therapist) {
    const legendEl = document.getElementById('search-cases-legend');
    if (!legendEl) return;

    if (!therapist) {
      legendEl.innerHTML = '';
      return;
    }

    // Resolve child coordinates
    let childCoord = null;
    try {
      const childIdInput = document.getElementById('search-child-id');
      const childId = (childIdInput && (childIdInput.value || '').trim()) || '';
      if (childId && TMS.Store && typeof TMS.Store.findReferralByChildId === 'function') {
        const ref = TMS.Store.findReferralByChildId(childId);
        if (ref && typeof ref.lat === 'number' && typeof ref.lon === 'number') {
          childCoord = { lat: ref.lat, lon: ref.lon };
        }
      }
      if (!childCoord) {
        const cs = (document.getElementById('search-cross-streets') && document.getElementById('search-cross-streets').value || '').trim();
        const city = (document.getElementById('search-city') && document.getElementById('search-city').value || '').trim();
        const st = (document.getElementById('search-state') && document.getElementById('search-state').value || '').trim();
        const zip = (document.getElementById('search-zip') && document.getElementById('search-zip').value || '').trim();
        if (cs || city || st || zip) {
          try {
            const gc = await TMS.Geo.geocodeAddressCached({ address: '', crossStreets: cs, city, state: st, zip });
            childCoord = { lat: gc.lat, lon: gc.lon };
          } catch (e) {
            // leave null; distances will be "— mi"
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // Ensure therapist cases have coordinates (one-time geocode + persist)
    let changed = false;
    for (const c of (therapist.cases || [])) {
      if (typeof c.lat !== 'number' || typeof c.lon !== 'number') {
        const addr = {
          address: c.address || '',
          crossStreets: c.crossStreets || '',
          city: c.city || '',
          state: c.state || '',
          zip: c.zip || ''
        };
        try {
          const coord = await TMS.Geo.geocodeAddressCached(addr);
          c.lat = coord.lat; c.lon = coord.lon;
          changed = true;
        } catch {
          // keep missing; will render "— mi"
        }
      }
    }
    if (changed && TMS.Store && typeof TMS.Store.setTherapists === 'function') {
      // Persist updated lat/lon for therapist cases
      TMS.Store.setTherapists((prev) => prev.map((x) => x.id === therapist.id ? therapist : x));
    }

    // Render legend
    legendEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    (therapist.cases || []).forEach((c) => {
      const color = CASE_COLORS[c.colorIndex % CASE_COLORS.length] || '#007bff';
      const hoursStr = formatHoursFromSlots((c.schedule || []).length);

      let distStr = '— mi';
      if (childCoord && typeof c.lat === 'number' && typeof c.lon === 'number') {
        const d = TMS.Geo.haversineMiles(childCoord.lat, childCoord.lon, c.lat, c.lon);
        distStr = `${d.toFixed(1)} mi`;
      }

      const row = document.createElement('div');
      row.className = 'legend-item';
      row.innerHTML = `
        <span class="legend-swatch" style="background-color:${color};"></span>
        <div class="legend-text">
          <div><strong>${c.name || ''}</strong>${c.patientId ? ' — #' + c.patientId : ''}</div>
          <div>${hoursStr}h</div>
          <div>${distStr}</div>
        </div>
      `;
      frag.appendChild(row);
    });
    legendEl.appendChild(frag);
  }

  SearchLegend.render = render;

})(window);
