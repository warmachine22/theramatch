(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Store = TMS.Store = TMS.Store || {};
  const Time = TMS.Time;

  // --- Demo seed (therapists without schedules) ---
  let therapists = [
    {
      id: 'anya',
      firstName: 'Anya',
      lastName: 'Sharma',
      phone: '(555) 123-4567',
      email: 'anya.s@example.com',
      boroughPrefs: [],
      cases: [
        { id: 'anya-case1', name: 'Kid A', patientId: '001A', crossStreets: 'Sutphin Boulevard & 94th Avenue', city: 'Jamaica', state: 'NY', zip: '11435', schedule: [], colorIndex: 0 },
        { id: 'anya-case2', name: 'Kid B', patientId: '001B', crossStreets: '41st Avenue & Vernon Boulevard', city: 'Queens', state: 'NY', zip: '11101', schedule: [], colorIndex: 1 },
        { id: 'anya-case3', name: 'Kid C', patientId: '001C', crossStreets: '30th Avenue & 21st Street', city: 'Astoria', state: 'NY', zip: '11105', schedule: [], colorIndex: 2 }
      ]
    },
    {
      id: 'liam',
      firstName: 'Liam',
      lastName: 'Miller',
      phone: '(555) 987-6543',
      email: 'liam.m@example.com',
      boroughPrefs: [],
      cases: [
        { id: 'liam-case1', name: 'Kid D', patientId: '002A', crossStreets: 'Hillside Avenue & 186th Street', city: 'Hollis', state: 'NY', zip: '11423', schedule: [], colorIndex: 0 },
        { id: 'liam-case2', name: 'Kid E', patientId: '002B', crossStreets: 'Main Street & 58th Avenue', city: 'Flushing', state: 'NY', zip: '11355', schedule: [], colorIndex: 1 },
        { id: 'liam-case3', name: 'Kid F', patientId: '002C', crossStreets: 'Grand Street & Metropolitan Avenue', city: 'Maspeth', state: 'NY', zip: '11378', schedule: [], colorIndex: 2 }
      ]
    },
    {
      id: 'olivia',
      firstName: 'Olivia',
      lastName: 'Davis',
      phone: '(555) 234-5678',
      email: 'olivia.d@example.com',
      boroughPrefs: [],
      cases: [
        { id: 'olivia-case1', name: 'Kid G', patientId: '003A', crossStreets: 'Queens Boulevard & 74th Street', city: 'Elmhurst', state: 'NY', zip: '11373', schedule: [], colorIndex: 0 },
        { id: 'olivia-case2', name: 'Kid H', patientId: '003B', crossStreets: 'Jamaica Avenue & 114th Street', city: 'Richmond Hill', state: 'NY', zip: '11418', schedule: [], colorIndex: 1 },
        { id: 'olivia-case3', name: 'Kid I', patientId: '003C', crossStreets: 'Rockaway Boulevard & 132nd Street', city: 'South Ozone Park', state: 'NY', zip: '11420', schedule: [], colorIndex: 2 }
      ]
    },
    {
      id: 'noah',
      firstName: 'Noah',
      lastName: 'Wilson',
      phone: '(555) 345-6789',
      email: 'noah.w@example.com',
      boroughPrefs: [],
      cases: [
        { id: 'noah-case1', name: 'Kid J', patientId: '004A', crossStreets: 'Woodhaven Boulevard & 86th Avenue', city: 'Woodhaven', state: 'NY', zip: '11421', schedule: [], colorIndex: 0 },
        { id: 'noah-case2', name: 'Kid K', patientId: '004B', crossStreets: 'Kissena Boulevard & 45th Avenue', city: 'Flushing', state: 'NY', zip: '11355', schedule: [], colorIndex: 1 },
        { id: 'noah-case3', name: 'Kid L', patientId: '004C', crossStreets: 'Utopia Parkway & 168th Street', city: 'Flushing', state: 'NY', zip: '11358', schedule: [], colorIndex: 2 }
      ]
    },
    {
      id: 'emma',
      firstName: 'Emma',
      lastName: 'Taylor',
      phone: '(555) 456-7890',
      email: 'emma.t@example.com',
      boroughPrefs: [],
      cases: [
        { id: 'emma-case1', name: 'Kid M', patientId: '005A', crossStreets: 'Cross Bay Boulevard & 157th Avenue', city: 'Howard Beach', state: 'NY', zip: '11414', schedule: [], colorIndex: 0 },
        { id: 'emma-case2', name: 'Kid N', patientId: '005B', crossStreets: 'Francis Lewis Boulevard & 212th Street', city: 'Bayside', state: 'NY', zip: '11361', schedule: [], colorIndex: 1 },
        { id: 'emma-case3', name: 'Kid O', patientId: '005C', crossStreets: 'Union Turnpike & 195th Street', city: 'Fresh Meadows', state: 'NY', zip: '11366', schedule: [], colorIndex: 2 }
      ]
    }
  ];

  // --- Referrals state ---
  let referrals = [];

  // --- Demo schedule generation (15-minute base) ---
  function generateRealisticSchedule(caseScheduleArray, weeklyHoursOptions, dailyBlockOptions) {
    caseScheduleArray.length = 0;
    const weeklyHours = weeklyHoursOptions[Math.floor(Math.random() * weeklyHoursOptions.length)];
    let remainingHours = weeklyHours;
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    const selectedDays = [];
    while (remainingHours > 0 && selectedDays.length < daysOfWeek.length) {
      const availableDays = daysOfWeek.filter((d) => !selectedDays.includes(d));
      if (availableDays.length === 0) break;
      const dayIndex = availableDays[Math.floor(Math.random() * availableDays.length)];
      selectedDays.push(dayIndex);

      let dailyHours = dailyBlockOptions[Math.floor(Math.random() * dailyBlockOptions.length)];
      dailyHours = Math.min(dailyHours, remainingHours);
      if (dailyHours === 0) continue;
      remainingHours -= dailyHours;

      const totalPossibleStartSlots = (24 * 60 - 6 * 60 - dailyHours * 60) / 15;
      if (totalPossibleStartSlots < 0) continue;
      const startSlotOffset = Math.floor(Math.random() * totalPossibleStartSlots);
      const startTotalMinutes = 6 * 60 + startSlotOffset * 15;

      for (let i = 0; i < dailyHours * 4; i++) {
        const currentMinutes = startTotalMinutes + i * 15;
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        const slotId = `${dayIndex}-${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
        caseScheduleArray.push(slotId);
      }
    }
  }

  const specificWeeklyHours = [9];
  const specificDailyBlockOptions = [2, 3];

  function hydrateTotals() {
    therapists.forEach((t) => {
      const hours = (t.cases || []).reduce((sum, c) => sum + ((c.schedule || []).length / 4), 0);
      t.totalHours = Math.round(hours);
    });
  }
  Store.hydrateTotals = hydrateTotals;

  function seedDemoSchedules() {
    therapists.forEach((t) => {
      t.totalHours = 0;
      t.cases.forEach((c) => {
        generateRealisticSchedule(c.schedule, specificWeeklyHours, specificDailyBlockOptions);
        // normalize to objects with case info
        c.schedule = c.schedule.map((slotId) => ({
          slotId,
          caseId: c.id,
          caseName: c.name,
          colorIndex: c.colorIndex
        }));
      });
    });
    hydrateTotals();
  }

  // --- Persistence ---
  const LS_KEY = 'tms_state';

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ therapists, referrals }));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }
  Store.saveState = saveState;

  function loadStateIfAny() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.therapists)) return false;
      therapists = parsed.therapists;
      referrals = Array.isArray(parsed.referrals) ? parsed.referrals : [];
      hydrateTotals();
      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  }
  Store.loadStateIfAny = loadStateIfAny;

  // --- Public API ---
  function initState() {
    if (!loadStateIfAny()) {
      seedDemoSchedules();
      saveState();
    }
    return getTherapists();
  }
  Store.initState = initState;

  function getTherapists() { return therapists; }
  Store.getTherapists = getTherapists;

  function setTherapists(updater) {
    const next = typeof updater === 'function' ? updater(therapists) : updater;
    therapists = next;
    hydrateTotals();
    saveState();
    return therapists;
  }
  Store.setTherapists = setTherapists;

  function exportJSON() { return JSON.stringify({ therapists, referrals }, null, 2); }
  Store.exportJSON = exportJSON;

  function importJSON(obj) {
    if (!obj || !Array.isArray(obj.therapists)) {
      throw new Error('Invalid data format. Expected an object with a "therapists" array.');
    }
    therapists = obj.therapists;
    referrals = Array.isArray(obj.referrals) ? obj.referrals : [];
    hydrateTotals();
    saveState();
  }
  Store.importJSON = importJSON;

  function timestampedFilename(base) {
    base = base || 'therapists';
    const now = new Date();
    const fname = `${base}-${now.getFullYear()}${Time.pad2(now.getMonth() + 1)}${Time.pad2(now.getDate())}-${Time.pad2(now.getHours())}${Time.pad2(now.getMinutes())}${Time.pad2(now.getSeconds())}.json`;
    return fname;
  }
  Store.timestampedFilename = timestampedFilename;

  // --- Referrals API ---
  function getReferrals() { return referrals; }
  Store.getReferrals = getReferrals;

  function addReferral(ref) {
    // Enforce unique Child ID (case-insensitive)
    const norm = String((ref && ref.childId) || '').trim().toLowerCase();
    if (norm && referrals.some((r) => String((r.childId || '')).trim().toLowerCase() === norm)) {
      const err = new Error('DUPLICATE_CHILD_ID');
      err.code = 'DUPLICATE_CHILD_ID';
      throw err;
    }
    const now = Date.now();
    const withMeta = { ...ref, createdAt: now, updatedAt: now };
    referrals = [withMeta, ...referrals];
    saveState();
    return referrals;
  }
  Store.addReferral = addReferral;

  function updateReferral(id, patch) {
    const now = Date.now();
    const current = referrals.find((r) => r.id === id);
    if (!current) return referrals;
    const nextChildId = patch.hasOwnProperty('childId') ? patch.childId : current.childId;
    const norm = String(nextChildId || '').trim().toLowerCase();
    if (norm && referrals.some((r) => r.id !== id && String((r.childId || '')).trim().toLowerCase() === norm)) {
      const err = new Error('DUPLICATE_CHILD_ID');
      err.code = 'DUPLICATE_CHILD_ID';
      throw err;
    }
    referrals = referrals.map((r) => r.id === id ? { ...r, ...patch, updatedAt: now } : r);
    saveState();
    return referrals;
  }
  Store.updateReferral = updateReferral;

  function deleteReferral(id) {
    referrals = referrals.filter((r) => r.id !== id);
    saveState();
    return referrals;
  }
  Store.deleteReferral = deleteReferral;

  function findReferral(id) {
    return referrals.find((r) => r.id === id);
  }
  Store.findReferral = findReferral;

  // Find referral by Child ID (case-insensitive)
  function findReferralByChildId(childId) {
    const norm = String(childId || '').trim().toLowerCase();
    if (!norm) return undefined;
    return referrals.find((r) => String((r.childId || '')).trim().toLowerCase() === norm);
  }
  Store.findReferralByChildId = findReferralByChildId;

})(window);
