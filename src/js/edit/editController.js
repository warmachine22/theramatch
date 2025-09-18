(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Edit = TMS.Edit = TMS.Edit || {};

  const Grid = TMS.Grid;
  const Render = TMS.Render;
  const Store = TMS.Store;
  const Time = TMS.Time;
  const Geo = TMS.Geo;
  const ScheduleUtils = TMS.ScheduleUtils;
  const StringUtil = TMS.String;

  // Internal state
  let currentSelectedTherapist = null;

  // Cached drag state for Edit grid
  let isDragging = false;
  let startSlot = null;
  let currentCase = null;

  // DOM helpers
  const $ = (id) => document.getElementById(id);
  const refs = () => ({
    editGrid: $('edit-booking-schedule-grid'),
    caseDropdown: $('case-dropdown'),
    title: $('edit-booking-schedule-title'),
    currentName: $('current-therapist-display-name'),
    boroughChips: $('current-therapist-boroughs'),
    incrementEdit: $('increment-edit'),
    // Case form
    addNewCaseButton: $('add-new-case-button'),
    editChildButton: $('edit-child-button'),
    newCaseForm: $('new-case-form'),
    saveNewCaseButton: $('save-new-case-button'),
    firstName: $('first-name'),
    lastName: $('last-name'),
    crossStreets: $('cross-streets'),
    address: $('address'),
    city: $('city'),
    state: $('state'),
    zip: $('zip'),
    idNumber: $('id-number'),
    // Assign from Referral
    referralAssignSelect: $('referral-assign-select'),
    referralAssignedInfo: $('referral-assigned-info')
  });

  function getEditInc() {
    const r = refs();
    const v = parseInt((r.incrementEdit && r.incrementEdit.value) || '15', 10);
    return [15, 30, 60].includes(v) ? v : 15;
  }

  function renderCurrentBoroughChips(boroughs) {
    const r = refs();
    const el = r.boroughChips;
    if (!el) return;
    if (!boroughs || boroughs.length === 0) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = boroughs.map((b) => `<span class="chip">${b}</span>`).join(' ');
  }

  function populateCaseDropdown(therapist) {
    const r = refs();
    const dd = r.caseDropdown;
    dd.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
    (therapist.cases || []).forEach((c) => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = `${c.name} - #${c.patientId}`;
      dd.appendChild(option);
    });
  }

  function renderSingleOrAll() {
    const r = refs();
    const inc = getEditInc();
    const selectedCaseId = r.caseDropdown.value;
    if (!currentSelectedTherapist) return;

    if (selectedCaseId === 'all') {
      Render.clearGrid(r.editGrid);
      Render.renderCombined(r.editGrid, currentSelectedTherapist.cases || [], inc);
      r.title.textContent = 'All Cases Combined';
      Render.renderLegend($('cases-legend'), currentSelectedTherapist.cases || []);
    } else if (selectedCaseId) {
      const c = (currentSelectedTherapist.cases || []).find((x) => x.id === selectedCaseId);
      if (c) {
        Render.clearGrid(r.editGrid);
        Render.renderSingleCase(r.editGrid, c, inc);
        r.title.textContent = `${c.name} - #${c.patientId}`;
        Render.renderLegend($('cases-legend'), [c]);
      }
    } else {
      r.title.textContent = 'Select a Case';
      Render.clearGrid(r.editGrid);
      Render.renderLegend($('cases-legend'), []);
    }
  }

  function getSelectedCase() {
    const r = refs();
    const selectedCaseId = r.caseDropdown.value;
    if (selectedCaseId === 'all' || !selectedCaseId) {
      alert('Please select a specific case to edit.');
      return null;
    }
    return currentSelectedTherapist &&
      (currentSelectedTherapist.cases || []).find((c) => c.id === selectedCaseId) || null;
  }

  function applyEditForDisplaySlot(slotEl, currentCaseObj) {
    const inc = getEditInc();
    const day = slotEl.dataset.day;
    const displayTime = slotEl.dataset.time;
    const subTimes = Time.blockSubslots15(displayTime, inc);
    const subSlotIds = subTimes.map((t) => `${day}-${t}`);
    const allPresent = subSlotIds.every((id) => (currentCaseObj.schedule || []).some((s) => s.slotId === id));
    const allCasesExceptCurrent = (currentSelectedTherapist.cases || []).filter((c) => c.id !== currentCaseObj.id);

    if (allPresent) {
      subSlotIds.forEach((id) => {
        const idx = currentCaseObj.schedule.findIndex((s) => s.slotId === id);
        if (idx !== -1) currentCaseObj.schedule.splice(idx, 1);
      });
    } else {
      const hasOverlap = allCasesExceptCurrent.some((oc) => (oc.schedule || []).some((s) => subSlotIds.includes(s.slotId)));
      if (hasOverlap) {
        alert('Cannot add. One or more 15-minute segments in this block are already booked for another case.');
        return;
      }
      subSlotIds.forEach((id) => {
        if (!(currentCaseObj.schedule || []).some((s) => s.slotId === id)) {
          currentCaseObj.schedule.push({
            slotId: id,
            caseId: currentCaseObj.id,
            caseName: currentCaseObj.name,
            colorIndex: currentCaseObj.colorIndex
          });
        }
      });
    }
  }

  function finishEditUpdate() {
    // Persist totals + save state
    Store.setTherapists((prev) => prev);
    renderSingleOrAll();
    // Notify others (e.g., app.js) to refresh therapist lists/etc
    try {
      document.dispatchEvent(new CustomEvent('tms:therapistsUpdated'));
    } catch (_) {}
  }

  function handleEditMouseDown(slot) {
    currentCase = getSelectedCase();
    if (!currentCase) return;
    isDragging = true;
    startSlot = slot;
    startSlot.classList.add('dragging-highlight');
    document.body.style.userSelect = 'none';
  }

  function handleEditMouseEnter(slot) {
    const r = refs();
    if (!isDragging) return;
    r.editGrid.querySelectorAll('.dragging-highlight').forEach((s) => s.classList.remove('dragging-highlight'));
    const startDay = parseInt(startSlot.dataset.day);
    const endDay = parseInt(slot.dataset.day);
    const shsm = startSlot.dataset.time.split(':');
    const ehEm = slot.dataset.time.split(':');
    const sh = parseInt(shsm[0], 10), sm = parseInt(shsm[1], 10);
    const eh = parseInt(ehEm[0], 10), em = parseInt(ehEm[1], 10);
    const startTotal = sh * 60 + sm;
    const endTotal = eh * 60 + em;
    const dayRange = [Math.min(startDay, endDay), Math.max(startDay, endDay)];
    const timeRange = [Math.min(startTotal, endTotal), Math.max(startTotal, endTotal)];
    r.editGrid.querySelectorAll('.time-slot').forEach((cell) => {
      const d = parseInt(cell.dataset.day);
      const hm = cell.dataset.time.split(':');
      const h = parseInt(hm[0], 10), m = parseInt(hm[1], 10);
      const t = h * 60 + m;
      if (d >= dayRange[0] && d <= dayRange[1] && t >= timeRange[0] && t <= timeRange[1]) {
        cell.classList.add('dragging-highlight');
      }
    });
  }

  function handleEditMouseUp(e) {
    const r = refs();
    if (!isDragging) return;
    const highlighted = r.editGrid.querySelectorAll('.dragging-highlight');
    if (highlighted.length === 0) {
      handleEditClick(e);
    } else {
      highlighted.forEach((cell) => applyEditForDisplaySlot(cell, currentCase));
      finishEditUpdate();
      highlighted.forEach((cell) => cell.classList.remove('dragging-highlight'));
    }
    isDragging = false;
    startSlot = null;
    document.body.style.userSelect = '';
  }

  function handleEditClick(e) {
    const slot = e.target.closest('.time-slot');
    if (!slot) return;
    currentCase = getSelectedCase();
    if (!currentCase) return;
    applyEditForDisplaySlot(slot, currentCase);
    finishEditUpdate();
  }

  function wireCaseDropdown() {
    const r = refs();
    if (!r.caseDropdown) return;
    r.caseDropdown.addEventListener('change', () => {
      if (!currentSelectedTherapist) return;
      if (r.caseDropdown.value === 'all') {
        r.editChildButton.classList.add('disabled');
        r.editChildButton.disabled = true;
        r.newCaseForm.classList.remove('expanded');
        // do not clear here to keep form pristine unless user opens add/edit
      } else if (r.caseDropdown.value) {
        r.editChildButton.classList.remove('disabled');
        r.editChildButton.disabled = false;
        r.newCaseForm.classList.remove('expanded');
      } else {
        r.editChildButton.classList.add('disabled');
        r.editChildButton.disabled = true;
        r.newCaseForm.classList.remove('expanded');
      }
      renderSingleOrAll();
    });
  }

  function wireReferralAssign() {
    const r = refs();
    if (!r.referralAssignSelect) return;
    r.referralAssignSelect.addEventListener('change', () => {
      const rid = r.referralAssignSelect.value;
      if (!rid) { if (r.referralAssignedInfo) r.referralAssignedInfo.innerHTML = ''; return; }
      if (!currentSelectedTherapist) {
        alert('Please select a therapist first.');
        r.referralAssignSelect.value = '';
        return;
      }
      const ref = TMS.Store.findReferral(rid) || (TMS.Store.getReferrals() || []).find((x) => x.id === rid);
      if (!ref) return;

      let existing = (currentSelectedTherapist.cases || []).find(c => (c.patientId || '') === (ref.childId || ''));
      if (!existing) {
        const baseId = StringUtil.slugify(`${(ref.childName || 'child')}-${(ref.childId || '')}`.trim());
        let newCaseId = baseId || `case-${Date.now()}`;
        let idx = 1;
        while ((currentSelectedTherapist.cases || []).some((c) => c.id === newCaseId)) {
          newCaseId = `${baseId}-${idx++}`;
        }
        const nextColorIndex =
          (((currentSelectedTherapist.cases || [])
            .reduce((m, c) => Math.max(m, (typeof c.colorIndex === 'number' ? c.colorIndex : -1)), -1)) + 1) % 10;
        const newCase = {
          id: newCaseId,
          name: ref.childName || '',
          patientId: ref.childId || '',
          crossStreets: ref.crossStreets || '',
          address: '',
          city: ref.city || '',
          state: ref.state || '',
          zip: ref.zip || '',
          schedule: [],
          colorIndex: nextColorIndex
        };
        Store.setTherapists((prev) => {
          return prev.map((t) => {
            if (t.id !== currentSelectedTherapist.id) return t;
            return { ...t, cases: [...(t.cases || []), newCase] };
          });
        });
        // Refresh currentSelectedTherapist reference
        const all = Store.getTherapists();
        currentSelectedTherapist = all.find((t) => t.id === currentSelectedTherapist.id) || currentSelectedTherapist;
        existing = (currentSelectedTherapist.cases || []).find((c) => c.id === newCaseId);
        populateCaseDropdown(currentSelectedTherapist);
      }

      r.caseDropdown.value = existing.id;
      renderSingleOrAll();

      if (r.referralAssignedInfo) {
        r.referralAssignedInfo.innerHTML = `
          <div><strong>${ref.childName || ''}</strong> — #${ref.childId || ''} (${ref.status || 'referred'})</div>
          <div>${ref.crossStreets || ''}</div>
          <div>${ref.city || ''}, ${ref.state || ''} ${ref.zip || ''}</div>
        `;
      }

      try { document.dispatchEvent(new CustomEvent('tms:therapistsUpdated')); } catch (_) {}
    });
  }

  function loadTherapistSchedule(therapist) {
    const r = refs();
    currentSelectedTherapist = therapist;
    if (r.currentName) r.currentName.textContent = `Dr. ${therapist.firstName} ${therapist.lastName}`;
    renderCurrentBoroughChips(therapist.boroughPrefs || []);
    populateCaseDropdown(therapist);
    if (r.caseDropdown) r.caseDropdown.value = 'all';
    rerenderGrid();
  }

  function rerenderGrid() {
    const r = refs();
    if (!r.editGrid) return;
    Grid.generateTimeSlots(r.editGrid, getEditInc(), {
      onMouseDown: handleEditMouseDown,
      onMouseEnter: handleEditMouseEnter,
      onClick: handleEditClick
    });
    renderSingleOrAll();
  }

  function init() {
    // Wire only edit-grid related global listeners here to avoid duplicate bindings
    document.addEventListener('mouseup', handleEditMouseUp);

    // Optional: wire case dropdown and referral assign here (safe single binding)
    wireCaseDropdown();
    wireReferralAssign();
  }

  // Public API
  Edit.init = init;
  Edit.rerenderGrid = rerenderGrid;
  Edit.loadTherapistSchedule = loadTherapistSchedule;
  Edit.getCurrentTherapist = () => currentSelectedTherapist;

})(window);
