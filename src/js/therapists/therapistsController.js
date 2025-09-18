(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Therapists = TMS.Therapists = TMS.Therapists || {};

  const Store = TMS.Store;
  const StringUtil = TMS.String;

  // DOM helpers
  const $ = (id) => document.getElementById(id);
  const refs = () => ({
    listBody: $('therapist-list-body'),
    dropdown: $('therapist-select-dropdown'),
    // Filter group
    boroughFilterGroup: $('borough-filter-group'),
    // Add form
    addBtn: $('add-new-therapist-button'),
    addForm: $('add-therapist-form'),
    saveBtn: $('save-therapist-button'),
    firstName: $('new-therapist-first-name'),
    lastName: $('new-therapist-last-name'),
    email: $('new-therapist-email'),
    phone: $('new-therapist-phone'),
    requiredHours: $('new-therapist-required-hours'),
    boroughPrefsGroup: $('borough-prefs-group')
  });

  function getActiveBoroughFilters() {
    const r = refs();
    const group = r.boroughFilterGroup;
    if (!group) return [];
    return Array.from(group.querySelectorAll('input[name="borough-filter"]:checked')).map((el) => el.value);
  }

  function getAllTherapists() {
    return Store.getTherapists() || [];
  }

  function populateTherapistSelectDropdown() {
    const r = refs();
    if (!r.dropdown) return;
    const therapists = getAllTherapists();
    r.dropdown.innerHTML = '<option value="">Select Therapist...</option>';
    const sorted = [...therapists].sort((a, b) => (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`));
    sorted.forEach((t) => {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = `Dr. ${t.firstName} ${t.lastName}`;
      r.dropdown.appendChild(option);
    });
  }

  function refreshList() {
    const r = refs();
    if (!r.listBody) return;
    const therapists = getAllTherapists();
    const activeFilters = getActiveBoroughFilters();

    r.listBody.innerHTML = '';
    const list = activeFilters.length === 0
      ? therapists
      : therapists.filter((t) => (t.boroughPrefs || []).some((b) => activeFilters.includes(b)));

    // Helper to close open editors
    const closeAllEditRows = () => {
      r.listBody.querySelectorAll('.therapist-edit-row').forEach((tr) => (tr.style.display = 'none'));
    };

    list.forEach((t) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.firstName || ''}</td>
        <td>${t.lastName || ''}</td>
        <td>${t.phone || ''}</td>
        <td>${t.email || ''}</td>
        <td>${t.requiredHours ?? 0} hrs</td>
        <td>${t.totalHours ?? 0} hrs</td>
        <td>
          <button class="view-schedule-btn" data-therapist-id="${t.id}">View Schedule</button>
          <button class="edit-button" data-therapist-id="${t.id}">View/Edit</button>
        </td>
      `;
      r.listBody.appendChild(row);

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
              <input type="number" class="edit-required-hours" value="${t.requiredHours ?? 0}" placeholder="Required Hours per Week" min="0" step="1">
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
      r.listBody.appendChild(editRow);

      // Wire view
      const viewBtn = row.querySelector('.view-schedule-btn');
      viewBtn.addEventListener('click', () => {
        const therapistId = viewBtn.dataset.therapistId;
        try {
          document.dispatchEvent(new CustomEvent('tms:viewSchedule', { detail: { therapistId } }));
        } catch (_) {}
      });

      // Wire edit panel open/close
      const editBtn = row.querySelector('.edit-button');
      editBtn.addEventListener('click', () => {
        const isOpen = editRow.style.display === 'table-row';
        closeAllEditRows();
        editRow.style.display = isOpen ? 'none' : 'table-row';
      });
      editRow.querySelector('.cancel-edit').addEventListener('click', () => {
        editRow.style.display = 'none';
      });

      // Wire save
      editRow.querySelector('.save-edit').addEventListener('click', () => {
        const first = editRow.querySelector('.edit-first').value.trim();
        const last = editRow.querySelector('.edit-last').value.trim();
        const email = editRow.querySelector('.edit-email').value.trim();
        const phone = editRow.querySelector('.edit-phone').value.trim();
        const requiredHours = Number(editRow.querySelector('.edit-required-hours')?.value || 0);
        const boroughPrefs = Array.from(editRow.querySelectorAll('.checkbox-group input[type="checkbox"]:checked')).map((el) => el.value);

        if (!first || !last) {
          alert('Please enter first and last name.');
          return;
        }

        Store.setTherapists((prev) =>
          prev.map((x) => x.id === t.id ? { ...x, firstName: first, lastName: last, email, phone, requiredHours, boroughPrefs } : x)
        );

        refreshList();
        try { document.dispatchEvent(new CustomEvent('tms:therapistsUpdated')); } catch (_) {}
      });
    });
  }

  function toggleAddForm() {
    const r = refs();
    if (r.addForm) {
      r.addForm.classList.toggle('expanded');
    }
  }

  function readBoroughPrefsFromAddForm() {
    const r = refs();
    const group = r.boroughPrefsGroup;
    if (!group) return [];
    return Array.from(group.querySelectorAll('input[name="borough-pref"]:checked')).map((el) => el.value);
  }

  function clearAddForm() {
    const r = refs();
    if (r.firstName) r.firstName.value = '';
    if (r.lastName) r.lastName.value = '';
    if (r.email) r.email.value = '';
    if (r.phone) r.phone.value = '';
    if (r.requiredHours) r.requiredHours.value = '';
    if (r.boroughPrefsGroup) {
      r.boroughPrefsGroup.querySelectorAll('input[name="borough-pref"]').forEach((el) => { el.checked = false; });
    }
  }

  function handleSaveTherapist() {
    const r = refs();
    const first = (r.firstName && r.firstName.value || '').trim();
    const last = (r.lastName && r.lastName.value || '').trim();
    const email = (r.email && r.email.value || '').trim();
    const phone = (r.phone && r.phone.value || '').trim();
    const requiredHours = Number(r.requiredHours && r.requiredHours.value || 0);

    if (!first || !last) {
      alert('Please enter first and last name.');
      return;
    }
    const baseId = StringUtil.slugify(`${first}-${last}`);
    let id = baseId;
    let counter = 1;
    const therapists = getAllTherapists();
    while (therapists.some((t) => t.id === id)) {
      id = `${baseId}-${counter++}`;
    }
    const boroughPrefs = readBoroughPrefsFromAddForm();
    const newTherapist = { id, firstName: first, lastName: last, phone, email, requiredHours, boroughPrefs, cases: [], totalHours: 0 };

    Store.setTherapists((prev) => [...prev, newTherapist]);

    populateTherapistSelectDropdown();
    refreshList();
    if (r.addForm) r.addForm.classList.remove('expanded');
    clearAddForm();

    // Select and notify for schedule viewing
    if (r.dropdown) r.dropdown.value = id;
    try {
      document.dispatchEvent(new CustomEvent('tms:viewSchedule', { detail: { therapistId: id } }));
      document.dispatchEvent(new CustomEvent('tms:therapistsUpdated'));
    } catch (_) {}
  }

  function init() {
    const r = refs();

    // Borough filter change -> refresh list
    if (r.boroughFilterGroup) {
      r.boroughFilterGroup.addEventListener('change', refreshList);
    }

    // Add therapist button toggles form
    if (r.addBtn) {
      r.addBtn.addEventListener('click', toggleAddForm);
    }

    // Save therapist handler
    if (r.saveBtn) {
      r.saveBtn.addEventListener('click', handleSaveTherapist);
    }

    // Keep dropdown/list in sync if other modules update therapists
    document.addEventListener('tms:therapistsUpdated', () => {
      populateTherapistSelectDropdown();
      refreshList();
    });

    // Initial paint
    populateTherapistSelectDropdown();
    refreshList();
  }

  // Public API
  Therapists.init = init;
  Therapists.refreshList = refreshList;
  Therapists.populateTherapistSelectDropdown = populateTherapistSelectDropdown;

})(window);
