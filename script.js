document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const activateTab = (tabId) => {
        tabs.forEach(button => {
            if (button.dataset.tab === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    };

    tabs.forEach(button => {
        button.addEventListener('click', () => {
            activateTab(button.dataset.tab);
        });
    });

    // Data Model for demonstration (seed). May be overridden by localStorage/import.
    let therapists = [
        {
            id: 'anya',
            firstName: 'Anya',
            lastName: 'Sharma',
            phone: '(555) 123-4567',
            email: 'anya.s@example.com',
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
            cases: [
                { id: 'emma-case1', name: 'Kid M', patientId: '005A', crossStreets: 'Cross Bay Boulevard & 157th Avenue', city: 'Howard Beach', state: 'NY', zip: '11414', schedule: [], colorIndex: 0 },
                { id: 'emma-case2', name: 'Kid N', patientId: '005B', crossStreets: 'Francis Lewis Boulevard & 212th Street', city: 'Bayside', state: 'NY', zip: '11361', schedule: [], colorIndex: 1 },
                { id: 'emma-case3', name: 'Kid O', patientId: '005C', crossStreets: 'Union Turnpike & 195th Street', city: 'Fresh Meadows', state: 'NY', zip: '11366', schedule: [], colorIndex: 2 }
            ]
        }
    ];

    // Generate demo schedules (15-minute base granularity)
    const generateRealisticSchedule = (caseScheduleArray, weeklyHoursOptions, dailyBlockOptions) => {
        caseScheduleArray.length = 0;
        const weeklyHours = weeklyHoursOptions[Math.floor(Math.random() * weeklyHoursOptions.length)];
        let remainingHours = weeklyHours;
        const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
        const selectedDays = [];
        while (remainingHours > 0 && selectedDays.length < daysOfWeek.length) {
            const availableDays = daysOfWeek.filter(day => !selectedDays.includes(day));
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
            const startTotalMinutes = (6 * 60) + (startSlotOffset * 15);
            for (let i = 0; i < dailyHours * 4; i++) {
                const currentMinutes = startTotalMinutes + (i * 15);
                const hours = Math.floor(currentMinutes / 60);
                const minutes = currentMinutes % 60;
                const slotId = `${dayIndex}-${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
                caseScheduleArray.push(slotId);
            }
        }
    };

    // For demo generation
    const specificWeeklyHours = [9];
    const specificDailyBlockOptions = [2, 3];

    // Compute demo schedules and totals
    therapists.forEach(therapist => {
        therapist.totalHours = 0;
        therapist.cases.forEach(clientCase => {
            generateRealisticSchedule(clientCase.schedule, specificWeeklyHours, specificDailyBlockOptions);
            therapist.totalHours += (clientCase.schedule.length / 4);
            clientCase.schedule = clientCase.schedule.map(slotId => ({
                slotId: slotId,
                caseId: clientCase.id,
                caseName: clientCase.name,
                colorIndex: clientCase.colorIndex
            }));
        });
        therapist.totalHours = Math.round(therapist.totalHours);
    });

    // Persistence helpers (localStorage + Export/Import)
    const hydrateTotals = () => {
        therapists.forEach(t => {
            const hours = (t.cases || []).reduce((sum, c) => sum + ((c.schedule || []).length / 4), 0);
            t.totalHours = Math.round(hours);
        });
    };
    const saveState = () => {
        try {
            localStorage.setItem('tms_state', JSON.stringify({ therapists }));
        } catch (e) {
            console.warn('Save failed:', e);
        }
    };
    const loadStateIfAny = () => {
        try {
            const raw = localStorage.getItem('tms_state');
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.therapists)) return false;
            therapists = parsed.therapists;
            hydrateTotals();
            return true;
        } catch (e) {
            console.warn('Load failed:', e);
            return false;
        }
    };
    // Load saved data if exists (overrides demo generation)
    loadStateIfAny();

    // DOM elements
    const addNewCaseButton = document.getElementById('add-new-case-button');
    const editChildButton = document.getElementById('edit-child-button');
    const newCaseForm = document.getElementById('new-case-form');
    const caseDropdown = document.getElementById('case-dropdown');
    const editBookingScheduleTitle = document.getElementById('edit-booking-schedule-title');
    const editBookingScheduleGrid = document.getElementById('edit-booking-schedule-grid');
    const currentTherapistDisplayName = document.getElementById('current-therapist-display-name');
    const therapistSelectDropdown = document.getElementById('therapist-select-dropdown');
    const casesLegend = document.getElementById('cases-legend');
    const toggleCompactEdit = document.getElementById('toggle-compact-edit');
    const toggleCompactSearch = document.getElementById('toggle-compact-search');
    const exportDataButton = document.getElementById('export-data-button');
    const importDataInput = document.getElementById('import-data-input');
    const incrementEdit = document.getElementById('increment-edit');
    const incrementSearch = document.getElementById('increment-search');

    const saveNewCaseButton = document.getElementById('save-new-case-button');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const crossStreetsInput = document.getElementById('cross-streets');
    const addressInput = document.getElementById('address');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const zipInput = document.getElementById('zip');
    const idNumberInput = document.getElementById('id-number');
    
    // DOM elements for Search tab
    const searchScheduleGrid = document.getElementById('search-schedule-grid');
    const searchScheduleTitle = document.getElementById('search-schedule-title');
    const searchButton = document.getElementById('search-button');
    const searchResultsList = document.getElementById('search-results-list');

    // Helpers for compact toggle
    const setCompactMode = (on) => {
        document.body.classList.toggle('compact-mode', on);
        if (toggleCompactEdit) toggleCompactEdit.checked = on;
        if (toggleCompactSearch) toggleCompactSearch.checked = on;
    };
    if (toggleCompactEdit) toggleCompactEdit.addEventListener('change', (e) => setCompactMode(e.target.checked));
    if (toggleCompactSearch) toggleCompactSearch.addEventListener('change', (e) => setCompactMode(e.target.checked));

    // Time helpers
    const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
    const subtractMinutes = (timeStr, minutes) => {
        let [h, m] = timeStr.split(':').map(v => parseInt(v, 10));
        let total = h * 60 + m - minutes;
        if (total < 0) return null;
        const hh = Math.floor(total / 60);
        const mm = total % 60;
        return `${hh}:${pad2(mm)}`;
    };
    const timeToDisplay = (timeStr, inc) => {
        let [h, m] = timeStr.split(':').map(v => parseInt(v, 10));
        const floored = Math.floor(m / inc) * inc;
        return `${h}:${pad2(floored)}`;
    };
    const getPrevDisplayTime = (displayTimeStr, inc) => subtractMinutes(displayTimeStr, inc);
    const getEditInc = () => {
        const v = parseInt((incrementEdit && incrementEdit.value) || '15', 10);
        return [15, 30, 60].includes(v) ? v : 15;
    };
    const getSearchInc = () => {
        const v = parseInt((incrementSearch && incrementSearch.value) || '15', 10);
        return [15, 30, 60].includes(v) ? v : 15;
    };
    const blockSubslots15 = (displayTimeStr, inc) => {
        // Returns array of 15-min time strings covered by the display cell starting at displayTimeStr
        const count = inc / 15;
        const out = [];
        for (let i = 0; i < count; i++) {
            const t = i === 0 ? displayTimeStr : subtractMinutes(displayTimeStr, -i * 15); // add 15*i
            out.push(t);
        }
        return out;
    };

    // Logic for search schedule drag-and-drop
    let isSearchDragging = false;
    let searchStartSlot = null;

    const handleSearchDragStart = (e) => {
        const slot = e.target.closest('.time-slot');
        if (slot) {
            isSearchDragging = true;
            searchStartSlot = slot;
            document.body.style.userSelect = 'none';
        }
    };

    const handleSearchDragOver = (e) => {
        const endSlot = e.target.closest('.time-slot');
        if (isSearchDragging && endSlot) {
            clearSearchHighlights();
            highlightSearchSlots(searchStartSlot, endSlot);
        }
    };

    const handleSearchDragEnd = () => {
        if (isSearchDragging) {
            const highlightedSlots = searchScheduleGrid.querySelectorAll('.dragging-highlight');
            const isRemoving = highlightedSlots[0] && highlightedSlots[0].classList.contains('selected');

            highlightedSlots.forEach(slot => {
                slot.classList.remove('dragging-highlight');
                if (isRemoving) {
                    slot.classList.remove('selected', 'search-availability-color');
                } else {
                    slot.classList.add('selected', 'search-availability-color');
                }
            });

            isSearchDragging = false;
            searchStartSlot = null;
            document.body.style.userSelect = '';
        }
    };

    const handleSearchSingleClick = (e) => {
        const clickedSlot = e.target.closest('.time-slot');
        if (clickedSlot) {
            clickedSlot.classList.toggle('selected');
            clickedSlot.classList.toggle('search-availability-color');
        }
    };
    
    const highlightSearchSlots = (start, end) => {
        const startDay = parseInt(start.dataset.day);
        const [sh, sm] = start.dataset.time.split(':').map(v => parseInt(v, 10));
        const startTotalMinutes = sh * 60 + sm;
        
        const endDay = parseInt(end.dataset.day);
        const [eh, em] = end.dataset.time.split(':').map(v => parseInt(v, 10));
        const endTotalMinutes = eh * 60 + em;
        
        const dayRange = [Math.min(startDay, endDay), Math.max(startDay, endDay)];
        const timeRange = [Math.min(startTotalMinutes, endTotalMinutes), Math.max(startTotalMinutes, endTotalMinutes)];
        
        searchScheduleGrid.querySelectorAll('.time-slot').forEach(slot => {
            const slotDay = parseInt(slot.dataset.day);
            const [h, m] = slot.dataset.time.split(':').map(v => parseInt(v, 10));
            const slotTime = h * 60 + m;
            if (slotDay >= dayRange[0] && slotDay <= dayRange[1] && slotTime >= timeRange[0] && slotTime <= timeRange[1]) {
                slot.classList.add('dragging-highlight');
            }
        });
    };
    
    const clearSearchHighlights = () => {
        searchScheduleGrid.querySelectorAll('.dragging-highlight').forEach(slot => {
            slot.classList.remove('dragging-highlight');
        });
    };
    
    // Add event listeners for the search grid
    searchScheduleGrid.addEventListener('mousedown', handleSearchDragStart);
    searchScheduleGrid.addEventListener('mousemove', handleSearchDragOver); // continuous highlight
    document.addEventListener('mouseup', handleSearchDragEnd); // end drag anywhere
    searchScheduleGrid.addEventListener('click', handleSearchSingleClick);

    addNewCaseButton.addEventListener('click', () => {
        newCaseForm.classList.add('expanded');
        clearCaseForm();
        clearScheduleGrid(editBookingScheduleGrid);
        editBookingScheduleTitle.textContent = 'Add New Case Schedule';
        caseDropdown.value = "";
        editChildButton.classList.add('disabled');
        editChildButton.disabled = true;
    });

    saveNewCaseButton.addEventListener('click', () => {
        alert("New child details and schedule would be saved here!");
        newCaseForm.classList.remove('expanded');
    });
    
    editChildButton.addEventListener('click', () => {
        const selectedCaseId = caseDropdown.value;
        if (!selectedCaseId || selectedCaseId === 'all') return;
        const selectedCase = currentSelectedTherapist.cases.find(c => c.id === selectedCaseId);
        if (selectedCase) {
            newCaseForm.classList.add('expanded');
            populateCaseForm(selectedCase);
        }
    });

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

    let currentSelectedTherapist = null; // currently viewed therapist

    const populateTherapistSelectDropdown = () => {
        therapistSelectDropdown.innerHTML = '<option value="">Select Therapist...</option>';
        const sortedTherapists = [...therapists].sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        sortedTherapists.forEach(therapist => {
            const option = document.createElement('option');
            option.value = therapist.id;
            option.textContent = `Dr. ${therapist.firstName} ${therapist.lastName}`;
            therapistSelectDropdown.appendChild(option);
        });
    };

    therapistSelectDropdown.addEventListener('change', () => {
        const selectedTherapistId = therapistSelectDropdown.value;
        if (selectedTherapistId) {
            const selectedTherapist = therapists.find(t => t.id === selectedTherapistId);
            if (selectedTherapist) {
                loadTherapistSchedule(selectedTherapist);
            }
        } else {
            currentTherapistDisplayName.textContent = 'Select a Therapist';
            caseDropdown.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
            editBookingScheduleTitle.textContent = 'Select a Case';
            clearScheduleGrid(editBookingScheduleGrid);
            editChildButton.classList.add('disabled');
            editChildButton.disabled = true;
            newCaseForm.classList.remove('expanded');
            renderLegend([]);
        }
    });

    const loadTherapistSchedule = (therapist) => {
        currentSelectedTherapist = therapist;
        currentTherapistDisplayName.textContent = `Dr. ${therapist.firstName} ${therapist.lastName}`;
        populateCaseDropdown(therapist);
        caseDropdown.value = "all";
        renderCombinedSchedule(therapist.cases);
        renderLegend(therapist.cases);
    };

    const populateCaseDropdown = (therapist) => {
        caseDropdown.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
        therapist.cases.forEach(clientCase => {
            const option = document.createElement('option');
            option.value = clientCase.id;
            option.textContent = `${clientCase.name} - #${clientCase.patientId}`;
            caseDropdown.appendChild(option);
        });
    };

    const clearScheduleGrid = (gridElement) => {
        gridElement.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected', 'search-availability-color', 'block-start');
            for (let i = 0; i < 10; i++) {
                slot.classList.remove(`case-color-${i}`);
            }
            slot.innerHTML = '';
        });
    };

    // Build a set of display-level slotIds for a case given current display increment
    const buildDisplaySetForCase = (clientCase, inc) => {
        const set = new Set();
        (clientCase.schedule || []).forEach(s => {
            const [dayStr, timeStr] = s.slotId.split('-');
            const disp = timeToDisplay(timeStr, inc);
            set.add(`${dayStr}-${disp}`);
        });
        return set;
    };

    const renderSingleCaseSchedule = (gridElement, clientCase) => {
        clearScheduleGrid(gridElement);
        const inc = getEditInc();
        const displaySet = buildDisplaySetForCase(clientCase, inc);
        displaySet.forEach(slotId => {
            const [dayStr, timeStr] = slotId.split('-');
            const slot = gridElement.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${timeStr}"]`);
            if (!slot) return;
            slot.classList.add('selected', `case-color-${clientCase.colorIndex}`);
            const prev = getPrevDisplayTime(timeStr, inc);
            const isBlockStart = !prev || !displaySet.has(`${dayStr}-${prev}`);
            if (isBlockStart) {
                slot.classList.add('block-start');
                if (!slot.querySelector('.case-name-label')) {
                    slot.innerHTML = `<span class="case-name-label">${clientCase.name}</span>`;
                }
            }
        });
        editBookingScheduleTitle.textContent = `${clientCase.name} - #${clientCase.patientId}`;
        renderLegend([clientCase]);
    };

    const renderCombinedSchedule = (cases) => {
        clearScheduleGrid(editBookingScheduleGrid);
        const inc = getEditInc();
        const caseToDisplaySet = new Map();
        cases.forEach(c => caseToDisplaySet.set(c.id, buildDisplaySetForCase(c, inc)));

        cases.forEach(clientCase => {
            const displaySet = caseToDisplaySet.get(clientCase.id);
            displaySet.forEach(slotId => {
                const [dayStr, timeStr] = slotId.split('-');
                const slot = editBookingScheduleGrid.querySelector(`.time-slot[data-day="${dayStr}"][data-time="${timeStr}"]`);
                if (!slot) return;
                slot.classList.add('selected', `case-color-${clientCase.colorIndex}`);
                const prev = getPrevDisplayTime(timeStr, inc);
                const isBlockStart = !prev || !displaySet.has(`${dayStr}-${prev}`);
                if (isBlockStart && !slot.querySelector('.case-name-label')) {
                    slot.classList.add('block-start');
                    slot.innerHTML = `<span class="case-name-label">${clientCase.name}</span>`;
                }
            });
        });
        editBookingScheduleTitle.textContent = 'All Cases Combined';
    };

    const renderLegend = (cases) => {
        if (!casesLegend) return;
        casesLegend.innerHTML = '';
        const seen = new Set();
        cases.forEach(c => {
            if (seen.has(c.id)) return;
            seen.add(c.id);
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `<span class="legend-swatch case-color-${c.colorIndex}"></span><span>${c.name} - #${c.patientId}</span>`;
            casesLegend.appendChild(item);
        });
    };

    caseDropdown.addEventListener('change', () => {
        const selectedCaseId = caseDropdown.value;
        if (!currentSelectedTherapist) return;
        if (selectedCaseId === 'all') {
            renderCombinedSchedule(currentSelectedTherapist.cases);
            renderLegend(currentSelectedTherapist.cases);
            editChildButton.classList.add('disabled');
            editChildButton.disabled = true;
            newCaseForm.classList.remove('expanded');
            clearCaseForm();
        } else if (selectedCaseId) {
            const selectedCase = currentSelectedTherapist.cases.find(c => c.id === selectedCaseId);
            if (selectedCase) {
                renderSingleCaseSchedule(editBookingScheduleGrid, selectedCase);
                editChildButton.classList.remove('disabled');
                editChildButton.disabled = false;
                newCaseForm.classList.remove('expanded');
                clearCaseForm();
            }
        } else {
            editBookingScheduleTitle.textContent = 'Select a Case';
            clearScheduleGrid(editBookingScheduleGrid);
            renderLegend([]);
            editChildButton.classList.add('disabled');
            editChildButton.disabled = true;
            newCaseForm.classList.remove('expanded');
            clearCaseForm();
        }
    });

    // Drag-and-drop and single-click for editing
    let isDragging = false;
    let startSlot = null;
    let currentCase = null;
    
    const getSelectedCase = () => {
        const selectedCaseId = caseDropdown.value;
        if (selectedCaseId === 'all' || !selectedCaseId) {
            alert("Please select a specific case to edit.");
            return null;
        }
        return currentSelectedTherapist.cases.find(c => c.id === selectedCaseId);
    };

    const handleDragStart = (e) => {
        if (e.target.classList.contains('time-slot')) {
            currentCase = getSelectedCase();
            if (!currentCase) return;
            isDragging = true;
            startSlot = e.target;
            startSlot.classList.add('dragging-highlight');
            document.body.style.userSelect = 'none';
        }
    };
    
    const handleDragOver = (e) => {
        if (isDragging && e.target.classList.contains('time-slot')) {
            editBookingScheduleGrid.querySelectorAll('.dragging-highlight').forEach(slot => {
                slot.classList.remove('dragging-highlight');
            });
            const endSlot = e.target;
            const startDay = parseInt(startSlot.dataset.day);
            const [sh, sm] = startSlot.dataset.time.split(':').map(v => parseInt(v, 10));
            const startTotalMinutes = sh * 60 + sm;
            const endDay = parseInt(endSlot.dataset.day);
            const [eh, em] = endSlot.dataset.time.split(':').map(v => parseInt(v, 10));
            const endTotalMinutes = eh * 60 + em;
            const dayRange = [Math.min(startDay, endDay), Math.max(startDay, endDay)];
            const timeRange = [Math.min(startTotalMinutes, endTotalMinutes), Math.max(startTotalMinutes, endTotalMinutes)];
            editBookingScheduleGrid.querySelectorAll('.time-slot').forEach(slot => {
                const slotDay = parseInt(slot.dataset.day);
                const [h, m] = slot.dataset.time.split(':').map(v => parseInt(v, 10));
                const slotTime = h * 60 + m;
                if (slotDay >= dayRange[0] && slotDay <= dayRange[1] && slotTime >= timeRange[0] && slotTime <= timeRange[1]) {
                    slot.classList.add('dragging-highlight');
                }
            });
        }
    };

    const applyEditForDisplaySlot = (slotEl, currentCase) => {
        const inc = getEditInc();
        const day = slotEl.dataset.day;
        const displayTime = slotEl.dataset.time;
        // Underlying 15-min subslots in this display cell
        const subTimes = blockSubslots15(displayTime, inc);
        const subSlotIds = subTimes.map(t => `${day}-${t}`);
        const allPresent = subSlotIds.every(id => currentCase.schedule.some(s => s.slotId === id));
        const allCasesExceptCurrent = currentSelectedTherapist.cases.filter(c => c.id !== currentCase.id);
        if (allPresent) {
            // remove all
            subSlotIds.forEach(id => {
                const idx = currentCase.schedule.findIndex(s => s.slotId === id);
                if (idx !== -1) currentCase.schedule.splice(idx, 1);
            });
        } else {
            // add all missing; check overlap
            // Overlap if any other case has any of these subslots
            const hasOverlap = allCasesExceptCurrent.some(oc => oc.schedule.some(s => subSlotIds.includes(s.slotId)));
            if (hasOverlap) {
                alert("Cannot add. One or more 15-minute segments in this block are already booked for another case.");
                return;
            }
            subSlotIds.forEach(id => {
                if (!currentCase.schedule.some(s => s.slotId === id)) {
                    currentCase.schedule.push({
                        slotId: id,
                        caseId: currentCase.id,
                        caseName: currentCase.name,
                        colorIndex: currentCase.colorIndex
                    });
                }
            });
        }
    };

    const handleDragEnd = (e) => {
        if (isDragging) {
            const highlightedSlots = editBookingScheduleGrid.querySelectorAll('.dragging-highlight');
            if (highlightedSlots.length === 0) {
                handleSingleClick(e); // treat as click
                return;
            }
            highlightedSlots.forEach(slot => {
                applyEditForDisplaySlot(slot, currentCase);
            });
            // Update hours, persist, and re-render
            currentSelectedTherapist.totalHours = currentSelectedTherapist.cases.reduce((sum, c) => sum + (c.schedule.length / 4), 0);
            populateTherapistList();
            highlightedSlots.forEach(slot => slot.classList.remove('dragging-highlight'));
            isDragging = false;
            startSlot = null;
            document.body.style.userSelect = '';
            saveState();
            const selectedCaseId = caseDropdown.value;
            if (selectedCaseId === 'all') {
                renderCombinedSchedule(currentSelectedTherapist.cases);
                renderLegend(currentSelectedTherapist.cases);
            } else {
                const selectedCase = currentSelectedTherapist.cases.find(c => c.id === selectedCaseId);
                if (selectedCase) renderSingleCaseSchedule(editBookingScheduleGrid, selectedCase);
            }
        }
    };

    const handleSingleClick = (e) => {
        const clickedSlot = e.target.closest('.time-slot');
        if (!clickedSlot) return;
        currentCase = getSelectedCase();
        if (!currentCase) return;
        applyEditForDisplaySlot(clickedSlot, currentCase);
        currentSelectedTherapist.totalHours = currentSelectedTherapist.cases.reduce((sum, c) => sum + (c.schedule.length / 4), 0);
        populateTherapistList();
        saveState();
        const selectedCaseId = caseDropdown.value;
        if (selectedCaseId === 'all') {
            renderCombinedSchedule(currentSelectedTherapist.cases);
            renderLegend(currentSelectedTherapist.cases);
        } else {
            const selectedCase = currentSelectedTherapist.cases.find(c => c.id === selectedCaseId);
            if (selectedCase) renderSingleCaseSchedule(editBookingScheduleGrid, selectedCase);
        }
    };
    
    // Generate time slots function (parameterized by increment)
    const generateTimeSlots = (gridElement, isSearchGrid = false, minutesPerSlot = 15) => {
        // Clear existing slots before generating if not already headers
        while (gridElement.children.length > 8) {
            gridElement.removeChild(gridElement.lastChild);
        }
        const totalMinutes = (24 * 60) - (6 * 60); // 6 AM to 12 AM
        const numSlots = totalMinutes / minutesPerSlot;

        for (let i = 0; i < numSlots; i++) {
            const totalMinutesFromStart = (6 * 60) + (i * minutesPerSlot);
            const hours = Math.floor(totalMinutesFromStart / 60);
            const minutes = totalMinutesFromStart % 60;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes < 10 ? '0' + minutes : minutes;

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
                if (!isSearchGrid) {
                    slotCell.addEventListener('mousedown', handleDragStart);
                    slotCell.addEventListener('mouseenter', handleDragOver);
                    slotCell.addEventListener('click', handleSingleClick);
                }
                gridElement.appendChild(slotCell);
            }
        }
    };
    
    // Initialize time slots for both grids with current increments
    generateTimeSlots(editBookingScheduleGrid, false, getEditInc());
    generateTimeSlots(searchScheduleGrid, true, getSearchInc());
    
    // Global mouseup listener for edit booking grid
    document.addEventListener('mouseup', handleDragEnd);

    // Add Therapist Tab functionality
    const addNewTherapistButton = document.getElementById('add-new-therapist-button');
    const addTherapistForm = document.getElementById('add-therapist-form');
    const therapistListBody = document.getElementById('therapist-list-body');

    addNewTherapistButton.addEventListener('click', () => {
        addTherapistForm.classList.toggle('expanded');
    });

    const populateTherapistList = () => {
        therapistListBody.innerHTML = '';
        therapists.forEach(therapist => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${therapist.firstName}</td>
                <td>${therapist.lastName}</td>
                <td>${therapist.phone}</td>
                <td>${therapist.email}</td>
                <td>${therapist.totalHours} hrs</td>
                <td><button class="edit-button" data-therapist-id="${therapist.id}">View/Edit</button></td>
            `;
            therapistListBody.appendChild(row);
        });
        document.querySelectorAll('.therapist-list .edit-button').forEach(button => {
            button.addEventListener('click', () => {
                const therapistId = button.dataset.therapistId;
                const selectedTherapist = therapists.find(t => t.id === therapistId);
                if (selectedTherapist) {
                    loadTherapistSchedule(selectedTherapist);
                    therapistSelectDropdown.value = therapistId;
                    activateTab('edit-booking');
                }
            });
        });
    };

    populateTherapistSelectDropdown();
    populateTherapistList();

    // Export/Import handlers
    const downloadJSON = (data, filename) => {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };
    const pad = (n) => String(n).padStart(2, '0');

    if (exportDataButton) {
        exportDataButton.addEventListener('click', () => {
            const now = new Date();
            const fname = `therapists-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
            const dataStr = JSON.stringify({ therapists }, null, 2);
            downloadJSON(dataStr, fname);
        });
    }
    if (importDataInput) {
        importDataInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (!parsed || !Array.isArray(parsed.therapists)) {
                    alert('Invalid data format. Expected an object with a "therapists" array.');
                    e.target.value = '';
                    return;
                }
                therapists = parsed.therapists;
                hydrateTotals();
                saveState();
                // Re-render UI after import
                populateTherapistSelectDropdown();
                populateTherapistList();
                currentTherapistDisplayName.textContent = 'Select a Therapist';
                caseDropdown.innerHTML = '<option value="all">View All Cases</option><option value="">Select a case...</option>';
                editBookingScheduleTitle.textContent = 'Select a Case';
                clearScheduleGrid(editBookingScheduleGrid);
                renderLegend([]);
                newCaseForm.classList.remove('expanded');
                e.target.value = '';
            } catch (err) {
                console.error('Import failed:', err);
                alert('Failed to import data. Please ensure it is valid JSON.');
                e.target.value = '';
            }
        });
    }

    // Increment controls: re-generate grids and re-render when changed
    const rerenderEditGrid = () => {
        generateTimeSlots(editBookingScheduleGrid, false, getEditInc());
        const selectedCaseId = caseDropdown.value;
        if (!currentSelectedTherapist) return;
        if (selectedCaseId === 'all') {
            renderCombinedSchedule(currentSelectedTherapist.cases);
            renderLegend(currentSelectedTherapist.cases);
        } else if (selectedCaseId) {
            const selectedCase = currentSelectedTherapist.cases.find(c => c.id === selectedCaseId);
            if (selectedCase) renderSingleCaseSchedule(editBookingScheduleGrid, selectedCase);
        }
    };
    const rerenderSearchGrid = () => {
        generateTimeSlots(searchScheduleGrid, true, getSearchInc());
        // Clear any previous selections (simpler UX)
    };

    if (incrementEdit) incrementEdit.addEventListener('change', rerenderEditGrid);
    if (incrementSearch) incrementSearch.addEventListener('change', rerenderSearchGrid);

    // Search Tab functionality (placeholder logic unchanged)
    searchButton.addEventListener('click', () => {
        const selectedSlots = [];
        searchScheduleGrid.querySelectorAll('.time-slot.selected').forEach(slot => {
            selectedSlots.push({
                day: parseInt(slot.dataset.day),
                time: slot.dataset.time
            });
        });
        
        searchResultsList.innerHTML = `
            <li>Searching for therapists with availability at:</li>
            ${selectedSlots.map(slot => `<li>${slot.day} at ${slot.time}</li>`).join('')}
            <li>(Search algorithm to be implemented here)</li>
            <li>No results found for these exact slots in this demo.</li>
        `;
    });
}); // end DOMContentLoaded
