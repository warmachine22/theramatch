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

  // ----- Overlays and helpers (moved from app.js to reduce file size) -----
  const Time = TMS.Time;
  const ScheduleUtils = TMS.ScheduleUtils;

  // Match CSS case-color-0..9 shades
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

  function getSearchInc() {
    const incSelect = document.getElementById('increment-search');
    const v = parseInt((incSelect && incSelect.value) || '15', 10);
    return [15, 30, 60].includes(v) ? v : 15;
  }
  function getGrid() {
    return document.getElementById('search-schedule-grid');
  }
  function formatHoursFromSlots(slotCount) {
    const hours = slotCount / 4;
    return parseFloat(hours.toFixed(2)).toString();
  }
  function toMinutes(hhmm) {
    const parts = hhmm.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  function minutesDiff(a, b) {
    return toMinutes(b) - toMinutes(a);
  }

  function clearTherapistBusyOverlay() {
    const grid = getGrid();
    if (!grid) return;
    grid.querySelectorAll('.time-slot').forEach((cell) => {
      cell.classList.remove('busy', 'busy-top', 'busy-bottom', 'busy-full');
      cell.style.removeProperty('--busy-height');
    });
  }

  function clearSearchCaseOverlay() {
    const grid = getGrid();
    if (!grid) return;
    grid.querySelectorAll('.time-slot').forEach((cell) => {
      cell.classList.remove('case-overlay', 'break', 'break-bottom');
      cell.style.removeProperty('--case-gradient');
      cell.style.removeProperty('--break-height');
      // Remove any existing block total badges
      cell.querySelectorAll('.block-total-label').forEach((el) => el.remove());
    });
  }

  function overlayTherapistCaseColorsOnSearchGrid(therapist) {
    const grid = getGrid();
    if (!therapist || !grid) return;
    const inc = getSearchInc();

    // Build a map of slotId => segments [{startPct, endPct, color}]
    const cellSegments = new Map();

    (therapist.cases || []).forEach((c) => {
      const color = CASE_COLORS[c.colorIndex % CASE_COLORS.length] || '#007bff';
      const sched = c.schedule || [];
      const caseSet = new Set(sched.map((s) => s.slotId));
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
      const cell = grid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${timeStr}"]`);
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
  }

  function overlayTherapistBlockTotalsOnSearchGrid(therapist) {
    const grid = getGrid();
    if (!therapist || !grid) return;
    const inc = getSearchInc();
    // Clear old badges before placing new
    grid.querySelectorAll('.block-total-label').forEach((el) => el.remove());

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
              placeBadgeForRun(dayStr, run, c, inc, grid);
              run = [t];
            }
          }
        }
        if (run.length > 0) placeBadgeForRun(dayStr, run, c, inc, grid);
      });
    });

    function placeBadgeForRun(dayStr, runTimes, c, inc, gridEl) {
      const slotsPerDisplay = inc / 15;
      const totalSlots = runTimes.length;
      const hoursStr = formatHoursFromSlots(totalSlots);

      // Map display cell -> covered subslot count
      const coverMap = new Map();
      runTimes.forEach((t) => {
        const disp = Time.timeToDisplay(t, inc);
        coverMap.set(disp, (coverMap.get(disp) || 0) + 1);
      });
      // Choose last full cell; if none, choose the last display cell in the run
      let lastFull = null;
      let lastAny = null;
      Array.from(coverMap.keys()).sort((a, b) => toMinutes(a) - toMinutes(b)).forEach((disp) => {
        lastAny = disp;
        if (coverMap.get(disp) === slotsPerDisplay) lastFull = disp;
      });
      const labelTime = lastFull || lastAny;
      if (!labelTime) return;

      const cell = gridEl.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${labelTime}"]`);
      if (!cell) return;

      // Append badge (avoid duplicates if any)
      const existing = cell.querySelector(`.block-total-label[data-case-id="${c.id}"]`) || cell.querySelector('.block-total-label');
      if (existing) existing.remove();
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="block-total-label" data-case-id="${c.id}" title="${hoursStr} hours booked">${hoursStr}h</span>`
      );
    }
  }

  function overlayTherapistBreaksOnSearchGrid(therapist) {
    const grid = getGrid();
    if (!therapist || !grid) return;
    const inc = getSearchInc();

    // Sanitize break mins (0..120 in steps of 15)
    const searchBreakMinsInput = document.getElementById('search-break-mins');
    let breakMins = 0;
    if (searchBreakMinsInput) {
      const raw = parseInt(searchBreakMinsInput.value || '0', 10);
      const clamped = Math.max(0, Math.min(120, isNaN(raw) ? 0 : raw));
      breakMins = Math.round(clamped / 15) * 15;
    }
    if (breakMins <= 0) return;
    const breakSlotsWanted = breakMins / 15;

    // Build a Set of all 15-min slotIds the therapist is scheduled for (across all cases)
    const schedSet = ScheduleUtils.getTherapistScheduleSet(therapist);

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
            const cell = grid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${disp}"]`);
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
  }

  // ----- Selection state and handlers (moved from app.js) -----
  let selectedSlots = new Set();          // "day-HH:MM" 15-min slotIds
  let isDragging = false;
  let dragStartSlot = null;

  function setSelectedSlots(arr) {
    selectedSlots = new Set(Array.isArray(arr) ? arr : []);
    renderSelection();
  }
  function getSelectedSlots() {
    return Array.from(selectedSlots);
  }
  function forEachSelected(cb) {
    selectedSlots.forEach(cb);
  }

  function applyToggleForDisplaySlot(slotEl) {
    const inc = getSearchInc();
    const day = slotEl.dataset.day;
    const displayTime = slotEl.dataset.time;
    const subTimes = Time.blockSubslots15(displayTime, inc);
    const subSlotIds = subTimes.map((t) => `${day}-${t}`);
    const allPresent = subSlotIds.every((id) => selectedSlots.has(id));
    if (allPresent) subSlotIds.forEach((id) => selectedSlots.delete(id));
    else subSlotIds.forEach((id) => selectedSlots.add(id));
    renderSelection();
  }

  function renderSelection() {
    const grid = getGrid();
    if (!grid) return;
    const inc = getSearchInc();
    // Reset
    grid.querySelectorAll('.time-slot').forEach((cell) => {
      cell.classList.remove('selected', 'search-availability-color', 'partial', 'partial-top', 'partial-bottom');
      cell.style.removeProperty('--partial-height');
    });
    // Apply per-cell coverage
    grid.querySelectorAll('.time-slot').forEach((cell) => {
      const day = cell.dataset.day;
      const displayTime = cell.dataset.time;
      const subTimes = Time.blockSubslots15(displayTime, inc);
      const subSlotIds = subTimes.map((t) => `${day}-${t}`);
      const count = subSlotIds.length;

      let covered = 0;
      subSlotIds.forEach((id) => { if (selectedSlots.has(id)) covered++; });

      if (covered === count && covered > 0) {
        cell.classList.add('selected');
      } else if (covered > 0) {
        let startCovered = 0;
        for (let i = 0; i < count; i++) {
          if (selectedSlots.has(subSlotIds[i])) startCovered++; else break;
        }
        let endCovered = 0;
        for (let i = count - 1; i >= 0; i--) {
          if (selectedSlots.has(subSlotIds[i])) endCovered++; else break;
        }
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
  }

  function clearSearchHighlights() {
    const grid = getGrid();
    if (!grid) return;
    grid.querySelectorAll('.dragging-highlight').forEach((s) => s.classList.remove('dragging-highlight'));
  }

  function highlightSearchSlots(start, end) {
    const grid = getGrid();
    if (!grid || !start || !end) return;
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
    grid.querySelectorAll('.time-slot').forEach((cell) => {
      const d = parseInt(cell.dataset.day);
      const hm = cell.dataset.time.split(':');
      const h = parseInt(hm[0], 10), m = parseInt(hm[1], 10);
      const t = h * 60 + m;
      if (d >= dayRange[0] && d <= dayRange[1] && t >= timeRange[0] && t <= timeRange[1]) {
        cell.classList.add('dragging-highlight');
      }
    });
  }

  function handleMouseDown(slot) {
    isDragging = true;
    dragStartSlot = slot;
    document.body.style.userSelect = 'none';
  }
  function handleMouseMove(slot) {
    if (!isDragging) return;
    clearSearchHighlights();
    highlightSearchSlots(dragStartSlot, slot);
  }
  function handleMouseUp() {
    if (!isDragging) return;
    const grid = getGrid();
    const highlighted = grid ? grid.querySelectorAll('.dragging-highlight') : [];
    highlighted.forEach((cell) => {
      cell.classList.remove('dragging-highlight');
      applyToggleForDisplaySlot(cell);
    });
    isDragging = false;
    dragStartSlot = null;
    document.body.style.userSelect = '';
  }
  function handleClick(slot) {
    applyToggleForDisplaySlot(slot);
  }

  // Expose API
  Search.getActiveSearchBoroughs = getActiveSearchBoroughs;
  Search.buildSearchTherapistOptions = buildSearchTherapistOptions;
  Search.init = init;
  Search.clearTherapistBusyOverlay = clearTherapistBusyOverlay;
  Search.clearSearchCaseOverlay = clearSearchCaseOverlay;
  Search.overlayTherapistCaseColorsOnSearchGrid = overlayTherapistCaseColorsOnSearchGrid;
  Search.overlayTherapistBlockTotalsOnSearchGrid = overlayTherapistBlockTotalsOnSearchGrid;
  Search.overlayTherapistBreaksOnSearchGrid = overlayTherapistBreaksOnSearchGrid;

  // Selection API
  Search.setSelectedSlots = setSelectedSlots;
  Search.getSelectedSlots = getSelectedSlots;
  Search.forEachSelected = forEachSelected;
  Search.applySearchToggleForDisplaySlot = applyToggleForDisplaySlot;
  Search.renderSearchSelection = renderSelection;
  Search.clearSearchHighlights = clearSearchHighlights;
  Search.highlightSearchSlots = highlightSearchSlots;
  Search.handleSearchMouseDown = handleMouseDown;
  Search.handleSearchMouseMove = handleMouseMove;
  Search.handleSearchMouseUp = handleMouseUp;
  Search.handleSearchClick = handleClick;

})(window);
