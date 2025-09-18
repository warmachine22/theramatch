(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const UI = TMS.UI = TMS.UI || {};

  const Store = TMS.Store;
  const Render = TMS.Render;

  // DOM helper
  const $ = (id) => document.getElementById(id);

  function handleExport() {
    const dataStr = Store.exportJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = Store.timestampedFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      Store.importJSON(parsed);

      // Refresh dependent UIs
      const therapists = Store.getTherapists();
      if (TMS.Therapists) {
        TMS.Therapists.populateTherapistSelectDropdown();
        TMS.Therapists.refreshList();
      }
      if (TMS.Referrals) {
        TMS.Referrals.renderList();
        TMS.Referrals.buildChildDatalist();
        TMS.Referrals.buildAssignOptions();
      }

      // Reset Edit Booking header and grid
      const nameEl = $('current-therapist-display-name');
      const caseDropdown = $('case-dropdown');
      const titleEl = $('edit-booking-schedule-title');
      const grid = $('edit-booking-schedule-grid');
      const legend = $('cases-legend');
      const newCaseForm = $('new-case-form');

      if (nameEl) nameEl.textContent = 'Select a Therapist';
      if (caseDropdown) caseDropdown.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
      if (titleEl) titleEl.textContent = 'Select a Case';
      if (grid) Render.clearGrid(grid);
      if (legend) Render.renderLegend(legend, []);
      if (newCaseForm) newCaseForm.classList.remove('expanded');

      // Clear file input
      e.target.value = '';

      // Notify listeners to ensure caches update
      try { document.dispatchEvent(new CustomEvent('tms:therapistsUpdated')); } catch (_) {}
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import data. Please ensure it is valid JSON.');
      e.target.value = '';
    }
  }

  function init() {
    const exportBtn = $('export-data-button');
    const importInput = $('import-data-input');

    if (exportBtn) {
      exportBtn.addEventListener('click', handleExport);
    }
    if (importInput) {
      importInput.addEventListener('change', handleImport);
    }
  }

  UI.init = init;

})(window);
