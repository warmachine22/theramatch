(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const ScheduleUtils = TMS.ScheduleUtils = TMS.ScheduleUtils || {};

  /**
   * Build a Set of all 15-min slotIds scheduled across all cases for a therapist.
   * slotId format: "dayIndex-HH:MM"
   */
  function getTherapistScheduleSet(therapist) {
    const set = new Set();
    (therapist.cases || []).forEach((c) => {
      (c.schedule || []).forEach((s) => set.add(s.slotId));
    });
    return set;
  }

  /**
   * Compute break/travel time subslots as a Set of 15-min slotIds for the therapist.
   * - breakMins is clamped to [0, 120] and rounded to 15-min units.
   * - For each contiguous run per case/day, it allocates break subslots immediately
   *   after the run until limit or conflict (another scheduled slot in any case) or day end.
   * - inc is the display increment (15/30/60) but is not required here; breaks are 15-min units.
   */
  function computeBreakSet(therapist, breakMins, inc) {
    const set = new Set();
    let mins = parseInt(breakMins || 0, 10);
    if (!Number.isFinite(mins)) mins = 0;
    mins = Math.max(0, Math.min(120, mins));
    const slotsWanted = Math.round(mins / 15);
    if (slotsWanted <= 0) return set;

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
          let nextMin = toMin(lastStart) + 15;
          let added = 0;
          while (added < slotsWanted && nextMin < 24 * 60) {
            const hhmm = minToHHMM(nextMin);
            const slotId = `${dayStr}-${hhmm}`;
            if (schedSet.has(slotId)) break; // stop if collides with any scheduled slot
            set.add(slotId);
            nextMin += 15;
            added += 1;
          }
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

    return set;
  }

  // Expose API
  ScheduleUtils.getTherapistScheduleSet = getTherapistScheduleSet;
  ScheduleUtils.computeBreakSet = computeBreakSet;

})(window);
