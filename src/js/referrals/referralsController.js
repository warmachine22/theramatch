(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Referrals = TMS.Referrals = TMS.Referrals || {};

  const Store = TMS.Store;
  const Grid = TMS.Grid;
  const Time = TMS.Time;

  // Shared option map used by Search tab to resolve "Child Name — #ID" -> referralId
  Referrals.optionMap = Referrals.optionMap || new Map();

  // Cached DOM refs (populated on init)
  let referralsListBody = null;
  let referralChildrenDatalist = null;

  // Hook to call Search loader from this module
  let loadToSearchHook = null;
  Referrals.setLoadToSearchHook = function (fn) { loadToSearchHook = typeof fn === 'function' ? fn : null; };

  // Public: initialize DOM references
  function init() {
    referralsListBody = document.getElementById('referrals-list-body');
    referralChildrenDatalist = document.getElementById('referral-children-list');
  }

  // Public: remove any unsaved draft rows
  function cleanupDraft() {
    if (!referralsListBody) return;
    referralsListBody.querySelectorAll('tr.new-referral-row').forEach((draftRow) => {
      const next = draftRow.nextElementSibling;
      try { referralsListBody.removeChild(draftRow); } catch (e) {}
      if (next && next.classList.contains('referral-edit-row')) {
        try { referralsListBody.removeChild(next); } catch (e) {}
      }
    });
  }

  // Utilities
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
  const slugify = (s) => TMS.String.slugify(s || '');

  // Public: rebuild the child datalist (Child Name — #ID) and update optionMap
  function buildChildDatalist() {
    if (!referralChildrenDatalist) referralChildrenDatalist = document.getElementById('referral-children-list');
    if (!referralChildrenDatalist) return;
    referralChildrenDatalist.innerHTML = '';
    Referrals.optionMap.clear();
    const refs = Store.getReferrals() || [];
    const sorted = [...refs].sort((a, b) => {
      const an = (a.childName || '').toLowerCase();
      const bn = (b.childName || '').toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      const aid = (a.childId || '').toLowerCase();
      const bid = (b.childId || '').toLowerCase();
      return aid.localeCompare(bid);
    });
    sorted.forEach((r) => {
      const name = (r.childName || '').trim();
      const cid = (r.childId || '').trim();
      if (!name && !cid) return;
      const display = cid ? `${name} — #${cid}` : name;
      const opt = document.createElement('option');
      opt.value = display;
      referralChildrenDatalist.appendChild(opt);
      Referrals.optionMap.set(display, r.id);
    });
  }

  // Public: rebuild assignment options for Edit Booking -> Assign from Referral
  function buildAssignOptions() {
    const sel = document.getElementById('referral-assign-select');
    if (!sel) return;
    const refs = Store.getReferrals() || [];
    const prev = sel.value;
    sel.innerHTML = '<option value="">Select child from referrals...</option>';
    const sorted = [...refs].sort((a, b) => {
      const an = (a.childName || '').toLowerCase();
      const bn = (b.childName || '').toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      const aid = (a.childId || '').toLowerCase();
      const bid = (b.childId || '').toLowerCase();
      return aid.localeCompare(bid);
    });
    sorted.forEach((r) => {
      const name = (r.childName || '').trim();
      const cid = (r.childId || '').trim();
      if (!name && !cid) return;
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = cid ? `${name} — #${cid}` : name;
      sel.appendChild(opt);
    });
    if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  }

  // Mini schedule builder (for preferred availability)
  function buildMiniSchedule(editRow, initialSet) {
    let refMiniInitialized = false;
    let prefSelectedSlots = new Set(initialSet || []);
    let isRefDragging = false;
    let refStartSlot = null;

    const incSelect = editRow.querySelector('.ref-inc');
    const miniGrid = editRow.querySelector('.ref-mini-grid');
    if (!incSelect || !miniGrid) {
      return { getSelection: () => sortSlotIds(Array.from(prefSelectedSlots)) };
    }

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
      if (allPresent) subSlotIds.forEach((id) => prefSelectedSlots.delete(id));
      else subSlotIds.forEach((id) => prefSelectedSlots.add(id));
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

    const build = () => {
      Grid.generateTimeSlots(miniGrid, getInc(), {
        isSearchGrid: true,
        onMouseDown: refHandleMouseDown,
        onMouseMove: refHandleMouseMove,
        onClick: (slot) => applyRefToggleForDisplaySlot(slot)
      });
      refRenderSelection();
    };

    incSelect.addEventListener('change', build);
    refMiniInitialized = true;
    build();

    return {
      getSelection: () => sortSlotIds(Array.from(prefSelectedSlots || []))
    };
  }

  // Public: render referrals list with inline editor
  function renderList() {
    if (!referralsListBody) referralsListBody = document.getElementById('referrals-list-body');
    if (!referralsListBody) return;

    const list = Store.getReferrals();
    referralsListBody.innerHTML = '';
    const openClass = 'referral-edit-row';

    list.forEach((r) => {
      cleanupDraft();

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

      // Mini schedule init for this row
      let mini = null;
      const ensureMini = () => {
        if (mini) return;
        mini = buildMiniSchedule(editRow, r.preferredAvailability || []);
      };

      // Wire actions
      const viewBtn = row.querySelector('.view-edit-ref');
      const findBtn = row.querySelector('.find-therapist-ref');
      const delBtn = row.querySelector('.delete-ref');
      const saveBtn = editRow.querySelector('.ref-save');
      const cancelBtn = editRow.querySelector('.ref-cancel');

      // Auto-default Max/Day = Total/5 unless user edits
      const totalInput = editRow.querySelector('.ref-edit-total');
      const maxDayInput = editRow.querySelector('.ref-edit-maxday');
      let refMaxPerDayDirty = false;
      if (maxDayInput && maxDayInput.value && Number(maxDayInput.value) > 0) {
        refMaxPerDayDirty = true;
      }
      if (totalInput && maxDayInput) {
        totalInput.addEventListener('input', () => {
          const val = Number(totalInput.value || 0);
          if (!refMaxPerDayDirty) maxDayInput.value = defaultMaxPerDayFromTotal(val);
        });
        maxDayInput.addEventListener('input', () => { refMaxPerDayDirty = true; });
      }

      viewBtn.addEventListener('click', () => {
        cleanupDraft();
        const isOpen = editRow.style.display === 'table-row';
        // close others
        referralsListBody.querySelectorAll(`tr.${openClass}`).forEach((e) => (e.style.display = 'none'));
        editRow.style.display = isOpen ? 'none' : 'table-row';
        if (!isOpen) ensureMini();
      });

      cancelBtn.addEventListener('click', () => {
        editRow.style.display = 'none';
      });

      findBtn.addEventListener('click', () => {
        cleanupDraft();
        const current = Store.findReferral(r.id);
        if (loadToSearchHook) loadToSearchHook(current || r);
      });

      delBtn.addEventListener('click', () => {
        cleanupDraft();
        if (!confirm('Delete this referral?')) return;
        Store.deleteReferral(r.id);
        renderList();
        buildChildDatalist();
        buildAssignOptions();
      });

      saveBtn.addEventListener('click', async () => {
        ensureMini();
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
          preferredAvailability: mini.getSelection()
        };
        // Validate address via geocoding (block save on failure)
        try {
          const coord = await TMS.Geo.geocodeAddressCached({
            address: '',
            crossStreets: patch.crossStreets,
            city: patch.city,
            state: patch.state,
            zip: patch.zip
          });
          patch.lat = coord.lat; patch.lon = coord.lon;
        } catch (e) {
          alert('Invalid address. Please correct Cross Streets/City/State/Zip before saving.');
          return;
        }
        try {
          Store.updateReferral(r.id, patch);
          renderList();
          buildChildDatalist();
          buildAssignOptions();
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
  }

  // Public: Inline "Add New Referral" creation
  function addNewReferralInline() {
    if (!referralsListBody) referralsListBody = document.getElementById('referrals-list-body');
    if (!referralsListBody) return;

    // Remove any existing unsaved draft first
    cleanupDraft();

    // Close any open inline editors
    referralsListBody.querySelectorAll('tr.referral-edit-row').forEach((e) => (e.style.display = 'none'));

    // Display row
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

    // Editor row
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

    if (referralsListBody.firstChild) {
      referralsListBody.insertBefore(row, referralsListBody.firstChild);
      referralsListBody.insertBefore(editRow, row.nextSibling);
    } else {
      referralsListBody.appendChild(row);
      referralsListBody.appendChild(editRow);
    }

    const mini = buildMiniSchedule(editRow, []);

    // Wire actions
    const saveBtn = editRow.querySelector('.ref-save');
    const cancelBtn = editRow.querySelector('.ref-cancel');

    // Auto-default Max/Day = Total/5 until user edits
    const totalInput = editRow.querySelector('.ref-edit-total');
    const maxDayInput = editRow.querySelector('.ref-edit-maxday');
    let refMaxPerDayDirty = false;
    if (totalInput && maxDayInput) {
      totalInput.addEventListener('input', () => {
        const val = Number(totalInput.value || 0);
        if (!refMaxPerDayDirty) maxDayInput.value = defaultMaxPerDayFromTotal(val);
      });
      maxDayInput.addEventListener('input', () => { refMaxPerDayDirty = true; });
    }

    cancelBtn.addEventListener('click', () => {
      try { referralsListBody.removeChild(editRow); } catch (e) {}
      try { referralsListBody.removeChild(row); } catch (e) {}
    });

    saveBtn.addEventListener('click', async () => {
      const childName = editRow.querySelector('.ref-edit-name').value.trim();
      const childId = editRow.querySelector('.ref-edit-id').value.trim();
      const totalReferredHours = Number(editRow.querySelector('.ref-edit-total').value || 0);
      const maxDesiredPerDay = Number(editRow.querySelector('.ref-edit-maxday').value || 0);
      const status = editRow.querySelector('.ref-edit-status').value;
      const crossStreets = editRow.querySelector('.ref-edit-cross').value.trim();
      const city = editRow.querySelector('.ref-edit-city').value.trim();
      const state = editRow.querySelector('.ref-edit-state').value.trim();
      const zip = editRow.querySelector('.ref-edit-zip').value.trim();

      // Required fields
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
        preferredAvailability: mini.getSelection()
      };

      // Validate address via geocoding
      try {
        const coord = await TMS.Geo.geocodeAddressCached({
          address: '',
          crossStreets,
          city,
          state,
          zip
        });
        ref.lat = coord.lat; ref.lon = coord.lon;
      } catch (e) {
        alert('Invalid address. Please correct Cross Streets/City/State/Zip before saving.');
        return;
      }

      try {
        Store.addReferral(ref);
        renderList();
        buildChildDatalist();
        buildAssignOptions();
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
  }

  Referrals.init = init;
  Referrals.cleanupDraft = cleanupDraft;
  Referrals.buildChildDatalist = buildChildDatalist;
  Referrals.buildAssignOptions = buildAssignOptions;
  Referrals.renderList = renderList;
  Referrals.addNewReferralInline = addNewReferralInline;

})(window);
