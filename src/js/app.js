(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Grid = TMS.Grid;
  const Render = TMS.Render;
  const Store = TMS.Store;

  document.addEventListener('DOMContentLoaded', () => {
    // Tabs
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const activateTab = (tabId) => {
      tabs.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabId));
      tabContents.forEach((content) => content.classList.toggle('active', content.id === tabId));
    };
    tabs.forEach((button) => button.addEventListener('click', () => { TMS.Referrals.cleanupDraft(); activateTab(button.dataset.tab); }));

    // State bootstrap
    Store.initState();
    // One-time seed (delegated to TMS.Seed)
    TMS.Seed.applySeedQueens(Store);
    let therapists = Store.getTherapists();
    // One-time migration (delegated to TMS.Seed)
    TMS.Seed.applyRequiredHoursMigration(Store);
    therapists = Store.getTherapists();
    // Keep local cache in sync with Store updates from TMS.Edit/TMS.Therapists
    document.addEventListener('tms:therapistsUpdated', () => { therapists = Store.getTherapists(); });

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
    // Assign from Referral (Edit Booking)
    const referralAssignSelect = document.getElementById('referral-assign-select');
    const referralAssignedInfo = document.getElementById('referral-assigned-info');

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
    const newTherapistRequiredHoursInput = document.getElementById('new-therapist-required-hours');
    const boroughPrefsGroup = document.getElementById('borough-prefs-group');
    const boroughFilterGroup = document.getElementById('borough-filter-group');

    const searchButton = document.getElementById('search-button');
    const searchResultsList = document.getElementById('search-results-list');
    // New Search controls
    const searchTherapistSelect = document.getElementById('search-therapist-select');
    const searchBoroughFilterGroup = document.getElementById('search-borough-filter');
    const searchRequiredHoursInput = document.getElementById('search-required-hours');
    const searchCasesLegend = document.getElementById('search-cases-legend');
    const searchBreakMinsInput = document.getElementById('search-break-mins');
    const searchMaxMilesInput = document.getElementById('search-max-miles');
    // Referral entry fields
    const searchChildNameInput = document.getElementById('search-child-name');
    const searchChildIdInput = document.getElementById('search-child-id');
    const searchTotalHoursInput = document.getElementById('search-total-hours');
    const searchMaxPerDayInput = document.getElementById('search-max-per-day');
    const searchStatusSelect = document.getElementById('search-status');
    // Referrals tab
    const addNewReferralButton = document.getElementById('add-new-referral-button');
    const referralsListBody = document.getElementById('referrals-list-body');
    const referralChildrenDatalist = document.getElementById('referral-children-list');
    const referralOptionMap = TMS.Referrals.optionMap;

    // Remove any unsaved draft rows (delegated to TMS.Referrals)
    const cleanupNewReferralDraft = TMS.Referrals.cleanupDraft;
    // Flag: if user edits max/day manually, stop auto-defaulting
    let maxPerDayDirty = false;

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
    const getActiveSearchBoroughs = TMS.Search.getActiveSearchBoroughs;

    const buildSearchTherapistOptions = TMS.Search.buildSearchTherapistOptions;

    const getTherapistScheduleSet = TMS.ScheduleUtils.getTherapistScheduleSet;



    // Geocoding utilities via TMS.Geo
    const geocodeAddressCached = TMS.Geo.geocodeAddressCached;
    const haversineMiles = TMS.Geo.haversineMiles;







    // Compute break time subslots via TMS.ScheduleUtils
    const computeBreakSet = TMS.ScheduleUtils.computeBreakSet;

    // Search legend with per-case distance from current child (delegated to TMS.SearchLegend)
    const renderSearchLegendForTherapist = (therapist) => TMS.SearchLegend.render(therapist);
 
    // Clear any therapist selection/overlays on Search (ensure no association is implied/saved)
    const clearTherapistSelectionOnSearch = () => {
      if (searchTherapistSelect) searchTherapistSelect.value = '';
      TMS.Search.clearTherapistBusyOverlay();
      TMS.Search.clearSearchCaseOverlay();
      renderSearchLegendForTherapist(null);
    };
 
    // ---------- Referrals: helpers & UI ----------
    const roundToQuarter = (hrs) => {
      const n = Number(hrs);
      if (Number.isNaN(n)) return 0;
      return Math.round(n * 4) / 4;
    };
    const defaultMaxPerDayFromTotal = (total) => roundToQuarter((Number(total) || 0) / 5);

    const sortSlotIds = (arr) => {
      return [...arr].sort((a, b) => {
        const [da, ta] = a.split('-'); const [db, tb] = b.split('-');
        const [ah, am] = ta.split(':').map(Number); const [bh, bm] = tb.split(':').map(Number);
        const ad = parseInt(da, 10), bd = parseInt(db, 10);
        if (ad !== bd) return ad - bd;
        if (ah !== bh) return ah - bh;
        return am - bm;
      });
    };

    // Build searchable datalist for referrals (delegated)
    const buildReferralChildDatalist = () => {
      TMS.Referrals.buildChildDatalist();
    };

    // Build options for assigning referrals to therapist (delegated)
    const buildReferralAssignOptions = () => {
      TMS.Referrals.buildAssignOptions();
    };

    const loadReferralToSearch = (ref) => {
      if (!ref) return;

      // Fill form fields
      if (searchChildNameInput) searchChildNameInput.value = ref.childName || '';
      if (searchChildIdInput) searchChildIdInput.value = ref.childId || '';
      if (searchTotalHoursInput) searchTotalHoursInput.value = ref.totalReferredHours ?? '';
      if (searchMaxPerDayInput) { searchMaxPerDayInput.value = ref.maxDesiredPerDay ?? ''; maxPerDayDirty = true; }
      if (searchStatusSelect) searchStatusSelect.value = ref.status || 'referred';
      // Address
      const cs = document.getElementById('search-cross-streets');
      const city = document.getElementById('search-city');
      const st = document.getElementById('search-state');
      const zip = document.getElementById('search-zip');
      if (cs) cs.value = ref.crossStreets || '';
      if (city) city.value = ref.city || '';
      if (st) st.value = ref.state || '';
      if (zip) zip.value = ref.zip || '';

      // Apply availability (15-min slots) – only blue selection (no therapist data)
      const slots = ref.preferredAvailability || ref.availability || [];
      TMS.Search.setSelectedSlots(slots);
      TMS.Search.renderSearchSelection();
      // Activate Search tab
      typeof activateTab === 'function' && activateTab('search');
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

    // Helper to slugify IDs (delegated)
    const slugify = TMS.String.slugify;









    // Search interactions
    // Persist search selection is managed by TMS.Search



    // Toggle a display cell's underlying 15-min slots in the Set, then re-render

    // Reflect Set state onto the DOM, including partial coverage





    // Grid generation and re-render
    const rerenderSearchGrid = () => {
      Grid.generateTimeSlots(searchScheduleGrid, getSearchInc(), {
        isSearchGrid: true,
        onMouseDown: TMS.Search.handleSearchMouseDown,
        onMouseMove: TMS.Search.handleSearchMouseMove,
        onClick: TMS.Search.handleSearchClick
      });
      TMS.Search.renderSearchSelection();
      // Re-apply therapist case-color overlay if any is selected
      TMS.Search.clearTherapistBusyOverlay();
      TMS.Search.clearSearchCaseOverlay();
      if (searchTherapistSelect && searchTherapistSelect.value) {
        const t = therapists.find((x) => x.id === searchTherapistSelect.value);
        if (t) {
          TMS.Search.overlayTherapistCaseColorsOnSearchGrid(t);
          TMS.Search.overlayTherapistBlockTotalsOnSearchGrid(t);
          TMS.Search.overlayTherapistBreaksOnSearchGrid(t);
        }
      }
    };

    incrementEdit && incrementEdit.addEventListener('change', TMS.Edit.rerenderGrid);
    incrementSearch && incrementSearch.addEventListener('change', rerenderSearchGrid);
    document.addEventListener('mouseup', TMS.Search.handleSearchMouseUp);
    // Therapist list handled by TMS.Therapists; no direct binding here

    // Case dropdown change

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
      if (t) TMS.Edit.loadTherapistSchedule(t);

      // Clear referral selection/info when switching therapist
      if (referralAssignSelect) { referralAssignSelect.value = ''; }
      if (referralAssignedInfo) { referralAssignedInfo.innerHTML = ''; }
    });

    // Assign from Referral -> create/select case for current therapist

    // Add/Edit case UI
    if (addNewCaseButton) addNewCaseButton.addEventListener('click', () => {
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
      const t = TMS.Edit.getCurrentTherapist && TMS.Edit.getCurrentTherapist();
      if (!t) return;
      const c = (t.cases || []).find((x) => x.id === id);
      if (c) {
        newCaseForm.classList.add('expanded');
        populateCaseForm(c);
      }
    });
    saveNewCaseButton.addEventListener('click', async () => {
      const selectedTherapist = TMS.Edit.getCurrentTherapist && TMS.Edit.getCurrentTherapist();
      if (!selectedTherapist) {
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
      if (!crossStreets || !city || !zip) {
        alert('Please enter Cross Streets, City, and Zip.');
        return;
      }
      // Geocode and validate
      let coord;
      try {
        coord = await geocodeAddressCached({ address, crossStreets, city, state, zip });
      } catch (e) {
        alert('Invalid address. Please correct Cross Streets/City/State/Zip before saving.');
        return;
      }

      const baseId = slugify(`${first}-${last}-${patientId}`);
      let newCaseId = baseId;
      let idx = 1;
      while ((selectedTherapist.cases || []).some((c) => c.id === newCaseId)) {
        newCaseId = `${baseId}-${idx++}`;
      }

      const nextColorIndex =
        (((selectedTherapist.cases || [])
          .reduce((m, c) => Math.max(m, (typeof c.colorIndex === 'number' ? c.colorIndex : -1)), -1)) + 1) % 10;

      const newCase = {
        id: newCaseId,
        name: `${first} ${last}`,
        patientId,
        crossStreets,
        address,
        city,
        state,
        zip,
        lat: coord.lat,
        lon: coord.lon,
        schedule: [],
        colorIndex: nextColorIndex
      };

      // Persist in Store
      Store.setTherapists((prev) => {
        return prev.map((t) => {
          if (t.id !== selectedTherapist.id) return t;
          return { ...t, cases: [...(t.cases || []), newCase] };
        });
      });

      // Refresh selection via TMS.Edit and focus new case
      const updated = Store.getTherapists().find((t) => t.id === selectedTherapist.id);
      if (updated) {
        TMS.Edit.loadTherapistSchedule(updated);
        caseDropdown.value = newCaseId;
        TMS.Edit.rerenderGrid();
        editBookingScheduleTitle.textContent = `${newCase.name} - #${newCase.patientId}`;
        Render.renderLegend(casesLegend, [newCase]);
      }

      // Close form and reset
      newCaseForm.classList.remove('expanded');
      clearCaseForm();
      editChildButton.classList.remove('disabled');
      editChildButton.disabled = false;
    });

    // Therapist add/save handled by TMS.Therapists


    // Search button: old behavior removed per new workflow
    if (searchButton) {
      searchButton.addEventListener('click', async () => {
        if (searchResultsList) searchResultsList.innerHTML = '';

        // Read filters/inputs
        const boroughs = getActiveSearchBoroughs();
        const requiredHoursStr = (searchRequiredHoursInput && searchRequiredHoursInput.value || '').trim();
        const requiredHoursVal = requiredHoursStr === '' ? null : Number(requiredHoursStr);
        const childTotalStr = (searchTotalHoursInput && searchTotalHoursInput.value || '').trim();
        const childTotalHours = childTotalStr === '' ? 0 : Number(childTotalStr);
        let breakMins = parseInt(searchBreakMinsInput && searchBreakMinsInput.value || '0', 10);
        if (!Number.isFinite(breakMins)) breakMins = 0;
        breakMins = Math.max(0, Math.min(120, breakMins));
        const maxMilesVal = parseFloat(searchMaxMilesInput && searchMaxMilesInput.value || '0') || 0;

        // Ensure child coordinates if distance rule is enabled
        let childCoord = null;
        if (maxMilesVal > 0) {
          const cs = (document.getElementById('search-cross-streets') && document.getElementById('search-cross-streets').value || '').trim();
          const city = (document.getElementById('search-city') && document.getElementById('search-city').value || '').trim();
          const st = (document.getElementById('search-state') && document.getElementById('search-state').value || '').trim();
          const zip = (document.getElementById('search-zip') && document.getElementById('search-zip').value || '').trim();
          try {
            childCoord = await geocodeAddressCached({ address: '', crossStreets: cs, city, state: st, zip });
          } catch (e) {
            alert('Could not geocode child address. Please ensure the referral address is valid.');
            return;
          }
        }

        const ensureTherapistCaseCoords = async (t) => {
          let changed = false;
          for (const c of (t.cases || [])) {
            if (typeof c.lat !== 'number' || typeof c.lon !== 'number') {
              const addr = { address: c.address || '', crossStreets: c.crossStreets || '', city: c.city || '', state: c.state || '', zip: c.zip || '' };
              try {
                const coord = await geocodeAddressCached(addr);
                c.lat = coord.lat; c.lon = coord.lon;
                changed = true;
              } catch (e) {
                // leave missing; strict rule will exclude this therapist
              }
            }
          }
          if (changed) {
            therapists = Store.setTherapists((prev) => prev.map((x) => x.id === t.id ? t : x));
          }
          return t;
        };

        const shortlist = [];
        for (let t of therapists) {
          // Borough filter
          if (boroughs.length > 0) {
            if (!((t.boroughPrefs || []).some((b) => boroughs.includes(b)))) continue;
          }

          // Hours threshold
          const totalH = t.totalHours ?? 0;
          const tReq = t.requiredHours ?? 0;
          const passHours = (requiredHoursVal === null) ? (totalH < tReq) : (totalH <= requiredHoursVal);
          if (!passHours) continue;

          // Availability: remaining blue tiles (user selection) minus busy and break
          const busySet = getTherapistScheduleSet(t);
          const breakSet = computeBreakSet(t, breakMins, getSearchInc());
          let remainingSlots = 0;
          TMS.Search.forEachSelected((id) => {
            if (!busySet.has(id) && !breakSet.has(id)) remainingSlots++;
          });
          const remainingHours = remainingSlots / 4;
          if (remainingHours < (Number.isFinite(childTotalHours) ? childTotalHours : 0)) continue;

          // Distance rule
          if (maxMilesVal > 0) {
            t = await ensureTherapistCaseCoords(t);
            const missingCoords = (t.cases || []).some((c) => typeof c.lat !== 'number' || typeof c.lon !== 'number');
            if (missingCoords) continue; // strict: exclude until cases have valid coords
            const tooFar = (t.cases || []).some((c) => haversineMiles(childCoord.lat, childCoord.lon, c.lat, c.lon) > maxMilesVal);
            if (tooFar) continue;
          }

          shortlist.push(t);
        }

        // Populate therapist dropdown with shortlist and refresh selection/overlays
        if (searchTherapistSelect) {
          const prev = searchTherapistSelect.value || '';
          searchTherapistSelect.innerHTML = '<option value="">Select Therapist...</option>';
          const sorted = [...shortlist].sort((a, b) => (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`));
          sorted.forEach((t) => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `Dr. ${t.firstName} ${t.lastName} (${t.totalHours ?? 0}h)`;
            searchTherapistSelect.appendChild(opt);
          });

          // Determine if previous selection is still valid
          const stillPresent = sorted.some((t) => t.id === prev);
          TMS.Search.clearTherapistBusyOverlay();
          TMS.Search.clearSearchCaseOverlay();

          if (stillPresent) {
            searchTherapistSelect.value = prev;
            const t = therapists.find((x) => x.id === prev) || null;
            renderSearchLegendForTherapist(t || null);
            if (t) {
                TMS.Search.overlayTherapistCaseColorsOnSearchGrid(t);
                TMS.Search.overlayTherapistBlockTotalsOnSearchGrid(t);
                TMS.Search.overlayTherapistBreaksOnSearchGrid(t);
            }
          } else {
            // Clear selection and legend if no longer eligible
            searchTherapistSelect.value = '';
            renderSearchLegendForTherapist(null);
          }
        }
      });
    }

    // View schedule events from TMS.Therapists list
    document.addEventListener('tms:viewSchedule', (ev) => {
      const therapistId = ev && ev.detail && ev.detail.therapistId;
      if (!therapistId) return;
      const tt = therapists.find((x) => x.id === therapistId);
      if (tt) {
        TMS.Edit.loadTherapistSchedule(tt);
        if (therapistSelectDropdown) therapistSelectDropdown.value = therapistId;
        typeof activateTab === 'function' && activateTab('edit-booking');
      }
    });

    // Wire new Search filters
    if (searchBoroughFilterGroup) {
      searchBoroughFilterGroup.addEventListener('change', () => {
        buildSearchTherapistOptions();
      });
    }
    if (searchRequiredHoursInput) {
      searchRequiredHoursInput.addEventListener('input', () => {
        buildSearchTherapistOptions();
      });
    }
    if (searchBreakMinsInput) {
      searchBreakMinsInput.addEventListener('input', () => {
        // Re-apply overlays on break time change
        if (!searchTherapistSelect || !searchTherapistSelect.value) return;
        TMS.Search.clearTherapistBusyOverlay();
        TMS.Search.clearSearchCaseOverlay();
        const t = therapists.find((x) => x.id === searchTherapistSelect.value);
        if (t) {
          TMS.Search.overlayTherapistCaseColorsOnSearchGrid(t);
          TMS.Search.overlayTherapistBlockTotalsOnSearchGrid(t);
          TMS.Search.overlayTherapistBreaksOnSearchGrid(t);
        }
      });
    }
    if (searchTherapistSelect) {
      searchTherapistSelect.addEventListener('change', () => {
        TMS.Search.clearTherapistBusyOverlay();
        TMS.Search.clearSearchCaseOverlay();
        const id = searchTherapistSelect.value;
        const t = id ? therapists.find((x) => x.id === id) : null;
        renderSearchLegendForTherapist(t || null);
        if (t) {
          TMS.Search.overlayTherapistCaseColorsOnSearchGrid(t);
          TMS.Search.overlayTherapistBlockTotalsOnSearchGrid(t);
          TMS.Search.overlayTherapistBreaksOnSearchGrid(t);
        }
      });
    }
    // Auto-default max/day from total referred hours unless user edited
    if (searchTotalHoursInput) {
      searchTotalHoursInput.addEventListener('input', () => {
        const val = Number(searchTotalHoursInput.value || 0);
        if (!maxPerDayDirty && searchMaxPerDayInput) {
          searchMaxPerDayInput.value = defaultMaxPerDayFromTotal(val);
        }
      });
    }
    if (searchMaxPerDayInput) {
      searchMaxPerDayInput.addEventListener('input', () => { maxPerDayDirty = true; });
    }

    // Search tab: datalist selection of children -> load referral into Search (read-only)
    if (searchChildNameInput) {
      searchChildNameInput.addEventListener('change', () => {
        const val = (searchChildNameInput.value || '').trim();
        if (!val) return;
        let ref = null;
        const rid = referralOptionMap.get(val);
        if (rid) {
          ref = TMS.Store.findReferral(rid);
        } else {
          const m = val.match(/#\s*(.+)$/);
          if (m && m[1]) {
            ref = TMS.Store.findReferralByChildId((m[1] || '').trim());
          } else {
            const candidates = (TMS.Store.getReferrals() || []).filter(r =>
              (r.childName || '').trim().toLowerCase() === val.toLowerCase()
            );
            if (candidates.length === 1) ref = candidates[0];
          }
        }
        if (ref) {
          loadReferralToSearch(ref);
        }
      });
    }

    // Save referral (delegated to TMS.Referrals)
    if (addNewReferralButton) {
      addNewReferralButton.addEventListener('click', TMS.Referrals.addNewReferralInline);
    }

    // Init
    TMS.Referrals.init();
    if (TMS.Referrals && typeof TMS.Referrals.setLoadToSearchHook === 'function') {
      TMS.Referrals.setLoadToSearchHook(loadReferralToSearch);
    }
    // Initialize therapist UI (list + dropdown)
    TMS.Therapists.init();
    // Initialize generic UI (Export/Import handlers)
    TMS.UI.init();
    buildSearchTherapistOptions();
    renderSearchLegendForTherapist(null);
    TMS.Referrals.renderList();
    TMS.Referrals.buildChildDatalist();
    TMS.Referrals.buildAssignOptions();
    // Initialize Edit controller and build grids
    TMS.Edit.init();
    TMS.Edit.rerenderGrid();
    rerenderSearchGrid();
  });
})(window);
