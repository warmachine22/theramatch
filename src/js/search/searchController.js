(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Search = TMS.Search = TMS.Search || {};
  const Store = TMS.Store;

  // Get checked borough values from the Search tab filter group
  function getActiveSearchBoroughs() {
    const container = document.getElementById('search-borough-filter');
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
  }

  // Rebuild the Therapist dropdown on the Search tab using current filters
  function buildSearchTherapistOptions() {
    const sel = document.getElementById('search-therapist-select');
    if (!sel) return;

    const requiredHoursInput = document.getElementById('search-required-hours');
    const requiredHoursStr = (requiredHoursInput && requiredHoursInput.value || '').trim();
    const requiredHours = requiredHoursStr === '' ? null : Number(requiredHoursStr);

    const boroughs = getActiveSearchBoroughs();
    const therapists = Store.getTherapists() || [];

    // Clear current options
    sel.innerHTML = '<option value="">Select Therapist...</option>';

    let list = therapists;
    if (boroughs.length > 0) {
      list = list.filter((t) => (t.boroughPrefs || []).some((b) => boroughs.includes(b)));
    }
    if (requiredHours !== null && !Number.isNaN(requiredHours)) {
      list = list.filter((t) => (t.totalHours ?? 0) <= requiredHours);
    }

    const sorted = [...list].sort((a, b) =>
      (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`)
    );

    sorted.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `Dr. ${t.firstName} ${t.lastName} (${t.totalHours ?? 0}h)`;
      sel.appendChild(opt);
    });
  }

  // Optional: attach listeners (kept no-op to avoid double-binding while app.js still wires events)
  function init() {
    // Intentionally left minimal. We can wire events here after removing bindings from app.js.
  }

  Search.getActiveSearchBoroughs = getActiveSearchBoroughs;
  Search.buildSearchTherapistOptions = buildSearchTherapistOptions;
  Search.init = init;

})(window);
