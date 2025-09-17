(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Render = TMS.Render = TMS.Render || {};
  const Time = TMS.Time;
  // Case color palette to match CSS classes case-color-0..9
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

  // Format hours (15-min slots / 4) without trailing zeros (e.g., 2, 2.5, 2.25, 2.75)
  function formatHoursFromSlots(slotCount) {
    const hours = slotCount / 4;
    // Keep up to 2 decimals, trim trailing zeros
    return parseFloat(hours.toFixed(2)).toString();
  }

  // HH:MM utilities for contiguous run detection
  function toMinutes(hhmm) {
    const parts = hhmm.split(':'); return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  function minutesDiff(a, b) { return toMinutes(b) - toMinutes(a); }

  /**
   * UI render helpers for schedules and legend.
   * Pure DOM write operations; no state mutation here.
   */

  function clearGrid(gridElement) {
    gridElement.querySelectorAll('.time-slot').forEach((slot) => {
      slot.classList.remove('selected', 'search-availability-color', 'block-start', 'partial', 'partial-top', 'partial-bottom');
      for (let i = 0; i < 10; i++) {
        slot.classList.remove(`case-color-${i}`);
      }
      slot.style.removeProperty('--partial-height');
      slot.style.removeProperty('--partial-color');
      slot.style.backgroundImage = '';
      slot.innerHTML = '';
    });
  }
  Render.clearGrid = clearGrid;

  /**
   * Given a case and display increment, return a Set of display-level slotIds (e.g. "2-9:00")
   * derived from the underlying 15-minute schedule entries.
   */
  function buildDisplaySetForCase(clientCase, inc) {
    const set = new Set();
    (clientCase.schedule || []).forEach((s) => {
      const parts = s.slotId.split('-');
      const dayStr = parts[0];
      const timeStr = parts[1];
      const disp = Time.timeToDisplay(timeStr, inc);
      set.add(`${dayStr}-${disp}`);
    });
    return set;
  }
  Render.buildDisplaySetForCase = buildDisplaySetForCase;

  /**
   * Render a single case on the grid for the given increment.
   * Also places a small hours badge on the last full display cell of each contiguous run.
   */
  function renderSingleCase(gridElement, clientCase, inc) {
    // Build a fast lookup of the case's 15-min slots
    const schedSet = new Set((clientCase.schedule || []).map((s) => s.slotId));

    // Identify which display-level slots have any coverage (for base painting)
    const displayCovered = new Set();
    (clientCase.schedule || []).forEach((s) => {
      const [dayStr, timeStr] = s.slotId.split('-');
      const disp = Time.timeToDisplay(timeStr, inc);
      displayCovered.add(`${dayStr}-${disp}`);
    });

    // Paint the case (full/partial per display cell)
    displayCovered.forEach((slotId) => {
      const [dayStr, timeStr] = slotId.split('-');
      const slot = gridElement.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${timeStr}"]`);
      if (!slot) return;

      // Compute 15-min coverage within this display cell
      const subTimes = Time.blockSubslots15(timeStr, inc);
      const subSlotIds = subTimes.map((t) => `${dayStr}-${t}`);
      const count = subSlotIds.length;

      let covered = 0;
      for (const id of subSlotIds) if (schedSet.has(id)) covered++;

      if (covered === count && covered > 0) {
        // Full coverage: fill with case color (keep case colors in Edit view)
        slot.classList.add(`case-color-${clientCase.colorIndex}`);
      } else if (covered > 0) {
        // Partial coverage
        let startCovered = 0;
        for (let i = 0; i < count; i++) {
          if (schedSet.has(subSlotIds[i])) startCovered++; else break;
        }
        let endCovered = 0;
        for (let i = count - 1; i >= 0; i--) {
          if (schedSet.has(subSlotIds[i])) endCovered++; else break;
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

        // Ensure base cell shows the case tint and overlay uses same color
        const partialColor = CASE_COLORS[clientCase.colorIndex % CASE_COLORS.length] || '#007bff';
        slot.classList.add(`case-color-${clientCase.colorIndex}`);
        slot.style.setProperty('--partial-color', partialColor);

        slot.classList.add('partial');
        slot.classList.toggle('partial-top', align === 'top');
        slot.classList.toggle('partial-bottom', align === 'bottom');
        slot.style.setProperty('--partial-height', `${Math.round(ratio * 100)}%`);
      }

      // Block-start label logic based on display coverage continuity
      const prev = Time.getPrevDisplayTime(timeStr, inc);
      const isBlockStart = !prev || !displayCovered.has(`${dayStr}-${prev}`);
      if (isBlockStart) {
        slot.classList.add('block-start');
        // Name label omitted; legend provides mapping.
      }
    });

    // Place "block total hours" badges on last full display cell of each contiguous run (per day)
    const byDay = new Map();
    (clientCase.schedule || []).forEach((s) => {
      const [dayStr, timeStr] = s.slotId.split('-');
      if (!byDay.has(dayStr)) byDay.set(dayStr, []);
      byDay.get(dayStr).push(timeStr);
    });

    byDay.forEach((times, dayStr) => {
      // Sort HH:MM lexicographically works because zero-padded minutes only; hours are integers
      times.sort((a, b) => toMinutes(a) - toMinutes(b));
      // Build contiguous runs (15-min apart)
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
            // finalize previous run
            placeBadgeForRun(dayStr, run, clientCase, inc, gridElement);
            run = [t];
          }
        }
      }
      if (run.length > 0) {
        placeBadgeForRun(dayStr, run, clientCase, inc, gridElement);
      }
    });

    function placeBadgeForRun(dayStr, runTimes, c, inc, grid) {
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

      const cell = grid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${labelTime}"]`);
      if (!cell) return;

      // Append badge (avoid duplicates if any)
      const existing = cell.querySelector('.block-total-label');
      if (existing) existing.remove();
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="block-total-label" title="${hoursStr} hours booked">${hoursStr}h</span>`
      );
    }
  }
  Render.renderSingleCase = renderSingleCase;

  /**
   * Render all cases combined onto the grid for the given increment.
   * Labels are de-duplicated per cell; each case writes its name on block start.
   */
  function renderCombined(gridElement, cases, inc) {
    // Precompute schedule sets and display-covered sets for each case
    const meta = cases.map((c) => {
      const schedSet = new Set((c.schedule || []).map((s) => s.slotId));
      const displayCovered = new Set();
      (c.schedule || []).forEach((s) => {
        const [dayStr, timeStr] = s.slotId.split('-');
        const disp = Time.timeToDisplay(timeStr, inc);
        displayCovered.add(`${dayStr}-${disp}`);
      });
      return { c, schedSet, displayCovered };
    });

    meta.forEach(({ c, schedSet, displayCovered }) => {
      displayCovered.forEach((slotId) => {
        const [dayStr, timeStr] = slotId.split('-');
        const slot = gridElement.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${timeStr}"]`);
        if (!slot) return;

        const subTimes = Time.blockSubslots15(timeStr, inc);
        const subSlotIds = subTimes.map((t) => `${dayStr}-${t}`);
        const count = subSlotIds.length;

        let covered = 0;
        for (const id of subSlotIds) if (schedSet.has(id)) covered++;

        if (covered === count && covered > 0) {
          slot.classList.add(`case-color-${c.colorIndex}`);
        } else if (covered > 0) {
          let startCovered = 0;
          for (let i = 0; i < count; i++) {
            if (schedSet.has(subSlotIds[i])) startCovered++; else break;
          }
          let endCovered = 0;
          for (let i = count - 1; i >= 0; i--) {
            if (schedSet.has(subSlotIds[i])) endCovered++; else break;
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

          const partialColor = CASE_COLORS[c.colorIndex % CASE_COLORS.length] || '#007bff';
          slot.classList.add(`case-color-${c.colorIndex}`);
          slot.style.setProperty('--partial-color', partialColor);

          slot.classList.add('partial');
          slot.classList.toggle('partial-top', align === 'top');
          slot.classList.toggle('partial-bottom', align === 'bottom');
          slot.style.setProperty('--partial-height', `${Math.round(ratio * 100)}%`);
        }

        const prev = Time.getPrevDisplayTime(timeStr, inc);
        const isBlockStart = !prev || !displayCovered.has(`${dayStr}-${prev}`);
        if (isBlockStart) {
          slot.classList.add('block-start');
          // Name label omitted; legend provides mapping.
        }
      });
    });
  }
  // Gradient-based combined renderer to show multiple case segments within a single display cell
  function renderCombinedGradient(gridElement, cases, inc) {
    const cellMap = new Map(); // slotId -> segments [{startPct,endPct,color,colorIndex}]

    cases.forEach((c) => {
      const schedSet = new Set((c.schedule || []).map((s) => s.slotId));
      const displayCells = new Set();
      (c.schedule || []).forEach((s) => {
        const [dayStr, timeStr] = s.slotId.split('-');
        const disp = Time.timeToDisplay(timeStr, inc);
        displayCells.add(`${dayStr}-${disp}`);
      });

      displayCells.forEach((slotId) => {
        const [dayStr, timeStr] = slotId.split('-');
        const subTimes = Time.blockSubslots15(timeStr, inc);
        const count = subTimes.length;
        let first = -1, last = -1;
        for (let i = 0; i < count; i++) {
          const id = `${dayStr}-${subTimes[i]}`;
          if (schedSet.has(id)) {
            if (first === -1) first = i;
            last = i;
          }
        }
        if (first !== -1) {
          const startPct = Math.round((first / count) * 100);
          const endPct = Math.round(((last + 1) / count) * 100);
          const color = CASE_COLORS[c.colorIndex % CASE_COLORS.length] || '#007bff';
          const arr = cellMap.get(slotId) || [];
          arr.push({ startPct, endPct, color, colorIndex: c.colorIndex });
          cellMap.set(slotId, arr);
        }
      });
    });

    // Paint each affected cell using a single linear-gradient with ordered segments
    cellMap.forEach((segments, slotId) => {
      const [dayStr, timeStr] = slotId.split('-');
      const slot = gridElement.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${timeStr}"]`);
      if (!slot) return;

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

      // Clear any prior classes that tint cell, then apply gradient
      for (let i = 0; i < 10; i++) slot.classList.remove(`case-color-${i}`);
      slot.classList.remove('partial', 'partial-top', 'partial-bottom');
      slot.style.removeProperty('--partial-height');
      slot.style.removeProperty('--partial-color');
      slot.style.backgroundImage = `linear-gradient(to bottom, ${stops.join(', ')})`;
    });

    // After painting combined view, place block-total badges for each case (per contiguous run)
    cases.forEach((c) => {
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
              placeBadgeForRunCombined(dayStr, run, c, inc, gridElement);
              run = [t];
            }
          }
        }
        if (run.length > 0) placeBadgeForRunCombined(dayStr, run, c, inc, gridElement);
      });
    });

    function placeBadgeForRunCombined(dayStr, runTimes, c, inc, grid) {
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
      const cell = grid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${labelTime}"]`);
      if (!cell) return;
      const existing = cell.querySelector(`.block-total-label[data-case-id="${c.id}"]`);
      if (existing) existing.remove();
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="block-total-label" data-case-id="${c.id}" title="${hoursStr} hours booked">${hoursStr}h</span>`
      );
    }
  }
  Render.renderCombined = renderCombinedGradient;

  /**
   * Render the legend with unique cases.
   */
  function renderLegend(legendElement, cases) {
    if (!legendElement) return;
    legendElement.innerHTML = '';
    const seen = new Set();
    let totalAllSlots = 0;
    cases.forEach((c) => {
      if (seen.has(c.id)) return;
      seen.add(c.id);
      const item = document.createElement('div');
      item.className = 'legend-item';
      const totalSlots = (c.schedule || []).length;
      totalAllSlots += totalSlots;
      const hoursStr = formatHoursFromSlots(totalSlots);
      item.innerHTML = `<span class="legend-swatch case-color-${c.colorIndex}"></span><span>${c.name} - #${c.patientId} (${hoursStr}h)</span>`;
      legendElement.appendChild(item);
    });
    // Append a total item across all visible cases
    const totalHoursStr = formatHoursFromSlots(totalAllSlots);
    const totalItem = document.createElement('div');
    totalItem.className = 'legend-item legend-total';
    totalItem.innerHTML = `<span>Total: ${totalHoursStr}h</span>`;
    legendElement.appendChild(totalItem);
  }
  Render.renderLegend = renderLegend;

})(window);
