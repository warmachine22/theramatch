(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Grid = TMS.Grid;
  const Render = TMS.Render;
  const Store = TMS.Store;
  const Time = TMS.Time;

  document.addEventListener('DOMContentLoaded', () => {
    // Tabs
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const activateTab = (tabId) => {
      tabs.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabId));
      tabContents.forEach((content) => content.classList.toggle('active', content.id === tabId));
    };
    tabs.forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));

    // State bootstrap
    Store.initState();
    let therapists = Store.getTherapists();
    let currentSelectedTherapist = null;

    // DOM refs
    const editBookingScheduleGrid = document.getElementById('edit-booking-schedule-grid');
    const searchScheduleGrid = document.getElementById('search-schedule-grid');
    const casesLegend = document.getElementById('cases-legend');

    const therapistSelectDropdown = document.getElementById('therapist-select-dropdown');
    const caseDropdown = document.getElementById('case-dropdown');
    const editBookingScheduleTitle = document.getElementById('edit-booking-schedule-title');
    const currentTherapistDisplayName = document.getElementById('current-therapist-display-name');
    const currentTherapistBoroughs = document.getElementById('current-therapist-boroughs');

    const toggleCompactEdit = document.getElementById('toggle-compact-edit');
    const toggleCompactSearch = document.getElementById('toggle-compact-search');
    const incrementEdit = document.getElementById('increment-edit');
    const incrementSearch = document.getElementById('increment-search');

    const addNewCaseButton = document.getElementById('add-new-case-button');
    const editChildButton = document.getElementById('edit-child-button');
    const newCaseForm = document.getElementById('new-case-form');
    const saveNewCaseButton = document.getElementById('save-new-case-button');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const crossStreetsInput = document.getElementById('cross-streets');
    const addressInput = document.getElementById('address');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const zipInput = document.getElementById('zip');
    const idNumberInput = document.getElementById('id-number');

    const exportDataButton = document.getElementById('export-data-button');
    const importDataInput = document.getElementById('import-data-input');
    const therapistListBody = document.getElementById('therapist-list-body');

    // Add Therapist (Manage Therapists tab)
    const addNewTherapistButton = document.getElementById('add-new-therapist-button');
    const addTherapistForm = document.getElementById('add-therapist-form');
    const saveTherapistButton = document.getElementById('save-therapist-button');
    const newTherapistFirstNameInput = document.getElementById('new-therapist-first-name');
    const newTherapistLastNameInput = document.getElementById('new-therapist-last-name');
    const newTherapistEmailInput = document.getElementById('new-therapist-email');
    const newTherapistPhoneInput = document.getElementById('new-therapist-phone');
    const boroughPrefsGroup = document.getElementById('borough-prefs-group');
    const boroughFilterGroup = document.getElementById('borough-filter-group');

    const searchButton = document.getElementById('search-button');
    const searchResultsList = document.getElementById('search-results-list');
    // New Search controls
    const searchTherapistSelect = document.getElementById('search-therapist-select');
    const searchBoroughFilterGroup = document.getElementById('search-borough-filter');
    const searchMaxHoursInput = document.getElementById('search-max-hours');

    // Helpers
    const setCompactMode = (on) => {
      document.body.classList.toggle('compact-mode', on);
      if (toggleCompactEdit) toggleCompactEdit.checked = on;
      if (toggleCompactSearch) toggleCompactSearch.checked = on;
    };
    toggleCompactEdit && toggleCompactEdit.addEventListener('change', (e) => setCompactMode(e.target.checked));
    toggleCompactSearch && toggleCompactSearch.addEventListener('change', (e) => setCompactMode(e.target.checked));

    const getEditInc = () => {
      const v = parseInt(incrementEdit && incrementEdit.value || '15', 10);
      return [15, 30, 60].includes(v) ? v : 15;
    };
    const getSearchInc = () => {
      const v = parseInt(incrementSearch && incrementSearch.value || '15', 10);
      return [15, 30, 60].includes(v) ? v : 15;
    };

    // Helpers for Search filters/dropdown
    const getActiveSearchBoroughs = () => {
      if (!searchBoroughFilterGroup) return [];
      return Array.from(searchBoroughFilterGroup.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
    };

    const buildSearchTherapistOptions = () => {
      if (!searchTherapistSelect) return;
      const boroughs = getActiveSearchBoroughs();
      const maxHoursStr = (searchMaxHoursInput && searchMaxHoursInput.value || '').trim();
      const maxHours = maxHoursStr === '' ? null : Number(maxHoursStr);
      // Clear current options
      searchTherapistSelect.innerHTML = '<option value="">Select Therapist...</option>';
      let list = therapists;
      if (boroughs.length > 0) {
        list = list.filter((t) => (t.boroughPrefs || []).some((b) => boroughs.includes(b)));
      }
      if (maxHours !== null && !Number.isNaN(maxHours)) {
        list = list.filter((t) => (t.totalHours ?? 0) <= maxHours);
      }
      const sorted = [...list].sort((a, b) => (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`));
      sorted.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `Dr. ${t.firstName} ${t.lastName} (${t.totalHours ?? 0}h)`;
        searchTherapistSelect.appendChild(opt);
      });
    };

    const getTherapistScheduleSet = (t) => {
      const set = new Set();
      (t.cases || []).forEach((c) => {
        (c.schedule || []).forEach((s) => set.add(s.slotId));
      });
      return set;
    };

    const clearTherapistBusyOverlay = () => {
      if (!searchScheduleGrid) return;
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        cell.classList.remove('busy', 'busy-top', 'busy-bottom', 'busy-full');
        cell.style.removeProperty('--busy-height');
      });
    };

    const overlayTherapistOnSearchGrid = (therapist) => {
      if (!therapist || !searchScheduleGrid) return;
      const inc = getSearchInc();
      const schedSet = getTherapistScheduleSet(therapist);
      // Iterate all display cells and compute coverage
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        const dayStr = cell.dataset.day;
        const displayTime = cell.dataset.time;
        if (!dayStr || !displayTime) return;
        const subTimes = Time.blockSubslots15(displayTime, inc);
        const count = subTimes.length;
        let covered = 0;
        // Count coverage
        for (let i = 0; i < count; i++) {
          const id = `${dayStr}-${subTimes[i]}`;
          if (schedSet.has(id)) covered++;
        }
        // Reset any previous cell overlay
        cell.classList.remove('busy', 'busy-top', 'busy-bottom', 'busy-full');
        cell.style.removeProperty('--busy-height');

        if (covered === 0) return;
        if (covered === count) {
          // Full busy coverage
          cell.classList.add('busy-full');
        } else {
          // Partial coverage, compute alignment (from start or from end)
          let startCovered = 0;
          for (let i = 0; i < count; i++) {
            const id = `${dayStr}-${subTimes[i]}`;
            if (schedSet.has(id)) startCovered++; else break;
          }
          let endCovered = 0;
          for (let i = count - 1; i >= 0; i--) {
            const id = `${dayStr}-${subTimes[i]}`;
            if (schedSet.has(id)) endCovered++; else break;
          }
          let ratio = covered / count;
          let alignTop = true;
          if (startCovered > 0 && endCovered === 0) {
            alignTop = true;
            ratio = startCovered / count;
          } else if (endCovered > 0 && startCovered === 0) {
            alignTop = false;
            ratio = endCovered / count;
          }
          cell.classList.add('busy');
          cell.classList.toggle('busy-top', alignTop);
          cell.classList.toggle('busy-bottom', !alignTop);
          cell.style.setProperty('--busy-height', `${Math.round(ratio * 100)}%`);
        }
      });
    };

    const clearCaseForm = () => {
      firstNameInput.value = '';
      lastNameInput.value = '';
      crossStreetsInput.value = '';
      addressInput.value = '';
      cityInput.value = '';
      stateInput.value = '';
      zipInput.value = '';
      idNumberInput.value = '';
    };
    const populateCaseForm = (clientCase) => {
      const names = clientCase.name.split(' ');
      firstNameInput.value = names[0] || '';
      lastNameInput.value = names.slice(1).join(' ') || '';
      idNumberInput.value = clientCase.patientId || '';
      crossStreetsInput.value = clientCase.crossStreets || '';
      addressInput.value = clientCase.address || '';
      cityInput.value = clientCase.city || '';
      stateInput.value = clientCase.state || '';
      zipInput.value = clientCase.zip || '';
    };

    // Helper to slugify IDs
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
    const renderCurrentBoroughChips = (boroughs) => {
      if (!currentTherapistBoroughs) return;
      if (!boroughs || boroughs.length === 0) {
        currentTherapistBoroughs.innerHTML = '';
        return;
      }
      currentTherapistBoroughs.innerHTML = boroughs.map(b => `<span class="chip">${b}</span>`).join(' ');
    };
    const getActiveBoroughFilters = () => {
      if (!boroughFilterGroup) return [];
      return Array.from(boroughFilterGroup.querySelectorAll('input[name="borough-filter"]:checked')).map(el => el.value);
    };

    const populateTherapistSelectDropdown = () => {
      therapistSelectDropdown.innerHTML = '<option value="">Select Therapist...</option>';
      const sorted = [...therapists].sort((a, b) => (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`));
      sorted.forEach((t) => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = `Dr. ${t.firstName} ${t.lastName}`;
        therapistSelectDropdown.appendChild(option);
      });
    };

    const populateTherapistList = () => {
      if (!therapistListBody) return;
      therapistListBody.innerHTML = '';

      // Active filters
      const activeFilters = getActiveBoroughFilters();

      // Close others when opening a new edit row
      const closeAllEditRows = () => {
        therapistListBody.querySelectorAll('.therapist-edit-row').forEach((r) => (r.style.display = 'none'));
      };

      const list = activeFilters.length === 0
        ? therapists
        : therapists.filter((t) => (t.boroughPrefs || []).some((b) => activeFilters.includes(b)));

      list.forEach((t) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${t.firstName || ''}</td>
          <td>${t.lastName || ''}</td>
          <td>${t.phone || ''}</td>
          <td>${t.email || ''}</td>
          <td>${t.totalHours ?? 0} hrs</td>
          <td>
            <button class="view-schedule-btn" data-therapist-id="${t.id}">View Schedule</button>
            <button class="edit-button" data-therapist-id="${t.id}">View/Edit</button>
          </td>
        `;
        therapistListBody.appendChild(row);

        const editRow = document.createElement('tr');
        editRow.className = 'therapist-edit-row';
        editRow.style.display = 'none';
        editRow.innerHTML = `
          <td colspan="6">
            <div class="inline-edit-form">
              <div class="form-row">
                <input type="text" class="edit-first" value="${t.firstName || ''}" placeholder="First Name">
                <input type="text" class="edit-last" value="${t.lastName || ''}" placeholder="Last Name">
              </div>
              <div class="form-row">
                <input type="text" class="edit-email" value="${t.email || ''}" placeholder="Email Address">
                <input type="text" class="edit-phone" value="${t.phone || ''}" placeholder="Phone Number">
              </div>
              <div class="form-row">
                <label>Borough Preferences</label>
                <div class="checkbox-group">
                  ${['Manhattan','Bronx','Brooklyn','Queens','Staten Island'].map(b =>
                    `<label><input type="checkbox" value="${b}" ${(t.boroughPrefs || []).includes(b) ? 'checked' : ''}> ${b}</label>`
                  ).join(' ')}
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-success save-edit">Save</button>
                <button class="btn btn-secondary cancel-edit">Cancel</button>
              </div>
            </div>
          </td>
        `;
        therapistListBody.appendChild(editRow);

        const viewBtn = row.querySelector('.view-schedule-btn');
        viewBtn.addEventListener('click', () => {
          const therapistId = viewBtn.dataset.therapistId;
          const tt = therapists.find((x) => x.id === therapistId);
          if (tt) {
            loadTherapistSchedule(tt);
            therapistSelectDropdown.value = therapistId;
            activateTab('edit-booking');
          }
        });

        const btn = row.querySelector('.edit-button');
        btn.addEventListener('click', () => {
          const isOpen = editRow.style.display === 'table-row';
          closeAllEditRows();
          editRow.style.display = isOpen ? 'none' : 'table-row';
        });

        const cancelBtn = editRow.querySelector('.cancel-edit');
        cancelBtn.addEventListener('click', () => {
          editRow.style.display = 'none';
        });

        const saveBtn = editRow.querySelector('.save-edit');
        saveBtn.addEventListener('click', () => {
          const first = editRow.querySelector('.edit-first').value.trim();
          const last = editRow.querySelector('.edit-last').value.trim();
          const email = editRow.querySelector('.edit-email').value.trim();
          const phone = editRow.querySelector('.edit-phone').value.trim();
          const boroughPrefs = Array.from(editRow.querySelectorAll('.checkbox-group input[type="checkbox"]:checked')).map((el) => el.value);

          if (!first || !last) {
            alert('Please enter first and last name.');
            return;
          }

          therapists = Store.setTherapists((prev) =>
            prev.map((x) => x.id === t.id ? { ...x, firstName: first, lastName: last, email, phone, boroughPrefs } : x)
          );

          populateTherapistList();
        });
      });
    };

    const populateCaseDropdown = (therapist) => {
      caseDropdown.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
      therapist.cases.forEach((c) => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.name} - #${c.patientId}`;
        caseDropdown.appendChild(option);
      });
    };

    const renderSingleOrAll = () => {
      const inc = getEditInc();
      const selectedCaseId = caseDropdown.value;
      if (!currentSelectedTherapist) return;
      if (selectedCaseId === 'all') {
        Render.clearGrid(editBookingScheduleGrid);
        // Use gradient-based combined renderer to ensure adjacent/abutting segments render correctly
        Render.renderCombined(editBookingScheduleGrid, currentSelectedTherapist.cases, inc);
        editBookingScheduleTitle.textContent = 'All Cases Combined';
        Render.renderLegend(casesLegend, currentSelectedTherapist.cases);
      } else if (selectedCaseId) {
        const c = currentSelectedTherapist.cases.find((x) => x.id === selectedCaseId);
        if (c) {
          Render.clearGrid(editBookingScheduleGrid);
          Render.renderSingleCase(editBookingScheduleGrid, c, inc);
          editBookingScheduleTitle.textContent = `${c.name} - #${c.patientId}`;
          Render.renderLegend(casesLegend, [c]);
        }
      } else {
        editBookingScheduleTitle.textContent = 'Select a Case';
        Render.clearGrid(editBookingScheduleGrid);
        Render.renderLegend(casesLegend, []);
      }
    };

    const loadTherapistSchedule = (therapist) => {
      currentSelectedTherapist = therapist;
      currentTherapistDisplayName.textContent = `Dr. ${therapist.firstName} ${therapist.lastName}`;
      renderCurrentBoroughChips(therapist.boroughPrefs || []);
      populateCaseDropdown(therapist);
      caseDropdown.value = 'all';
      rerenderEditGrid();
    };

    // Edit interactions
    let isDragging = false;
    let startSlot = null;
    let currentCase = null;

    const getSelectedCase = () => {
      const selectedCaseId = caseDropdown.value;
      if (selectedCaseId === 'all' || !selectedCaseId) {
        alert('Please select a specific case to edit.');
        return null;
      }
      return currentSelectedTherapist && currentSelectedTherapist.cases.find((c) => c.id === selectedCaseId) || null;
    };

    const applyEditForDisplaySlot = (slotEl, currentCaseObj) => {
      const inc = getEditInc();
      const day = slotEl.dataset.day;
      const displayTime = slotEl.dataset.time;
      const subTimes = Time.blockSubslots15(displayTime, inc);
      const subSlotIds = subTimes.map((t) => `${day}-${t}`);
      const allPresent = subSlotIds.every((id) => currentCaseObj.schedule.some((s) => s.slotId === id));
      const allCasesExceptCurrent = currentSelectedTherapist.cases.filter((c) => c.id !== currentCaseObj.id);

      if (allPresent) {
        subSlotIds.forEach((id) => {
          const idx = currentCaseObj.schedule.findIndex((s) => s.slotId === id);
          if (idx !== -1) currentCaseObj.schedule.splice(idx, 1);
        });
      } else {
        const hasOverlap = allCasesExceptCurrent.some((oc) => oc.schedule.some((s) => subSlotIds.includes(s.slotId)));
        if (hasOverlap) {
          alert('Cannot add. One or more 15-minute segments in this block are already booked for another case.');
          return;
        }
        subSlotIds.forEach((id) => {
          if (!currentCaseObj.schedule.some((s) => s.slotId === id)) {
            currentCaseObj.schedule.push({
              slotId: id,
              caseId: currentCaseObj.id,
              caseName: currentCaseObj.name,
              colorIndex: currentCaseObj.colorIndex
            });
          }
        });
      }
    };

    const handleEditMouseDown = (slot) => {
      currentCase = getSelectedCase();
      if (!currentCase) return;
      isDragging = true;
      startSlot = slot;
      startSlot.classList.add('dragging-highlight');
      document.body.style.userSelect = 'none';
    };

    const handleEditMouseEnter = (slot) => {
      if (!isDragging) return;
      editBookingScheduleGrid.querySelectorAll('.dragging-highlight').forEach((s) => s.classList.remove('dragging-highlight'));
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
      editBookingScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        const d = parseInt(cell.dataset.day);
        const hm = cell.dataset.time.split(':');
        const h = parseInt(hm[0], 10), m = parseInt(hm[1], 10);
        const t = h * 60 + m;
        if (d >= dayRange[0] && d <= dayRange[1] && t >= timeRange[0] && t <= timeRange[1]) {
          cell.classList.add('dragging-highlight');
        }
      });
    };

    const handleEditMouseUp = (e) => {
      if (!isDragging) return;
      const highlighted = editBookingScheduleGrid.querySelectorAll('.dragging-highlight');
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
    };

    const handleEditClick = (e) => {
      const slot = e.target.closest('.time-slot');
      if (!slot) return;
      currentCase = getSelectedCase();
      if (!currentCase) return;
      applyEditForDisplaySlot(slot, currentCase);
      finishEditUpdate();
    };

    const finishEditUpdate = () => {
      // Update hours, persist and re-render
      therapists = Store.setTherapists((prev) => prev); // hydrateTotals + saveState inside
      populateTherapistList();
      renderSingleOrAll();
    };

    // Search interactions
    let isSearchDragging = false;
    let searchStartSlot = null;
    // Persist search selection as 15-min slotIds: "day-HH:MM"
    let searchSelectedSlots = new Set();

    const clearSearchHighlights = () => {
      searchScheduleGrid.querySelectorAll('.dragging-highlight').forEach((s) => s.classList.remove('dragging-highlight'));
    };

    const highlightSearchSlots = (start, end) => {
      const startDay = parseInt(start.dataset.day);
      const shsm = start.dataset.time.split(':');
      const endDay = parseInt(end.dataset.day);
      const ehEm = end.dataset.time.split(':');
      const sh = parseInt(shsm[0], 10), sm = parseInt(shsm[1], 10);
      const eh = parseInt(ehEm[0], 10), em = parseInt(ehEm[1], 10);
      const startTotal = sh * 60 + sm;
      const endTotal = eh * 60 + em;
      const dayRange = [Math.min(startDay, endDay), Math.max(startDay, endDay)];
      const timeRange = [Math.min(startTotal, endTotal), Math.max(startTotal, endTotal)];
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        const d = parseInt(cell.dataset.day);
        const hm = cell.dataset.time.split(':');
        const h = parseInt(hm[0], 10), m = parseInt(hm[1], 10);
        const t = h * 60 + m;
        if (d >= dayRange[0] && d <= dayRange[1] && t >= timeRange[0] && t <= timeRange[1]) {
          cell.classList.add('dragging-highlight');
        }
      });
    };

    // Toggle a display cell's underlying 15-min slots in the Set, then re-render
    const applySearchToggleForDisplaySlot = (slotEl) => {
      const inc = getSearchInc();
      const day = slotEl.dataset.day;
      const displayTime = slotEl.dataset.time;
      const subTimes = Time.blockSubslots15(displayTime, inc);
      const subSlotIds = subTimes.map((t) => `${day}-${t}`);
      const allPresent = subSlotIds.every((id) => searchSelectedSlots.has(id));
      if (allPresent) {
        subSlotIds.forEach((id) => searchSelectedSlots.delete(id));
      } else {
        subSlotIds.forEach((id) => searchSelectedSlots.add(id));
      }
      renderSearchSelection();
    };

    // Reflect Set state onto the DOM, including partial coverage
    const renderSearchSelection = () => {
      const inc = getSearchInc();
      // Reset classes
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        cell.classList.remove('selected', 'search-availability-color', 'partial', 'partial-top', 'partial-bottom');
        cell.style.removeProperty('--partial-height');
      });
      // Apply per-cell coverage
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        const day = cell.dataset.day;
        const displayTime = cell.dataset.time;
        const subTimes = Time.blockSubslots15(displayTime, inc);
        const subSlotIds = subTimes.map((t) => `${day}-${t}`);
        const count = subSlotIds.length;

        let covered = 0;
        subSlotIds.forEach((id) => { if (searchSelectedSlots.has(id)) covered++; });

        if (covered === count && covered > 0) {
          // Full coverage: fill entire cell with standard blue
          cell.classList.add('selected');
        } else if (covered > 0) {
          // Partial coverage: determine contiguous coverage from start or end
          let startCovered = 0;
          for (let i = 0; i < count; i++) {
            if (searchSelectedSlots.has(subSlotIds[i])) startCovered++; else break;
          }
          let endCovered = 0;
          for (let i = count - 1; i >= 0; i--) {
            if (searchSelectedSlots.has(subSlotIds[i])) endCovered++; else break;
          }

          let ratio = 0;
          let align = 'top';
          if (startCovered > 0 && endCovered === 0) {
            ratio = startCovered / count;
            align = 'top';
          } else if (endCovered > 0 && startCovered === 0) {
            ratio = endCovered / count;
            align = 'bottom';
          } else {
            // Non-contiguous selection: use total proportion from top as a fallback
            ratio = covered / count;
            align = 'top';
          }

          cell.classList.add('partial');
          cell.classList.toggle('partial-top', align === 'top');
          cell.classList.toggle('partial-bottom', align === 'bottom');
          cell.style.setProperty('--partial-height', `${Math.round(ratio * 100)}%`);
        }
      });
    };

    const handleSearchMouseDown = (slot) => {
      isSearchDragging = true;
      searchStartSlot = slot;
      document.body.style.userSelect = 'none';
    };

    const handleSearchMouseMove = (slot) => {
      if (!isSearchDragging) return;
      clearSearchHighlights();
      highlightSearchSlots(searchStartSlot, slot);
    };

    const handleSearchMouseUp = () => {
      if (!isSearchDragging) return;
      const highlighted = searchScheduleGrid.querySelectorAll('.dragging-highlight');
      highlighted.forEach((cell) => {
        cell.classList.remove('dragging-highlight');
        applySearchToggleForDisplaySlot(cell);
      });
      isSearchDragging = false;
      searchStartSlot = null;
      document.body.style.userSelect = '';
    };

    const handleSearchClick = (slot) => {
      applySearchToggleForDisplaySlot(slot);
    };

    // Grid generation and re-render
    const rerenderEditGrid = () => {
      Grid.generateTimeSlots(editBookingScheduleGrid, getEditInc(), {
        onMouseDown: handleEditMouseDown,
        onMouseEnter: handleEditMouseEnter,
        onClick: handleEditClick
      });
      renderSingleOrAll();
    };
    const rerenderSearchGrid = () => {
      Grid.generateTimeSlots(searchScheduleGrid, getSearchInc(), {
        isSearchGrid: true,
        onMouseDown: handleSearchMouseDown,
        onMouseMove: handleSearchMouseMove,
        onClick: handleSearchClick
      });
      renderSearchSelection();
      // Re-apply therapist overlay if any is selected
      clearTherapistBusyOverlay();
      if (searchTherapistSelect && searchTherapistSelect.value) {
        const t = therapists.find((x) => x.id === searchTherapistSelect.value);
        if (t) overlayTherapistOnSearchGrid(t);
      }
    };

    incrementEdit && incrementEdit.addEventListener('change', rerenderEditGrid);
    incrementSearch && incrementSearch.addEventListener('change', rerenderSearchGrid);
    document.addEventListener('mouseup', handleEditMouseUp);
    document.addEventListener('mouseup', handleSearchMouseUp);
    boroughFilterGroup && boroughFilterGroup.addEventListener('change', populateTherapistList);

    // Case dropdown change
    caseDropdown.addEventListener('change', () => {
      if (!currentSelectedTherapist) return;
      if (caseDropdown.value === 'all') {
        editChildButton.classList.add('disabled');
        editChildButton.disabled = true;
        newCaseForm.classList.remove('expanded');
        clearCaseForm();
      } else if (caseDropdown.value) {
        editChildButton.classList.remove('disabled');
        editChildButton.disabled = false;
        newCaseForm.classList.remove('expanded');
        clearCaseForm();
      } else {
        editChildButton.classList.add('disabled');
        editChildButton.disabled = true;
        newCaseForm.classList.remove('expanded');
        clearCaseForm();
      }
      renderSingleOrAll();
    });

    therapistSelectDropdown.addEventListener('change', () => {
      const id = therapistSelectDropdown.value;
      if (!id) {
        currentTherapistDisplayName.textContent = 'Select a Therapist';
        caseDropdown.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
        editBookingScheduleTitle.textContent = 'Select a Case';
        Render.clearGrid(editBookingScheduleGrid);
        Render.renderLegend(casesLegend, []);
        if (currentTherapistBoroughs) currentTherapistBoroughs.innerHTML = '';
        editChildButton.classList.add('disabled');
        editChildButton.disabled = true;
        newCaseForm.classList.remove('expanded');
        return;
      }
      const t = therapists.find((x) => x.id === id);
      if (t) loadTherapistSchedule(t);
    });

    // Add/Edit case UI
    addNewCaseButton.addEventListener('click', () => {
      newCaseForm.classList.add('expanded');
      clearCaseForm();
      Render.clearGrid(editBookingScheduleGrid);
      editBookingScheduleTitle.textContent = 'Add New Case Schedule';
      caseDropdown.value = '';
      editChildButton.classList.add('disabled');
      editChildButton.disabled = true;
    });
    editChildButton.addEventListener('click', () => {
      const id = caseDropdown.value;
      if (!id || id === 'all') return;
      const c = currentSelectedTherapist.cases.find((x) => x.id === id);
      if (c) {
        newCaseForm.classList.add('expanded');
        populateCaseForm(c);
      }
    });
    saveNewCaseButton.addEventListener('click', () => {
      if (!currentSelectedTherapist) {
        alert('Please select a therapist first.');
        return;
      }
      const first = (firstNameInput && firstNameInput.value || '').trim();
      const last = (lastNameInput && lastNameInput.value || '').trim();
      const patientId = (idNumberInput && idNumberInput.value || '').trim();
      const crossStreets = (crossStreetsInput && crossStreetsInput.value || '').trim();
      const address = (addressInput && addressInput.value || '').trim();
      const city = (cityInput && cityInput.value || '').trim();
      const state = (stateInput && stateInput.value || '').trim();
      const zip = (zipInput && zipInput.value || '').trim();

      if (!first || !last || !patientId) {
        alert('Please enter first name, last name, and ID number.');
        return;
      }

      const baseId = slugify(`${first}-${last}-${patientId}`);
      let newCaseId = baseId;
      let idx = 1;
      while (currentSelectedTherapist.cases.some((c) => c.id === newCaseId)) {
        newCaseId = `${baseId}-${idx++}`;
      }

      const nextColorIndex = ((currentSelectedTherapist.cases.reduce((m, c) => Math.max(m, (typeof c.colorIndex === 'number' ? c.colorIndex : -1)), -1)) + 1) % 10;

      const newCase = {
        id: newCaseId,
        name: `${first} ${last}`,
        patientId,
        crossStreets,
        address,
        city,
        state,
        zip,
        schedule: [],
        colorIndex: nextColorIndex
      };

      therapists = Store.setTherapists((prev) => {
        return prev.map((t) => {
          if (t.id !== currentSelectedTherapist.id) return t;
          return { ...t, cases: [...t.cases, newCase] };
        });
      });

      // Refresh currentSelectedTherapist reference
      currentSelectedTherapist = therapists.find((t) => t.id === currentSelectedTherapist.id);

      // Update UI to show the new case selected
      populateCaseDropdown(currentSelectedTherapist);
      caseDropdown.value = newCaseId;
      editBookingScheduleTitle.textContent = `${newCase.name} - #${newCase.patientId}`;
      Render.clearGrid(editBookingScheduleGrid);
      Render.renderSingleCase(editBookingScheduleGrid, newCase, getEditInc());
      Render.renderLegend(casesLegend, [newCase]);
      // Recompute if switching to 'all' later

      // Close form and reset
      newCaseForm.classList.remove('expanded');
      clearCaseForm();
      editChildButton.classList.remove('disabled');
      editChildButton.disabled = false;
    });

    // Toggle Add Therapist form
    addNewTherapistButton && addNewTherapistButton.addEventListener('click', () => {
      addTherapistForm && addTherapistForm.classList.toggle('expanded');
    });

    // Save Therapist handler
    if (saveTherapistButton) {
      saveTherapistButton.addEventListener('click', () => {
        const first = (newTherapistFirstNameInput && newTherapistFirstNameInput.value || '').trim();
        const last = (newTherapistLastNameInput && newTherapistLastNameInput.value || '').trim();
        const email = (newTherapistEmailInput && newTherapistEmailInput.value || '').trim();
        const phone = (newTherapistPhoneInput && newTherapistPhoneInput.value || '').trim();
        if (!first || !last) {
          alert('Please enter first and last name.');
          return;
        }
        const baseId = slugify(`${first}-${last}`);
        let id = baseId;
        let counter = 1;
        while (therapists.some((t) => t.id === id)) {
          id = `${baseId}-${counter++}`;
        }
        const boroughPrefs = Array.from(document.querySelectorAll('#borough-prefs-group input[name="borough-pref"]:checked')).map((el) => el.value);
        const newTherapist = { id, firstName: first, lastName: last, phone, email, boroughPrefs, cases: [], totalHours: 0 };
        therapists = Store.setTherapists((prev) => [...prev, newTherapist]);
        populateTherapistSelectDropdown();
        populateTherapistList();
        addTherapistForm && addTherapistForm.classList.remove('expanded');
        if (newTherapistFirstNameInput) newTherapistFirstNameInput.value = '';
        if (newTherapistLastNameInput) newTherapistLastNameInput.value = '';
        if (newTherapistEmailInput) newTherapistEmailInput.value = '';
        if (newTherapistPhoneInput) newTherapistPhoneInput.value = '';
        if (boroughPrefsGroup) {
          boroughPrefsGroup.querySelectorAll('input[name="borough-pref"]').forEach((el) => { el.checked = false; });
        }
        therapistSelectDropdown.value = id;
        const t = therapists.find((x) => x.id === id);
        if (t) {
          loadTherapistSchedule(t);
          activateTab('edit-booking');
        }
      });
    }

    // Export/Import
    exportDataButton && exportDataButton.addEventListener('click', () => {
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
    });
    importDataInput && importDataInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        Store.importJSON(parsed);
        therapists = Store.getTherapists();
        populateTherapistSelectDropdown();
        populateTherapistList();
        currentTherapistDisplayName.textContent = 'Select a Therapist';
        caseDropdown.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
        editBookingScheduleTitle.textContent = 'Select a Case';
        Render.clearGrid(editBookingScheduleGrid);
        Render.renderLegend(casesLegend, []);
        newCaseForm.classList.remove('expanded');
        e.target.value = '';
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import data. Please ensure it is valid JSON.');
        e.target.value = '';
      }
    });

    // Search button: old behavior removed per new workflow
    if (searchButton) {
      searchButton.addEventListener('click', () => {
        // No-op (legacy search removed)
        if (searchResultsList) searchResultsList.innerHTML = '';
      });
    }

    // Wire new Search filters
    if (searchBoroughFilterGroup) {
      searchBoroughFilterGroup.addEventListener('change', () => {
        buildSearchTherapistOptions();
      });
    }
    if (searchMaxHoursInput) {
      searchMaxHoursInput.addEventListener('input', () => {
        buildSearchTherapistOptions();
      });
    }
    if (searchTherapistSelect) {
      searchTherapistSelect.addEventListener('change', () => {
        clearTherapistBusyOverlay();
        const id = searchTherapistSelect.value;
        if (!id) return;
        const t = therapists.find((x) => x.id === id);
        if (t) overlayTherapistOnSearchGrid(t);
      });
    }

    // Init
    populateTherapistSelectDropdown();
    populateTherapistList();
    buildSearchTherapistOptions();
    // Build grids first, then render
    Grid.generateTimeSlots(editBookingScheduleGrid, getEditInc(), {
      onMouseDown: handleEditMouseDown,
      onMouseEnter: handleEditMouseEnter,
      onClick: handleEditClick
    });
    rerenderSearchGrid();
  });
})(window);
