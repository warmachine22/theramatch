(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Seed = TMS.Seed = TMS.Seed || {};

  /**
   * Build the Queens-focused dataset (5 staffed therapists + 3 unstaffed referrals).
   * Returns { therapists, referrals } shaped for Store.importJSON.
   */
  function buildQueensDataset() {
    // Helper: generate 15-min slot IDs for given days between [start, end)
    const makeSlots = (days, startHHMM, endHHMM) => {
      const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const start = toMin(startHHMM), end = toMin(endHHMM);
      const out = [];
      days.forEach((d) => {
        for (let m = start; m < end; m += 15) {
          const h = Math.floor(m / 60), mm = m % 60;
          const hh = String(h).padStart(2, '0'), ss = String(mm).padStart(2, '0');
          out.push(`${d}-${hh}:${ss}`);
        }
      });
      return out;
    };

    // Staffed cases: 10h/wk each, Mon–Fri blocks
    const staffedDefs = [
      {
        t: { id: 'maya-singh', firstName: 'Maya', lastName: 'Singh', phone: '(718) 555-0101', email: 'maya.singh@example.com' },
        c: { id: 'maya-case1', name: 'Aiden Lopez', patientId: 'Q1001', crossStreets: 'Queens Blvd & 63rd Dr', city: 'Rego Park', state: 'NY', zip: '11374' },
        days: [1,2,3,4,5], start: '15:00', end: '17:00'
      },
      {
        t: { id: 'carlos-rivera', firstName: 'Carlos', lastName: 'Rivera', phone: '(718) 555-0102', email: 'carlos.rivera@example.com' },
        c: { id: 'carlos-case1', name: 'Liam Kim', patientId: 'Q1002', crossStreets: 'Broadway & 46th St', city: 'Astoria', state: 'NY', zip: '11103' },
        days: [1,2,3,4,5], start: '09:00', end: '11:00'
      },
      {
        t: { id: 'emily-chen', firstName: 'Emily', lastName: 'Chen', phone: '(718) 555-0103', email: 'emily.chen@example.com' },
        c: { id: 'emily-case1', name: 'Ella Martinez', patientId: 'Q1003', crossStreets: 'Northern Blvd & 150th St', city: 'Flushing', state: 'NY', zip: '11354' },
        days: [1,2,3,4,5], start: '13:00', end: '15:00'
      },
      {
        t: { id: 'jacob-cohen', firstName: 'Jacob', lastName: 'Cohen', phone: '(718) 555-0104', email: 'jacob.cohen@example.com' },
        c: { id: 'jacob-case1', name: 'Noah Johnson', patientId: 'Q1004', crossStreets: 'Jamaica Ave & 168th St', city: 'Jamaica', state: 'NY', zip: '11432' },
        days: [1,2,3,4,5], start: '10:00', end: '12:00'
      },
      {
        t: { id: 'sophia-patel', firstName: 'Sophia', lastName: 'Patel', phone: '(718) 555-0105', email: 'sophia.patel@example.com' },
        c: { id: 'sophia-case1', name: 'Mia Williams', patientId: 'Q1005', crossStreets: 'Queens Blvd & 46th St', city: 'Sunnyside', state: 'NY', zip: '11104' },
        days: [1,2,3,4,5], start: '14:00', end: '16:00'
      }
    ];

    const therapists = staffedDefs.map((def) => {
      const slots = makeSlots(def.days, def.start, def.end);
      const schedule = slots.map((slotId) => ({
        slotId,
        caseId: def.c.id,
        caseName: def.c.name,
        colorIndex: 0
      }));
      return {
        id: def.t.id,
        firstName: def.t.firstName,
        lastName: def.t.lastName,
        phone: def.t.phone,
        email: def.t.email,
        requiredHours: 25,
        boroughPrefs: ['Queens'],
        cases: [{
          id: def.c.id,
          name: def.c.name,
          patientId: def.c.patientId,
          crossStreets: def.c.crossStreets,
          city: def.c.city,
          state: def.c.state,
          zip: def.c.zip,
          schedule,
          colorIndex: 0
        }]
      };
    });

    // Referrals: 5 staffed (mirror the above) + 3 unstaffed with preferred availability
    const staffedReferrals = staffedDefs.map((def) => {
      const slots = makeSlots(def.days, def.start, def.end);
      return {
        id: `ref-${def.c.patientId}`,
        childName: def.c.name,
        childId: def.c.patientId,
        totalReferredHours: 10,
        maxDesiredPerDay: 2,
        status: 'staffed',
        crossStreets: def.c.crossStreets,
        city: def.c.city,
        state: def.c.state,
        zip: def.c.zip,
        preferredAvailability: slots
      };
    });

    // Unstaffed referrals in Queens with 5–7 hours preferred availability
    const unstaffed = [
      {
        id: 'ref-Q2001', childName: 'Oliver Garcia', childId: 'Q2001',
        crossStreets: 'Steinway St & 30th Ave', city: 'Astoria', state: 'NY', zip: '11103',
        blocks: [{ days: [1,2,3,4,5], start: '15:00', end: '16:00' }]
      },
      {
        id: 'ref-Q2002', childName: 'Ava Brown', childId: 'Q2002',
        crossStreets: 'Bell Blvd & 41st Ave', city: 'Bayside', state: 'NY', zip: '11361',
        blocks: [
          { days: [1,3,5], start: '14:00', end: '15:30' },
          { days: [2,4],   start: '09:00', end: '10:00' }
        ]
      },
      {
        id: 'ref-Q2003', childName: 'Ethan Davis', childId: 'Q2003',
        crossStreets: 'Metropolitan Ave & 69th St', city: 'Middle Village', state: 'NY', zip: '11379',
        blocks: [{ days: [1,2,3,4,5], start: '10:00', end: '11:15' }]
      }
    ];

    const referralsUnstaffed = unstaffed.map((u) => {
      let slots = [];
      u.blocks.forEach((b) => { slots = slots.concat(makeSlots(b.days, b.start, b.end)); });
      const totalHrs = slots.length / 4;
      return {
        id: u.id,
        childName: u.childName,
        childId: u.childId,
        totalReferredHours: Math.round(totalHrs * 100) / 100,
        maxDesiredPerDay: Math.round((totalHrs / 5) * 4) / 4,
        status: 'referred',
        crossStreets: u.crossStreets,
        city: u.city,
        state: u.state,
        zip: u.zip,
        preferredAvailability: slots
      };
    });

    const referrals = [...staffedReferrals, ...referralsUnstaffed];
    return { therapists, referrals };
  }

  /**
   * Apply one-time seed if not already applied.
   * Persists tag in localStorage to prevent re-seeding.
   */
  function applySeedQueens(Store) {
    const TAG = 'queens-v1';
    try {
      if (localStorage.getItem('tms_seed_tag') === TAG) return;
      const dataset = buildQueensDataset();
      if (dataset && Array.isArray(dataset.therapists) && Array.isArray(dataset.referrals)) {
        Store.importJSON(dataset);
        localStorage.setItem('tms_seed_tag', TAG);
      }
    } catch (e) {
      console.warn('Seed failed:', e);
    }
  }

  /**
   * Apply one-time migration: set requiredHours=25 for all therapists.
   */
  function applyRequiredHoursMigration(Store) {
    const TAG = 'required-hours-25';
    try {
      if (localStorage.getItem('tms_migration_tag') === TAG) return;
      Store.setTherapists((prev) => prev.map((t) => ({ ...t, requiredHours: 25 })));
      localStorage.setItem('tms_migration_tag', TAG);
    } catch (e) {
      console.warn('Migration failed:', e);
    }
  }

  Seed.buildQueensDataset = buildQueensDataset;
  Seed.applySeedQueens = applySeedQueens;
  Seed.applyRequiredHoursMigration = applyRequiredHoursMigration;

})(window);
