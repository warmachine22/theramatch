(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Grid = TMS.Grid = TMS.Grid || {};

  /**
   * Grid builder for schedule views.
   * Responsible only for DOM construction of the time grid and wiring passed-in handlers.
   * It does NOT mutate application state.
   */
  const HEADERS_COUNT = 8; // Time + 7 days
  const START_MINUTES = 6 * 60; // Start at 6:00 AM
  const END_MINUTES = 24 * 60;  // End at 12:00 AM (midnight)

  /**
   * Generate the time grid from 6:00 to 24:00 with a given minutes-per-slot.
   * Keeps the existing header row (first 8 elements).
   *
   * Handlers:
   *  - onMouseDown(slotEl)
   *  - onMouseEnter(slotEl)
   *  - onMouseMove(slotEl)
   *  - onClick(slotEl)
   */
  function generateTimeSlots(gridElement, minutesPerSlot = 15, {
    isSearchGrid = false,
    onMouseDown,
    onMouseEnter,
    onMouseMove,
    onClick
  } = {}) {

    // Clear previous cells beyond header
    while (gridElement.children.length > HEADERS_COUNT) {
      gridElement.removeChild(gridElement.lastChild);
    }

    const totalMinutes = END_MINUTES - START_MINUTES;
    const numSlots = totalMinutes / minutesPerSlot;

    for (let i = 0; i < numSlots; i++) {
      const totalMinutesFromStart = START_MINUTES + (i * minutesPerSlot);
      const hours = Math.floor(totalMinutesFromStart / 60);
      const minutes = totalMinutesFromStart % 60;

      // Display formatting (12-hour)
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? '0' + minutes : '' + minutes;

      // Time column
      const timeCell = document.createElement('div');
      timeCell.classList.add('grid-cell');
      if (minutes === 0) timeCell.classList.add('hour-start');
      timeCell.textContent = `${displayHours}:${displayMinutes} ${ampm}`;
      gridElement.appendChild(timeCell);

      for (let j = 0; j < 7; j++) {
        const slotCell = document.createElement('div');
        slotCell.classList.add('grid-cell', 'time-slot');
        if (minutes === 0) slotCell.classList.add('hour-start');
        slotCell.dataset.day = j;
        slotCell.dataset.time = `${hours}:${displayMinutes}`;

        // Wire handlers if provided
        if (onMouseDown) {
          slotCell.addEventListener('mousedown', (e) => {
            const slot = e.target.closest('.time-slot');
            if (slot) onMouseDown(slot, e);
          });
        }
        if (onMouseEnter) {
          slotCell.addEventListener('mouseenter', (e) => {
            const slot = e.target.closest('.time-slot');
            if (slot) onMouseEnter(slot, e);
          });
        }
        if (onMouseMove) {
          slotCell.addEventListener('mousemove', (e) => {
            const slot = e.target.closest('.time-slot');
            if (slot) onMouseMove(slot, e);
          });
        }
        if (onClick) {
          slotCell.addEventListener('click', (e) => {
            const slot = e.target.closest('.time-slot');
            if (slot) onClick(slot, e);
          });
        }

        gridElement.appendChild(slotCell);
      }
    }
  }

  Grid.generateTimeSlots = generateTimeSlots;

})(window);
