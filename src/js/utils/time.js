(function (global) {
  // Create global namespace
  const TMS = global.TMS = global.TMS || {};
  const Time = TMS.Time = TMS.Time || {};

  /** Zero-pad to 2 digits */
  function pad2(n) { return (n < 10 ? '0' + n : '' + n); }
  Time.pad2 = pad2;

  /** Subtract minutes from an HH:MM 24h time string. Returns null if below 00:00. */
  function subtractMinutes(timeStr, minutes) {
    let parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let total = h * 60 + m - minutes;
    if (total < 0) return null;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${hh}:${pad2(mm)}`;
  }
  Time.subtractMinutes = subtractMinutes;

  /**
   * Convert an HH:MM 24h time string down to the display increment grid cell start.
   * Example: timeToDisplay('09:22', 15) -> '9:15'; timeToDisplay('09:22', 30) -> '9:00'
   */
  function timeToDisplay(timeStr, inc) {
    let parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    const floored = Math.floor(m / inc) * inc;
    return `${h}:${pad2(floored)}`;
  }
  Time.timeToDisplay = timeToDisplay;

  /** Get the previous display grid cell time by the given increment (HH:MM 24h). */
  function getPrevDisplayTime(displayTimeStr, inc) {
    return subtractMinutes(displayTimeStr, inc);
  }
  Time.getPrevDisplayTime = getPrevDisplayTime;

  /**
   * Return an array of HH:MM times at 15-minute resolution covered by a display cell
   * starting at displayTimeStr for the given increment (15, 30, 60).
   * Example: blockSubslots15('9:00', 60) -> ['9:00','9:15','9:30','9:45']
   */
  function blockSubslots15(displayTimeStr, inc) {
    const count = inc / 15;
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = i === 0 ? displayTimeStr : subtractMinutes(displayTimeStr, -i * 15); // add 15*i
      out.push(t);
    }
    return out;
  }
  Time.blockSubslots15 = blockSubslots15;

})(window);
