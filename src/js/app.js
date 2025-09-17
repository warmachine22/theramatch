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
    tabs.forEach((button) => button.addEventListener('click', () => { cleanupNewReferralDraft(); activateTab(button.dataset.tab); }));

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
    const searchCurrentHoursInput = document.getElementById('search-current-hours');
    const searchCasesLegend = document.getElementById('search-cases-legend');
    const searchBreakMinsInput = document.getElementById('search-break-mins');
    // Referral entry fields
    const searchChildNameInput = document.getElementById('search-child-name');
    const searchChildIdInput = document.getElementById('search-child-id');
    const searchTotalHoursInput = document.getElementById('search-total-hours');
    const searchMaxPerDayInput = document.getElementById('search-max-per-day');
    const searchStatusSelect = document.getElementById('search-status');
    // Referrals tab
    const addNewReferralButton = document.getElementById('add-new-referral-button');
    const referralsListBody = document.getElementById('referrals-list-body');

    // Remove any unsaved draft (new referral) rows from the Referrals table
    const cleanupNewReferralDraft = () => {
      if (!referralsListBody) return;
      referralsListBody.querySelectorAll('tr.new-referral-row').forEach((draftRow) => {
        const next = draftRow.nextElementSibling;
        try { referralsListBody.removeChild(draftRow); } catch (e) {}
        if (next && next.classList.contains('referral-edit-row')) {
          try { referralsListBody.removeChild(next); } catch (e) {}
        }
      });
    };
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
    const getActiveSearchBoroughs = () => {
      if (!searchBoroughFilterGroup) return [];
      return Array.from(searchBoroughFilterGroup.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
    };

    const buildSearchTherapistOptions = () => {
      if (!searchTherapistSelect) return;
      const boroughs = getActiveSearchBoroughs();
      const currentHoursStr = (searchCurrentHoursInput && searchCurrentHoursInput.value || '').trim();
      const currentHours = currentHoursStr === '' ? null : Number(currentHoursStr);
      // Clear current options
      searchTherapistSelect.innerHTML = '<option value="">Select Therapist...</option>';
      let list = therapists;
      if (boroughs.length > 0) {
        list = list.filter((t) => (t.boroughPrefs || []).some((b) => boroughs.includes(b)));
      }
      if (currentHours !== null && !Number.isNaN(currentHours)) {
        list = list.filter((t) => (t.totalHours ?? 0) <= currentHours);
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

    // Case color palette (match CSS case-color-0..9 shades)
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

    // Helpers for block totals on Search
    const formatHoursFromSlots = (slotCount) => {
      const hours = slotCount / 4;
      return parseFloat(hours.toFixed(2)).toString();
    };
    const toMinutes = (hhmm) => {
      const parts = hhmm.split(':'); return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
    };
    const minutesDiff = (a, b) => toMinutes(b) - toMinutes(a);

    const clearTherapistBusyOverlay = () => {
      if (!searchScheduleGrid) return;
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        cell.classList.remove('busy', 'busy-top', 'busy-bottom', 'busy-full');
        cell.style.removeProperty('--busy-height');
      });
    };

    const overlayTherapistOnSearchGrid = (therapist) => {
      // Legacy red busy overlay (kept for reference; not used when case colors are enabled)
      if (!therapist || !searchScheduleGrid) return;
      const inc = getSearchInc();
      const schedSet = getTherapistScheduleSet(therapist);
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        const dayStr = cell.dataset.day;
        const displayTime = cell.dataset.time;
        if (!dayStr || !displayTime) return;
        const subTimes = Time.blockSubslots15(displayTime, inc);
        const count = subTimes.length;
        let covered = 0;
        for (let i = 0; i < count; i++) {
          const id = `${dayStr}-${subTimes[i]}`;
          if (schedSet.has(id)) covered++;
        }
        cell.classList.remove('busy', 'busy-top', 'busy-bottom', 'busy-full');
        cell.style.removeProperty('--busy-height');
        if (covered === 0) return;
        if (covered === count) {
          cell.classList.add('busy-full');
        } else {
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

    // Clear case-color overlay (Search)
    const clearSearchCaseOverlay = () => {
      if (!searchScheduleGrid) return;
      searchScheduleGrid.querySelectorAll('.time-slot').forEach((cell) => {
        cell.classList.remove('case-overlay', 'break', 'break-bottom');
        cell.style.removeProperty('--case-gradient');
        cell.style.removeProperty('--break-height');
        // Remove any existing block total badges
        cell.querySelectorAll('.block-total-label').forEach((el) => el.remove());
      });
    };

    // Overlay therapist’s cases using case colors with proportional fills (Search)
    const overlayTherapistCaseColorsOnSearchGrid = (therapist) => {
      if (!therapist || !searchScheduleGrid) return;
      const inc = getSearchInc();

      // Build a map of slotId => segments [{startPct, endPct, color}]
      const cellSegments = new Map();

      (therapist.cases || []).forEach((c) => {
        const color = CASE_COLORS[c.colorIndex % CASE_COLORS.length] || '#007bff';
        // For each 15-min slot in this case, determine its display cell
        const sched = c.schedule || [];
        // Build a Set for quick lookup
        const caseSet = new Set(sched.map((s) => s.slotId));

        // Determine which display cells this case touches by deriving from its 15-min slots
        const displayCells = new Set();
        sched.forEach((s) => {
          const [dayStr, timeStr] = s.slotId.split('-');
          const disp = Time.timeToDisplay(timeStr, inc);
          displayCells.add(`${dayStr}-${disp}`);
        });

        displayCells.forEach((slotId) => {
          const [dayStr, displayTime] = slotId.split('-');
          const subTimes = Time.blockSubslots15(displayTime, inc);
          const count = subTimes.length;
          // Compute contiguous coverage within this display cell for this case
          let first = -1, last = -1;
          for (let i = 0; i < count; i++) {
            const id = `${dayStr}-${subTimes[i]}`;
            if (caseSet.has(id)) {
              if (first === -1) first = i;
              last = i;
            }
          }
          if (first !== -1) {
            const startPct = Math.round((first / count) * 100);
            const endPct = Math.round(((last + 1) / count) * 100);
            const arr = cellSegments.get(slotId) || [];
            arr.push({ startPct, endPct, color });
            cellSegments.set(slotId, arr);
          }
        });
      });

      // Apply linear-gradient to each touched cell
      cellSegments.forEach((segments, slotId) => {
        const [dayStr, timeStr] = slotId.split('-');
        const cell = searchScheduleGrid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${timeStr}"]`);
        if (!cell) return;
        segments.sort((a, b) => a.startPct - b.startPct);
        let stops = [];
        let cursor = 0;
        segments.forEach((seg) => {
          if (seg.startPct > cursor) {
            stops.push(`transparent ${cursor}% ${seg.startPct}%`);
          }
          stops.push(`${seg.color} ${seg.startPct}% ${seg.endPct}%`);
          cursor = seg.endPct;
        });
        if (cursor < 100) {
          stops.push(`transparent ${cursor}% 100%`);
        }
        const gradient = `linear-gradient(to bottom, ${stops.join(', ')})`;
        cell.classList.add('case-overlay');
        cell.style.setProperty('--case-gradient', gradient);
      });
    };

    // Place block-total badges for contiguous runs per case/day on Search grid
    const overlayTherapistBlockTotalsOnSearchGrid = (therapist) => {
      if (!therapist || !searchScheduleGrid) return;
      const inc = getSearchInc();
      // Clear old badges before placing new
      searchScheduleGrid.querySelectorAll('.block-total-label').forEach((el) => el.remove());

      (therapist.cases || []).forEach((c) => {
        const byDay = new Map();
        (c.schedule || []).forEach((s) => {
          const [dayStr, timeStr] = s.slotId.split('-');
          if (!byDay.has(dayStr)) byDay.set(dayStr, []);
          byDay.get(dayStr).push(timeStr);
        });
        byDay.forEach((times, dayStr) => {
          times.sort((a, b) => toMinutes(a) - toMinutes(b));
          let run = [];
          for (let i = 0; i < times.length; i++) {
            const t = times[i];
            if (run.length === 0) {
              run.push(t);
            } else {
              const prev = run[run.length - 1];
              if (minutesDiff(prev, t) === 15) {
                run.push(t);
              } else {
                placeBadgeForRun(dayStr, run, c, inc);
                run = [t];
              }
            }
          }
          if (run.length > 0) placeBadgeForRun(dayStr, run, c, inc);
        });
      });

      function placeBadgeForRun(dayStr, runTimes, c, inc) {
        const slotsPerDisplay = inc / 15;
        const totalSlots = runTimes.length;
        const hoursStr = formatHoursFromSlots(totalSlots);

        const coverMap = new Map();
        runTimes.forEach((t) => {
          const disp = Time.timeToDisplay(t, inc);
          coverMap.set(disp, (coverMap.get(disp) || 0) + 1);
        });
        let lastFull = null;
        let lastAny = null;
        Array.from(coverMap.keys()).sort((a, b) => toMinutes(a) - toMinutes(b)).forEach((disp) => {
          lastAny = disp;
          if (coverMap.get(disp) === slotsPerDisplay) lastFull = disp;
        });
        const labelTime = lastFull || lastAny;
        if (!labelTime) return;

        const cell = searchScheduleGrid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${labelTime}"]`);
        if (!cell) return;

        const existing = cell.querySelector(`.block-total-label[data-case-id="${c.id}"]`);
        if (existing) existing.remove();
        cell.insertAdjacentHTML(
          'beforeend',
          `<span class="block-total-label" data-case-id="${c.id}" title="${hoursStr} hours booked">${hoursStr}h</span>`
        );
      }
    };

    // Overlay travel/break time after each contiguous run (Search)
    const overlayTherapistBreaksOnSearchGrid = (therapist) => {
      if (!therapist || !searchScheduleGrid) return;
      const inc = getSearchInc();

      // Sanitize break mins (0..120 in steps of 15)
      let breakMins = 0;
      if (searchBreakMinsInput) {
        const raw = parseInt(searchBreakMinsInput.value || '0', 10);
        const clamped = Math.max(0, Math.min(120, isNaN(raw) ? 0 : raw));
        breakMins = Math.round(clamped / 15) * 15;
      }
      if (breakMins <= 0) return;
      const breakSlotsWanted = breakMins / 15;

      // Build a Set of all 15-min slotIds the therapist is scheduled for (across all cases)
      const schedSet = getTherapistScheduleSet(therapist);

      const toMin = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const minToHHMM = (m) => {
        const h = Math.floor(m / 60);
        const mm = m % 60;
        return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      };

      (therapist.cases || []).forEach((c) => {
        const byDay = new Map();
        (c.schedule || []).forEach((s) => {
          const [dayStr, timeStr] = s.slotId.split('-');
          if (!byDay.has(dayStr)) byDay.set(dayStr, []);
          byDay.get(dayStr).push(timeStr);
        });

        byDay.forEach((times, dayStr) => {
          times.sort((a, b) => toMin(a) - toMin(b));
          let run = [];

          const finalizeRun = () => {
            if (run.length === 0) return;
            const lastStart = run[run.length - 1];
            let nextMin = toMin(lastStart) + 15; // first 15-min segment after the run
            if (nextMin >= 24 * 60) { run = []; return; }

            // Accumulate break subslots until conflict/limit/day-end
            const breakTimes = [];
            let added = 0;
            while (added < breakSlotsWanted) {
              if (nextMin >= 24 * 60) break; // stop at midnight
              const hhmm = minToHHMM(nextMin);
              const slotId = `${dayStr}-${hhmm}`;
              if (schedSet.has(slotId)) break; // stop if collides with any scheduled slot
              breakTimes.push(hhmm);
              nextMin += 15;
              added += 1;
            }

            if (breakTimes.length === 0) { run = []; return; }

            // Paint yellow overlays per display cell with correct alignment (top/bottom)
            const slotsPerDisplay = inc / 15;
            const coverInfo = new Map();
            breakTimes.forEach((t) => {
              const disp = Time.timeToDisplay(t, inc);
              const subTimes = Time.blockSubslots15(disp, inc);
              const idx = subTimes.indexOf(t);
              const info = coverInfo.get(disp) || { count: 0, minIdx: Number.POSITIVE_INFINITY, maxIdx: -1 };
              info.count += 1;
              info.minIdx = Math.min(info.minIdx, idx);
              info.maxIdx = Math.max(info.maxIdx, idx);
              coverInfo.set(disp, info);
            });
            Array.from(coverInfo.keys()).forEach((disp) => {
              const info = coverInfo.get(disp);
              const cell = searchScheduleGrid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${disp}"]`);
              if (!cell) return;
              cell.classList.add('break');
              cell.classList.remove('break-bottom');
              const ratio = Math.max(0, Math.min(1, info.count / slotsPerDisplay));
              cell.style.setProperty('--break-height', `${Math.round(ratio * 100)}%`);
              // If break occupies the bottom portion of this display cell, anchor to bottom
              if (ratio < 1 && info.maxIdx === slotsPerDisplay - 1 && info.minIdx > 0) {
                cell.classList.add('break-bottom');
              }
            });

            run = [];
          };

          for (let i = 0; i < times.length; i++) {
            const t = times[i];
            if (run.length === 0) run.push(t);
            else {
              const prev = run[run.length - 1];
              if (toMin(t) - toMin(prev) === 15) run.push(t);
              else { finalizeRun(); run = [t]; }
            }
          }
          finalizeRun();
        });
      });
    };

    const renderSearchLegendForTherapist = (therapist) => {
      if (!searchCasesLegend) return;
      // Clear legend if nothing selected
      if (!therapist) {
        searchCasesLegend.innerHTML = '';
        return;
      }
      Render.renderLegend(searchCasesLegend, therapist.cases || []);
    };
 
    // Clear any therapist selection/overlays on Search (ensure no association is implied/saved)
    const clearTherapistSelectionOnSearch = () => {
      if (searchTherapistSelect) searchTherapistSelect.value = '';
      clearTherapistBusyOverlay();
      clearSearchCaseOverlay();
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
      searchSelectedSlots = new Set(ref.availability || []);
      renderSearchSelection();
      // Activate Search tab
      typeof activateTab === 'function' && activateTab('search');
    };

    const renderReferralsList = () => {
      if (!referralsListBody) return;
      const list = TMS.Store.getReferrals();
      referralsListBody.innerHTML = '';
      const openClass = 'referral-edit-row';

      list.forEach((r) => {
        // Before wiring each existing row, ensure no leftover draft row remains
        cleanupNewReferralDraft();

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${r.childName || ''}</td>
          <td>${r.childId || ''}</td>
          <td>${r.totalReferredHours ?? 0}</td>
          <td>${r.maxDesiredPerDay ?? 0}</td>
          <td>${r.status || 'referred'}</td>
          <td>
            <button class="view-edit-ref btn btn-secondary" data-id="${r.id}">View/Edit</button>
            <button class="find-therapist-ref btn btn-primary" data-id="${r.id}">Find Therapist</button>
            <button class="delete-ref btn btn-outline" data-id="${r.id}">Delete</button>
          </td>
        `;
        referralsListBody.appendChild(row);

        const editRow = document.createElement('tr');
        editRow.className = openClass;
        editRow.style.display = 'none';
        editRow.innerHTML = `
          <td colspan="6">
            <div class="inline-edit-form referral-edit-panel">
              <div class="form-row">
                <input type="text" class="ref-edit-name" value="${r.childName || ''}" placeholder="Child Name">
                <input type="text" class="ref-edit-id" value="${r.childId || ''}" placeholder="Child ID">
              </div>
              <div class="form-row">
                <input type="number" class="ref-edit-total" value="${r.totalReferredHours ?? 0}" step="0.25" placeholder="Total Hours">
                <input type="number" class="ref-edit-maxday" value="${r.maxDesiredPerDay ?? 0}" step="0.25" placeholder="Max/Day">
                <select class="ref-edit-status">
                  <option value="referred" ${r.status === 'referred' ? 'selected' : ''}>Referred</option>
                  <option value="staffed" ${r.status === 'staffed' ? 'selected' : ''}>Staffed</option>
                </select>
              </div>
              <div class="form-row">
                <input type="text" class="ref-edit-cross" value="${r.crossStreets || ''}" placeholder="Cross Streets">
                <input type="text" class="ref-edit-city" value="${r.city || ''}" placeholder="City">
                <input type="text" class="ref-edit-state" value="${r.state || ''}" placeholder="State">
                <input type="text" class="ref-edit-zip" value="${r.zip || ''}" placeholder="Zip">
              </div>

              <div class="mini-schedule-controls">
                <label>Preferred Time - Increment:
                  <select class="ref-inc">
                    <option value="15" selected>15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                  </select>
                </label>
                <button class="btn btn-success ref-save" data-id="${r.id}">Save</button>
              </div>
              <div class="schedule-grid mini-schedule ref-mini-grid">
                <div class="grid-header">Time</div>
                <div class="grid-header">Sunday</div>
                <div class="grid-header">Monday</div>
                <div class="grid-header">Tuesday</div>
                <div class="grid-header">Wednesday</div>
                <div class="grid-header">Thursday</div>
                <div class="grid-header">Friday</div>
                <div class="grid-header">Saturday</div>
              </div>

              <div class="form-actions">
                <button class="btn btn-secondary ref-cancel">Cancel</button>
              </div>
            </div>
          </td>
        `;
        referralsListBody.appendChild(editRow);

        // Mini schedule (Preferred time) setup for this row
        let refMiniInitialized = false;
        let prefSelectedSlots = new Set(r.preferredAvailability || []);
        let isRefDragging = false;
        let refStartSlot = null;

        const ensureMiniScheduleInitialized = () => {
          if (refMiniInitialized) return;
          refMiniInitialized = true;

          const incSelect = editRow.querySelector('.ref-inc');
          const miniGrid = editRow.querySelector('.ref-mini-grid');
          if (!incSelect || !miniGrid) return;

          const getInc = () => {
            const v = parseInt(incSelect.value || '15', 10);
            return [15, 30, 60].includes(v) ? v : 15;
          };

          const clearRefHighlights = () => {
            miniGrid.querySelectorAll('.dragging-highlight').forEach((s) => s.classList.remove('dragging-highlight'));
          };

          const highlightRefSlots = (start, end) => {
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
            miniGrid.querySelectorAll('.time-slot').forEach((cell) => {
              const d = parseInt(cell.dataset.day);
              const hm = cell.dataset.time.split(':');
              const h = parseInt(hm[0], 10), m = parseInt(hm[1], 10);
              const t = h * 60 + m;
              if (d >= dayRange[0] && d <= dayRange[1] && t >= timeRange[0] && t <= timeRange[1]) {
                cell.classList.add('dragging-highlight');
              }
            });
          };

          const applyRefToggleForDisplaySlot = (slotEl) => {
            const inc = getInc();
            const day = slotEl.dataset.day;
            const displayTime = slotEl.dataset.time;
            const subTimes = Time.blockSubslots15(displayTime, inc);
            const subSlotIds = subTimes.map((t) => `${day}-${t}`);
            const allPresent = subSlotIds.every((id) => prefSelectedSlots.has(id));
            if (allPresent) {
              subSlotIds.forEach((id) => prefSelectedSlots.delete(id));
            } else {
              subSlotIds.forEach((id) => prefSelectedSlots.add(id));
            }
            refRenderSelection();
          };

          const refRenderSelection = () => {
            const inc = getInc();
            miniGrid.querySelectorAll('.time-slot').forEach((cell) => {
              cell.classList.remove('selected', 'partial', 'partial-top', 'partial-bottom');
              cell.style.removeProperty('--partial-height');
            });
            miniGrid.querySelectorAll('.time-slot').forEach((cell) => {
              const day = cell.dataset.day;
              const displayTime = cell.dataset.time;
              const subTimes = Time.blockSubslots15(displayTime, inc);
              const subSlotIds = subTimes.map((t) => `${day}-${t}`);
              const count = subSlotIds.length;
              let covered = 0;
              subSlotIds.forEach((id) => { if (prefSelectedSlots.has(id)) covered++; });
              if (covered === count && covered > 0) {
                cell.classList.add('selected');
              } else if (covered > 0) {
                let startCovered = 0;
                for (let i = 0; i < count; i++) {
                  if (prefSelectedSlots.has(subSlotIds[i])) startCovered++; else break;
                }
                let endCovered = 0;
                for (let i = count - 1; i >= 0; i--) {
                  if (prefSelectedSlots.has(subSlotIds[i])) endCovered++; else break;
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

          const refHandleMouseDown = (slot) => {
            isRefDragging = true;
            refStartSlot = slot;
            document.body.style.userSelect = 'none';
          };
          const refHandleMouseMove = (slot) => {
            if (!isRefDragging) return;
            clearRefHighlights();
            highlightRefSlots(refStartSlot, slot);
          };
          const refHandleMouseUp = () => {
            if (!isRefDragging) return;
            const highlighted = miniGrid.querySelectorAll('.dragging-highlight');
            highlighted.forEach((cell) => {
              cell.classList.remove('dragging-highlight');
              applyRefToggleForDisplaySlot(cell);
            });
            isRefDragging = false;
            refStartSlot = null;
            document.body.style.userSelect = '';
          };
          document.addEventListener('mouseup', refHandleMouseUp);

          const buildMiniGrid = () => {
            Grid.generateTimeSlots(miniGrid, getInc(), {
              isSearchGrid: true,
              onMouseDown: refHandleMouseDown,
              onMouseMove: refHandleMouseMove,
              onClick: (slot) => applyRefToggleForDisplaySlot(slot)
            });
            refRenderSelection();
          };

          incSelect.addEventListener('change', buildMiniGrid);
          buildMiniGrid();
        };

        // Wire actions
        const viewBtn = row.querySelector('.view-edit-ref');
        const findBtn = row.querySelector('.find-therapist-ref');
        const delBtn = row.querySelector('.delete-ref');
        const saveBtn = editRow.querySelector('.ref-save');
        const cancelBtn = editRow.querySelector('.ref-cancel');

        // Auto-default Max/Day = Total/5 until user edits Max/Day (inline editor for existing referrals)
        const totalInput = editRow.querySelector('.ref-edit-total');
        const maxDayInput = editRow.querySelector('.ref-edit-maxday');
        let refMaxPerDayDirty = false;
        // If max/day already has a value (> 0), treat as user-defined (do not auto-overwrite)
        if (maxDayInput && maxDayInput.value && Number(maxDayInput.value) > 0) {
          refMaxPerDayDirty = true;
        }
        if (totalInput && maxDayInput) {
          totalInput.addEventListener('input', () => {
            const val = Number(totalInput.value || 0);
            if (!refMaxPerDayDirty) {
              maxDayInput.value = defaultMaxPerDayFromTotal(val);
            }
          });
          maxDayInput.addEventListener('input', () => { refMaxPerDayDirty = true; });
        }

        viewBtn.addEventListener('click', () => {
          cleanupNewReferralDraft();
          const isOpen = editRow.style.display === 'table-row';
          // close others
          referralsListBody.querySelectorAll(`tr.${openClass}`).forEach((e) => (e.style.display = 'none'));
          const nextOpen = isOpen ? 'none' : 'table-row';
          editRow.style.display = nextOpen;
          if (nextOpen === 'table-row') ensureMiniScheduleInitialized();
        });

        cancelBtn.addEventListener('click', () => {
          editRow.style.display = 'none';
        });

        findBtn.addEventListener('click', () => {
          cleanupNewReferralDraft();
          const current = TMS.Store.findReferral(r.id);
          loadReferralToSearch(current || r);
        });

        delBtn.addEventListener('click', () => {
          cleanupNewReferralDraft();
          if (!confirm('Delete this referral?')) return;
          TMS.Store.deleteReferral(r.id);
          renderReferralsList();
        });

        saveBtn.addEventListener('click', () => {
          const patch = {
            childName: editRow.querySelector('.ref-edit-name').value.trim(),
            childId: editRow.querySelector('.ref-edit-id').value.trim(),
            totalReferredHours: Number(editRow.querySelector('.ref-edit-total').value || 0),
            maxDesiredPerDay: Number(editRow.querySelector('.ref-edit-maxday').value || 0),
            status: editRow.querySelector('.ref-edit-status').value,
            crossStreets: editRow.querySelector('.ref-edit-cross').value.trim(),
            city: editRow.querySelector('.ref-edit-city').value.trim(),
            state: editRow.querySelector('.ref-edit-state').value.trim(),
            zip: editRow.querySelector('.ref-edit-zip').value.trim(),
            preferredAvailability: sortSlotIds(Array.from(prefSelectedSlots || []))
          };
          try {
            TMS.Store.updateReferral(r.id, patch);
            renderReferralsList();
          } catch (e) {
            if (e && (e.code === 'DUPLICATE_CHILD_ID' || e.message === 'DUPLICATE_CHILD_ID')) {
              alert('Another referral already exists with this Child ID. Please change the Child ID or edit the existing referral.');
            } else {
              console.error('Inline update referral failed:', e);
              alert('Failed to update referral.');
            }
          }
        });
      });
    };

    // Inline "Add New Referral" creation on Referrals tab
    const addNewReferralInline = () => {
      if (!referralsListBody) return;

      // Remove any existing unsaved draft first
      cleanupNewReferralDraft();

      // Close any open inline editors
      referralsListBody.querySelectorAll('tr.referral-edit-row').forEach((e) => (e.style.display = 'none'));

      // Create display row
      const row = document.createElement('tr');
      row.className = 'new-referral-row';
      row.innerHTML = `
        <td></td>
        <td></td>
        <td>0</td>
        <td>0</td>
        <td>referred</td>
        <td><span class="chip">New</span></td>
      `;

      // Create inline editor row
      const editRow = document.createElement('tr');
      editRow.className = 'referral-edit-row';
      editRow.style.display = 'table-row';
      editRow.innerHTML = `
        <td colspan="6">
          <div class="inline-edit-form referral-edit-panel">
            <div class="form-row">
              <input type="text" class="ref-edit-name" value="" placeholder="Child Name">
              <input type="text" class="ref-edit-id" value="" placeholder="Child ID">
            </div>
            <div class="form-row">
              <input type="number" class="ref-edit-total" value="0" step="0.25" placeholder="Total Hours">
              <input type="number" class="ref-edit-maxday" value="0" step="0.25" placeholder="Max/Day">
              <select class="ref-edit-status">
                <option value="referred" selected>Referred</option>
                <option value="staffed">Staffed</option>
              </select>
            </div>
            <div class="form-row">
              <input type="text" class="ref-edit-cross" value="" placeholder="Cross Streets">
              <input type="text" class="ref-edit-city" value="" placeholder="City">
              <input type="text" class="ref-edit-state" value="" placeholder="State">
              <input type="text" class="ref-edit-zip" value="" placeholder="Zip">
            </div>

            <div class="mini-schedule-controls">
              <label>Preferred Time - Increment:
                <select class="ref-inc">
                  <option value="15" selected>15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                </select>
              </label>
              <button class="btn btn-success ref-save">Save</button>
              <button class="btn btn-secondary ref-cancel">Cancel</button>
            </div>
            <div class="schedule-grid mini-schedule ref-mini-grid">
              <div class="grid-header">Time</div>
              <div class="grid-header">Sunday</div>
              <div class="grid-header">Monday</div>
              <div class="grid-header">Tuesday</div>
              <div class="grid-header">Wednesday</div>
              <div class="grid-header">Thursday</div>
              <div class="grid-header">Friday</div>
              <div class="grid-header">Saturday</div>
            </div>

            
          </div>
        </td>
      `;

      // Insert at top
      if (referralsListBody.firstChild) {
        referralsListBody.insertBefore(row, referralsListBody.firstChild);
        referralsListBody.insertBefore(editRow, row.nextSibling);
      } else {
        referralsListBody.appendChild(row);
        referralsListBody.appendChild(editRow);
      }

      // Mini schedule (Preferred time) setup for this new row
      let refMiniInitialized = false;
      let prefSelectedSlots = new Set();
      let isRefDragging = false;
      let refStartSlot = null;

      const ensureMiniScheduleInitialized = () => {
        if (refMiniInitialized) return;
        refMiniInitialized = true;

        const incSelect = editRow.querySelector('.ref-inc');
        const miniGrid = editRow.querySelector('.ref-mini-grid');
        if (!incSelect || !miniGrid) return;

        const getInc = () => {
          const v = parseInt(incSelect.value || '15', 10);
          return [15, 30, 60].includes(v) ? v : 15;
        };

        const clearRefHighlights = () => {
          miniGrid.querySelectorAll('.dragging-highlight').forEach((s) => s.classList.remove('dragging-highlight'));
        };

        const highlightRefSlots = (start, end) => {
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
          miniGrid.querySelectorAll('.time-slot').forEach((cell) => {
            const d = parseInt(cell.dataset.day);
            const hm = cell.dataset.time.split(':');
            const h = parseInt(hm[0], 10), m = parseInt(hm[1], 10);
            const t = h * 60 + m;
            if (d >= dayRange[0] && d <= dayRange[1] && t >= timeRange[0] && t <= timeRange[1]) {
              cell.classList.add('dragging-highlight');
            }
          });
        };

        const applyRefToggleForDisplaySlot = (slotEl) => {
          const inc = getInc();
          const day = slotEl.dataset.day;
          const displayTime = slotEl.dataset.time;
          const subTimes = Time.blockSubslots15(displayTime, inc);
          const subSlotIds = subTimes.map((t) => `${day}-${t}`);
          const allPresent = subSlotIds.every((id) => prefSelectedSlots.has(id));
          if (allPresent) {
            subSlotIds.forEach((id) => prefSelectedSlots.delete(id));
          } else {
            subSlotIds.forEach((id) => prefSelectedSlots.add(id));
          }
          refRenderSelection();
        };

        const refRenderSelection = () => {
          const inc = getInc();
          miniGrid.querySelectorAll('.time-slot').forEach((cell) => {
            cell.classList.remove('selected', 'partial', 'partial-top', 'partial-bottom');
            cell.style.removeProperty('--partial-height');
          });
          miniGrid.querySelectorAll('.time-slot').forEach((cell) => {
            const day = cell.dataset.day;
            const displayTime = cell.dataset.time;
            const subTimes = Time.blockSubslots15(displayTime, inc);
            const subSlotIds = subTimes.map((t) => `${day}-${t}`);
            const count = subSlotIds.length;
            let covered = 0;
            subSlotIds.forEach((id) => { if (prefSelectedSlots.has(id)) covered++; });
            if (covered === count && covered > 0) {
              cell.classList.add('selected');
            } else if (covered > 0) {
              let startCovered = 0;
              for (let i = 0; i < count; i++) { if (prefSelectedSlots.has(subSlotIds[i])) startCovered++; else break; }
              let endCovered = 0;
              for (let i = count - 1; i >= 0; i--) { if (prefSelectedSlots.has(subSlotIds[i])) endCovered++; else break; }
              let ratio = 0;
              let align = 'top';
              if (startCovered > 0 && endCovered === 0) { ratio = startCovered / count; align = 'top'; }
              else if (endCovered > 0 && startCovered === 0) { ratio = endCovered / count; align = 'bottom'; }
              else { ratio = covered / count; align = 'top'; }
              cell.classList.add('partial');
              cell.classList.toggle('partial-top', align === 'top');
              cell.classList.toggle('partial-bottom', align === 'bottom');
              cell.style.setProperty('--partial-height', `${Math.round(ratio * 100)}%`);
            }
          });
        };

        const refHandleMouseDown = (slot) => {
          isRefDragging = true;
          refStartSlot = slot;
          document.body.style.userSelect = 'none';
        };
        const refHandleMouseMove = (slot) => {
          if (!isRefDragging) return;
          miniGrid.querySelectorAll('.dragging-highlight').forEach((s) => s.classList.remove('dragging-highlight'));
          highlightRefSlots(refStartSlot, slot);
        };
        const refHandleMouseUp = () => {
          if (!isRefDragging) return;
          const highlighted = miniGrid.querySelectorAll('.dragging-highlight');
          highlighted.forEach((cell) => {
            cell.classList.remove('dragging-highlight');
            applyRefToggleForDisplaySlot(cell);
          });
          isRefDragging = false;
          refStartSlot = null;
          document.body.style.userSelect = '';
        };
        document.addEventListener('mouseup', refHandleMouseUp);

        const buildMiniGrid = () => {
          Grid.generateTimeSlots(miniGrid, getInc(), {
            isSearchGrid: true,
            onMouseDown: refHandleMouseDown,
            onMouseMove: refHandleMouseMove,
            onClick: (slot) => applyRefToggleForDisplaySlot(slot)
          });
          refRenderSelection();
        };

        incSelect.addEventListener('change', buildMiniGrid);
        buildMiniGrid();
      };

      // Auto-init now that it's opened
      ensureMiniScheduleInitialized();

      // Wire actions
      const saveBtn = editRow.querySelector('.ref-save');
      const cancelBtn = editRow.querySelector('.ref-cancel');

      // Auto-default Max/Day = Total/5 until user edits Max/Day (new inline referral)
      const totalInput = editRow.querySelector('.ref-edit-total');
      const maxDayInput = editRow.querySelector('.ref-edit-maxday');
      let refMaxPerDayDirty = false;
      if (totalInput && maxDayInput) {
        totalInput.addEventListener('input', () => {
          const val = Number(totalInput.value || 0);
          if (!refMaxPerDayDirty) {
            maxDayInput.value = defaultMaxPerDayFromTotal(val);
          }
        });
        maxDayInput.addEventListener('input', () => { refMaxPerDayDirty = true; });
      }

      cancelBtn.addEventListener('click', () => {
        try { referralsListBody.removeChild(editRow); } catch (e) {}
        try { referralsListBody.removeChild(row); } catch (e) {}
      });

      saveBtn.addEventListener('click', () => {
        const childName = editRow.querySelector('.ref-edit-name').value.trim();
        const childId = editRow.querySelector('.ref-edit-id').value.trim();
        const totalReferredHours = Number(editRow.querySelector('.ref-edit-total').value || 0);
        const maxDesiredPerDay = Number(editRow.querySelector('.ref-edit-maxday').value || 0);
        const status = editRow.querySelector('.ref-edit-status').value;
        const crossStreets = editRow.querySelector('.ref-edit-cross').value.trim();
        const city = editRow.querySelector('.ref-edit-city').value.trim();
        const state = editRow.querySelector('.ref-edit-state').value.trim();
        const zip = editRow.querySelector('.ref-edit-zip').value.trim();

        // Required: Name, ID, Address (Cross Streets + City + Zip)
        if (!childName || !childId || !crossStreets || !city || !zip) {
          alert('Please enter Child Name, Child ID, Cross Streets, City, and Zip.');
          return;
        }

        const baseId = slugify(`${childName}-${childId}`);
        const uniqueId = `${baseId}-${Date.now()}`;
        const ref = {
          id: uniqueId,
          childName,
          childId,
          totalReferredHours: roundToQuarter(totalReferredHours),
          maxDesiredPerDay: roundToQuarter(maxDesiredPerDay),
          status,
          crossStreets,
          city,
          state,
          zip,
          preferredAvailability: sortSlotIds(Array.from(prefSelectedSlots || []))
        };

        try {
          TMS.Store.addReferral(ref);
          renderReferralsList();
          alert('Referral saved.');
        } catch (e) {
          if (e && (e.code === 'DUPLICATE_CHILD_ID' || e.message === 'DUPLICATE_CHILD_ID')) {
            alert('A referral already exists with this Child ID. Please use a different ID or edit the existing referral.');
          } else {
            console.error('Save new referral failed:', e);
            alert('Failed to save referral.');
          }
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
      // Re-apply therapist case-color overlay if any is selected
      clearTherapistBusyOverlay();
      clearSearchCaseOverlay();
      if (searchTherapistSelect && searchTherapistSelect.value) {
        const t = therapists.find((x) => x.id === searchTherapistSelect.value);
        if (t) {
          overlayTherapistCaseColorsOnSearchGrid(t);
          overlayTherapistBlockTotalsOnSearchGrid(t);
          overlayTherapistBreaksOnSearchGrid(t);
        }
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
    if (searchCurrentHoursInput) {
      searchCurrentHoursInput.addEventListener('input', () => {
        buildSearchTherapistOptions();
      });
    }
    if (searchBreakMinsInput) {
      searchBreakMinsInput.addEventListener('input', () => {
        // Re-apply overlays on break time change
        if (!searchTherapistSelect || !searchTherapistSelect.value) return;
        clearTherapistBusyOverlay();
        clearSearchCaseOverlay();
        const t = therapists.find((x) => x.id === searchTherapistSelect.value);
        if (t) {
          overlayTherapistCaseColorsOnSearchGrid(t);
          overlayTherapistBlockTotalsOnSearchGrid(t);
          overlayTherapistBreaksOnSearchGrid(t);
        }
      });
    }
    if (searchTherapistSelect) {
      searchTherapistSelect.addEventListener('change', () => {
        clearTherapistBusyOverlay();
        clearSearchCaseOverlay();
        const id = searchTherapistSelect.value;
        const t = id ? therapists.find((x) => x.id === id) : null;
        renderSearchLegendForTherapist(t || null);
        if (t) {
          overlayTherapistCaseColorsOnSearchGrid(t);
          overlayTherapistBlockTotalsOnSearchGrid(t);
          overlayTherapistBreaksOnSearchGrid(t);
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
    // Save referral (removed)
    if (addNewReferralButton) {
      addNewReferralButton.addEventListener('click', addNewReferralInline);
    }

    // Init
    populateTherapistSelectDropdown();
    populateTherapistList();
    buildSearchTherapistOptions();
    renderSearchLegendForTherapist(null);
    renderReferralsList();
    // Build grids first, then render
    Grid.generateTimeSlots(editBookingScheduleGrid, getEditInc(), {
      onMouseDown: handleEditMouseDown,
      onMouseEnter: handleEditMouseEnter,
      onClick: handleEditClick
    });
    rerenderSearchGrid();
  });
})(window);
