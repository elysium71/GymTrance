const registerForm = document.querySelector('#register-form');
const loginForm = document.querySelector('#login-form-element');
const loadDataButton = document.querySelector('#load-data-btn');
const logoutButton = document.querySelector('#logout-btn');
const addWorkoutForm = document.querySelector('#add-workout-form');
const messageBox = document.querySelector('#message-box');
const workoutList = document.querySelector('#workout-list');
const historyList = document.querySelector('#history-list');
const workoutDetailModalOverlay = document.querySelector('#workout-detail-modal-overlay');
const workoutDetailTitle = document.querySelector('#workout-detail-title');
const workoutDetailBody = document.querySelector('#workout-detail-body');
const closeWorkoutDetailButton = document.querySelector('#close-workout-detail-btn');
const setTypeModalOverlay = document.querySelector('#set-type-modal-overlay');
const closeSetTypeModalButton = document.querySelector('#close-set-type-modal-btn');
const removeSetActionButton = document.querySelector('#remove-set-action-btn');
const workoutActionModalOverlay = document.querySelector('#workout-action-modal-overlay');
const closeWorkoutActionModalButton = document.querySelector('#close-workout-action-modal-btn');
const deleteWorkoutActionButton = document.querySelector('#delete-workout-action-btn');

const openPresetModalButton = document.querySelector('#open-preset-modal-btn');
const closePresetModalButton = document.querySelector('#close-preset-modal-btn');
const presetModalOverlay = document.querySelector('#preset-modal-overlay');
const presetEquipmentSelect = document.querySelector('#preset-equipment-select');
const presetBodyPartSelect = document.querySelector('#preset-body-part-select');
const presetSearchInput = document.querySelector('#preset-search-input');
const presetWorkoutList = document.querySelector('#preset-workout-list');
const presetWorkoutIdInput = document.querySelector('#preset-workout-id');
const presetWorkoutNameInput = document.querySelector('#preset-workout-name');
const presetWorkoutEquipmentInput = document.querySelector('#preset-workout-equipment');
const presetWorkoutBodyPartsInput = document.querySelector('#preset-workout-body-parts');
const presetWorkoutPrimaryInput = document.querySelector('#preset-workout-primary-muscles');
const presetWorkoutSecondaryInput = document.querySelector('#preset-workout-secondary-muscles');

const customWorkoutInput = document.querySelector('#custom-workout-input');
const customEquipmentInput = document.querySelector('#custom-equipment-input');
const customBodyPartsInput = document.querySelector('#custom-body-parts-input');
const customPrimaryMusclesInput = document.querySelector('#custom-primary-muscles-input');
const customSecondaryMusclesInput = document.querySelector('#custom-secondary-muscles-input');
const addPresetButton = document.querySelector('#add-preset-btn');
const addCustomButton = document.querySelector('#add-custom-btn');
const finishWorkoutButton = document.querySelector('#finish-workout-btn');
const openStartWorkoutModalButton = document.querySelector('#open-start-workout-modal-btn');
const startWorkoutModalOverlay = document.querySelector('#start-workout-modal-overlay');
const closeStartWorkoutModalButton = document.querySelector('#close-start-workout-modal-btn');
const newRoutineChoiceButton = document.querySelector('#new-routine-choice-btn');
const routineBuilderModalOverlay = document.querySelector('#routine-builder-modal-overlay');
const closeRoutineBuilderModalButton = document.querySelector('#close-routine-builder-modal-btn');
const routineBuilderForm = document.querySelector('#routine-builder-form');
const routineNameInput = document.querySelector('#routine-name-input');
const routinePresetSearchInput = document.querySelector('#routine-preset-search-input');
const routinePresetList = document.querySelector('#routine-preset-list');
const routineExerciseList = document.querySelector('#routine-exercise-list');
const routineList = document.querySelector('#routine-list');
const routineFilterInput = document.querySelector('#routine-filter-input');
const makeRoutineFolderButton = document.querySelector('#make-routine-folder-btn');

const savedToken = localStorage.getItem('access_token');
let pendingSetContext = null;
let activeWorkoutActionId = null;
let savedRoutines = [];
let savedRoutineFolders = [];
const openRoutineFolderIds = new Set(['unfiled']);
let editingRoutineId = null;
let routineBuilderFolderId = null;

const SET_TYPE_META = {
    warmup: { code: 'W', label: 'Warm Up' },
    working: { code: '1', label: 'Working' },
    drop: { code: 'D', label: 'Drop' },
    failure: { code: 'F', label: 'Failure' }
};

function showMessage(message, type) {
    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;

    if (type === 'success') {
        messageBox.style.color = '#3ddc97';
    } else if (type === 'error') {
        messageBox.style.color = '#ff5f6d';
    } else {
        messageBox.style.color = '#f5f7fb';
    }
}

function parseMuscleInput(value) {
    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function formatMuscleList(muscles) {
    if (!Array.isArray(muscles) || muscles.length === 0) {
        return 'None listed';
    }

    return muscles.join(', ');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatTitleCase(value) {
    return String(value ?? '')
        .trim()
        .split(/\s+/)
        .map(word => word
            .split('-')
            .map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : '')
            .join('-'))
        .join(' ');
}

function autoResizeTextarea(textarea) {
    if (!textarea) {
        return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function updateWorkoutButtons() {
    if (addPresetButton) {
        const hasPresetSelection = Boolean(
            presetWorkoutIdInput &&
            String(presetWorkoutIdInput.value || '').trim()
        );
        addPresetButton.disabled = !hasPresetSelection;
    }

    if (addCustomButton && customWorkoutInput) {
        addCustomButton.disabled = !customWorkoutInput.value.trim();
    }
}

function filterPresetWorkouts() {
    if (!presetWorkoutList) {
        return;
    }

    const selectedEquipment = presetEquipmentSelect ? presetEquipmentSelect.value : '';
    const selectedBodyPart = presetBodyPartSelect ? presetBodyPartSelect.value : '';
    const searchTerm = presetSearchInput ? presetSearchInput.value.trim().toLowerCase() : '';
    const presetOptions = presetWorkoutList.querySelectorAll('.preset-workout-option');

    presetOptions.forEach(option => {
        const bodyParts = JSON.parse(option.dataset.bodyParts || '[]');
        const matchesEquipment = !selectedEquipment || option.dataset.equipment === selectedEquipment;
        const matchesBodyPart = !selectedBodyPart || bodyParts.includes(selectedBodyPart);
        const matchesSearch = !searchTerm || option.dataset.searchName.includes(searchTerm);

        if (matchesEquipment && matchesBodyPart && matchesSearch) {
            option.style.display = 'flex';
        } else {
            option.style.display = 'none';
        }
    });
}

function createWorkout(workout, equipment, bodyParts, primaryMuscles, secondaryMuscles, presetId = null) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch('http://127.0.0.1:5000/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            workout,
            equipment,
            body_parts: bodyParts,
            primary_muscles: primaryMuscles,
            secondary_muscles: secondaryMuscles,
            preset_id: presetId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Workout added successfully!', 'success');

            if (addWorkoutForm) {
                addWorkoutForm.reset();
            }

            if (presetWorkoutIdInput) {
                presetWorkoutIdInput.value = '';
            }
            if (presetWorkoutNameInput) {
                presetWorkoutNameInput.value = '';
            }
            if (presetWorkoutEquipmentInput) {
                presetWorkoutEquipmentInput.value = '';
            }
            if (presetWorkoutBodyPartsInput) {
                presetWorkoutBodyPartsInput.value = '';
            }
            if (presetWorkoutPrimaryInput) {
                presetWorkoutPrimaryInput.value = '';
            }
            if (presetWorkoutSecondaryInput) {
                presetWorkoutSecondaryInput.value = '';
            }
            if (presetModalOverlay) {
                presetModalOverlay.style.display = 'none';
            }

            updateWorkoutButtons();
            loadWorkouts();
        } else {
            showMessage(data.message || 'Failed to add workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Add workout error:', error);
        showMessage('Failed to add workout.', 'error');
    });
}

function renderWorkoutDetails(workout) {
    const equipment = workout.equipment || 'No equipment listed';
    const bodyParts = formatMuscleList(workout.bodyParts);
    const primary = formatMuscleList(workout.primaryMuscles);
    const secondary = formatMuscleList(workout.secondaryMuscles);

    return `
        <div class="workout-meta">
            <p><strong>Equipment:</strong> ${equipment}</p>
            <p><strong>Body Parts:</strong> ${bodyParts}</p>
            <p><strong>Primary:</strong> ${primary}</p>
            <p><strong>Secondary:</strong> ${secondary}</p>
        </div>
    `;
}

function renderWorkoutExpandedDetails(workout) {
    const hasGif = Boolean(workout.gifUrl);
    const instructions = Array.isArray(workout.instructions) ? workout.instructions : [];
    const hasInstructions = instructions.length > 0;

    if (!hasGif && !hasInstructions) {
        return '';
    }

    const instructionItems = hasInstructions
        ? instructions.map(step => {
            const cleanStep = String(step).replace(/^Step:?\s*\d+\s*/i, '').trim();
            return `<li>${escapeHtml(cleanStep || step)}</li>`;
        }).join('')
        : '<li>No instructions available.</li>';

    return `
        <div class="workout-detail-panel">
            ${hasGif ? `
                <div class="workout-detail-media">
                    <img
                        src="${escapeHtml(workout.gifUrl)}"
                        data-gif-src="${escapeHtml(workout.gifUrl)}"
                        data-still-src="/exercise-thumbnail/${encodeURIComponent(workout.exerciseId || '')}"
                        alt="${escapeHtml(formatTitleCase(workout.workout))} demonstration"
                        class="workout-detail-gif"
                        loading="lazy">
                    <button type="button" class="workout-detail-pause" aria-label="Pause demonstration" data-paused="false">II</button>
                </div>
            ` : ''}
            <div class="workout-detail-copy">
                <h2>${escapeHtml(formatTitleCase(workout.workout || 'Workout Detail'))}</h2>
                <ol class="workout-detail-steps">
                    ${instructionItems}
                </ol>
            </div>
        </div>
    `;
}

function getSetTypeMeta(setType) {
    return SET_TYPE_META[setType] || SET_TYPE_META.working;
}

function refreshSetRows(setList) {
    if (!setList) {
        return;
    }

    let workingCount = 0;
    Array.from(setList.querySelectorAll('.set-row')).forEach(row => {
        const setType = row.dataset.setType || 'working';
        const typeButton = row.querySelector('.set-type-trigger');
        const typeBadge = row.querySelector('.set-type-badge');
        const doneButton = row.querySelector('.set-done-btn');
        const meta = getSetTypeMeta(setType);

        let labelText = meta.code;
        if (setType === 'working') {
            workingCount += 1;
            labelText = String(workingCount);
        }

        if (typeButton) {
            typeButton.textContent = labelText;
            typeButton.className = `set-type-trigger is-${setType}`;
        }

        if (typeBadge) {
            typeBadge.textContent = labelText;
            typeBadge.className = `set-type-badge is-${setType}`;
        }

        if (doneButton) {
            const isDone = row.dataset.done === 'true';
            doneButton.classList.toggle('is-done', isDone);
            doneButton.innerHTML = isDone ? '&#10003;' : '&#9675;';
        }
    });
}

function collectSetDetails(workoutId) {
    const rows = Array.from(document.querySelectorAll(`.set-list[data-id="${workoutId}"] .set-row`));
    const setDetails = [];

    for (const row of rows) {
        const repsInput = row.querySelector(`.reps-field[data-id="${workoutId}"]`);
        const kgInput = row.querySelector(`.kg-field[data-id="${workoutId}"]`);
        const reps = Number(repsInput ? repsInput.value : 0);
        const kg = kgInput && kgInput.value ? Number(kgInput.value) : 0;

        if (!reps || reps <= 0) {
            return null;
        }

        setDetails.push({
            reps,
            kg,
            set_type: row.dataset.setType || 'working',
            done: row.dataset.done === 'true'
        });
    }

    return setDetails;
}

function openWorkoutDetailModal(workout) {
    if (!workoutDetailModalOverlay || !workoutDetailBody || !workoutDetailTitle) {
        return;
    }

    workoutDetailTitle.textContent = formatTitleCase(workout.workout || 'Workout Detail');
    workoutDetailBody.innerHTML = renderWorkoutExpandedDetails(workout);
    const pauseButton = workoutDetailBody.querySelector('.workout-detail-pause');
    const detailImage = workoutDetailBody.querySelector('.workout-detail-gif');

    if (pauseButton && detailImage) {
        pauseButton.addEventListener('click', function () {
            const isPaused = pauseButton.dataset.paused === 'true';
            pauseButton.dataset.paused = isPaused ? 'false' : 'true';
            pauseButton.textContent = isPaused ? 'II' : '';
            pauseButton.classList.toggle('is-paused', !isPaused);
            pauseButton.setAttribute('aria-label', isPaused ? 'Pause demonstration' : 'Play demonstration');
            detailImage.src = isPaused ? detailImage.dataset.gifSrc : detailImage.dataset.stillSrc;
        });
    }
    workoutDetailModalOverlay.style.display = 'flex';
}

function closeWorkoutDetailModal() {
    if (!workoutDetailModalOverlay || !workoutDetailBody || !workoutDetailTitle) {
        return;
    }

    workoutDetailModalOverlay.style.display = 'none';
    workoutDetailTitle.textContent = 'Workout Detail';
    workoutDetailBody.innerHTML = '';
}

function renderWorkouts(workouts) {
    if (!workoutList) {
        return;
    }

    if (!workouts || workouts.length === 0) {
        closeWorkoutDetailModal();
        workoutList.innerHTML = '<p class="empty-state">No workouts found. Add your first one and start building your streak.</p>';
        return;
    }

    const workoutHtml = workouts.map(workout => {
        const setEntries = Array.isArray(workout.set_details) && workout.set_details.length > 0
            ? workout.set_details
            : [{ reps: '', kg: '', set_type: 'working', done: false }];

        const setRows = setEntries.map((setEntry, index) => {
            const setType = setEntry.set_type || 'working';
            const setTypeMeta = getSetTypeMeta(setType);
            const previousValue = setEntry.reps
                ? `${setEntry.kg || 0} kg x ${setEntry.reps}`
                : '-';
            const hasRepRange = Number(workout.routine_rep_min) > 0 && Number(workout.routine_rep_max) > 0;
            const repRangeText = hasRepRange
                ? (
                    Number(workout.routine_rep_min) === Number(workout.routine_rep_max)
                        ? `${workout.routine_rep_min}`
                        : `${workout.routine_rep_min}-${workout.routine_rep_max}`
                )
                : '';

            return `
                <div class="set-row set-row-modern" data-set-type="${setType}" data-done="${setEntry.done ? 'true' : 'false'}">
                    <div class="set-cell set-cell-label">
                        <button type="button" class="set-type-trigger is-${setType}" data-id="${workout.id}">${setType === 'working' ? index + 1 : setTypeMeta.code}</button>
                    </div>
                    <div class="set-cell set-cell-previous">${escapeHtml(previousValue)}</div>
                    <input
                        type="number"
                        class="kg-field"
                        data-id="${workout.id}"
                        placeholder="KG"
                        min="0"
                        value="${setEntry.kg || ''}">
                    <label class="rep-entry-field">
                        ${hasRepRange ? `<span class="rep-range-hint">${escapeHtml(repRangeText)}</span>` : ''}
                        <input
                            type="number"
                            class="reps-field"
                            data-id="${workout.id}"
                            placeholder="Reps"
                            min="1"
                            value="${setEntry.reps || ''}">
                    </label>
                    <button type="button" class="set-done-btn${setEntry.done ? ' is-done' : ''}" data-id="${workout.id}">${setEntry.done ? '&#10003;' : '&#9675;'}</button>
                </div>
            `;
        }).join('');

        const thumbnailHtml = workout.exerciseId
            ? `
                <div class="current-workout-media">
                    <img
                        src="/exercise-thumbnail/${encodeURIComponent(workout.exerciseId)}"
                        alt="${escapeHtml(formatTitleCase(workout.workout))} thumbnail"
                        class="current-workout-thumb"
                        loading="lazy">
                </div>
            `
            : '';
        const completedClass = workout.completed ? ' is-completed' : '';

        return `
            <article class="workout-card workout-card-sheet${completedClass}">
                <div class="current-workout-layout">
                    ${thumbnailHtml}
                    <div class="current-workout-main">
                        <div class="workout-card-header">
                            <div class="workout-heading-block">
                                <h3 class="workout-title">${escapeHtml(formatTitleCase(workout.workout))}</h3>
                                <textarea class="workout-notes-input" data-id="${workout.id}" placeholder="Add notes here...">${escapeHtml(workout.notes || '')}</textarea>
                            </div>
                            <div class="workout-card-tools">
                                <span class="category-tag">${workout.equipment || 'Custom'}</span>
                                <button type="button" class="workout-menu-btn" data-id="${workout.id}" aria-label="Workout options">&#8942;</button>
                            </div>
                        </div>
                        ${(workout.gifUrl || (Array.isArray(workout.instructions) && workout.instructions.length > 0)) ? `
                            <button
                                type="button"
                                class="toggle-detail-btn"
                                data-id="${workout.id}">
                                Show Details
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="strength-editor" data-id="${workout.id}">
                    <div class="set-table-head">
                        <span>Set</span>
                        <span>Previous</span>
                        <span>KG</span>
                        <span>Reps</span>
                        <span>Action</span>
                    </div>
                    <div class="set-list" data-id="${workout.id}">
                        ${setRows}
                    </div>
                    <div class="strength-actions">
                        <button type="button" class="add-set-btn" data-id="${workout.id}">Add Set</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    workoutList.innerHTML = workoutHtml;

    document.querySelectorAll('.add-set-btn').forEach(button => {
        button.addEventListener('click', function () {
            addSetRow(button.dataset.id, 'working');
        });
    });

    document.querySelectorAll('.set-type-trigger').forEach(button => {
        button.addEventListener('click', function () {
            const row = button.closest('.set-row');
            if (!row) {
                return;
            }
            openSetTypeModal(button.dataset.id, row);
        });
    });

    document.querySelectorAll('.set-done-btn').forEach(button => {
        button.addEventListener('click', function () {
            const workoutId = button.dataset.id;
            const row = button.closest('.set-row');
            if (!row) {
                return;
            }

            const repsInput = row.querySelector(`.reps-field[data-id="${workoutId}"]`);
            if (!repsInput || Number(repsInput.value) <= 0) {
                showMessage('Enter reps before ticking the set done.', 'error');
                return;
            }

            row.dataset.done = row.dataset.done === 'true' ? 'false' : 'true';
            refreshSetRows(row.closest('.set-list'));

            const setDetails = collectSetDetails(workoutId);
            if (!setDetails) {
                showMessage('Enter reps for all sets before ticking done.', 'error');
                row.dataset.done = row.dataset.done === 'true' ? 'false' : 'true';
                refreshSetRows(row.closest('.set-list'));
                return;
            }

            const allDone = setDetails.length > 0 && setDetails.every(setItem => setItem.done);
            saveStrengthWorkout(workoutId, setDetails, allDone);
        });
    });

    document.querySelectorAll('.workout-menu-btn').forEach(button => {
        button.addEventListener('click', function () {
            openWorkoutActionModal(button.dataset.id);
        });
    });

    document.querySelectorAll('.workout-notes-input').forEach(input => {
        autoResizeTextarea(input);

        input.addEventListener('input', function () {
            autoResizeTextarea(input);
        });

        input.addEventListener('change', function () {
            const workoutId = input.dataset.id;
            const setDetails = collectSetDetails(workoutId) || [];
            saveStrengthWorkout(workoutId, setDetails, false, input.value);
        });
    });

    document.querySelectorAll('.toggle-detail-btn').forEach(button => {
        button.addEventListener('click', function () {
            const selectedWorkout = workouts.find(item => String(item.id) === button.dataset.id);
            if (!selectedWorkout) {
                return;
            }
            openWorkoutDetailModal(selectedWorkout);
        });
    });

    document.querySelectorAll('.set-list').forEach(refreshSetRows);
}

function loadWorkouts() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        renderWorkouts([]);
        return;
    }

    fetch('http://127.0.0.1:5000/data', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Workouts loaded successfully!', 'success');
            renderWorkouts(data.data);
        } else {
            showMessage(data.message || 'Failed to load workouts.', 'error');
            renderWorkouts([]);
        }
    })
    .catch(error => {
        console.error('Load workouts error:', error);
        showMessage('Failed to load workouts.', 'error');
        renderWorkouts([]);
    });
}

function deleteWorkout(workoutId) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch(`http://127.0.0.1:5000/data/${workoutId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Workout deleted successfully!', 'success');
            loadWorkouts();
        } else {
            showMessage(data.message || 'Failed to delete workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Delete workout error:', error);
        showMessage('Failed to delete workout.', 'error');
    });
}

function finishWorkout() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch('http://127.0.0.1:5000/finish-workout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Workout finished successfully!', 'success');
            loadWorkouts();
        } else {
            showMessage(data.message || 'Failed to finish workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Finish workout error:', error);
        showMessage('Failed to finish workout.', 'error');
    });
}

function saveStrengthWorkout(workoutId, setDetails, completed = false, notesOverride = null) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    if (!Array.isArray(setDetails)) {
        showMessage('Set details are invalid.', 'error');
        return;
    }

    const notesInput = document.querySelector(`.workout-notes-input[data-id="${workoutId}"]`);
    const body = {
        completed,
        notes: notesOverride !== null ? notesOverride : (notesInput ? notesInput.value : '')
    };
    if (setDetails.length > 0) {
        body.sets = setDetails.length;
        body.reps = setDetails.map(setItem => setItem.reps);
        body.set_details = setDetails;
    }

    fetch(`http://127.0.0.1:5000/data/${workoutId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage(completed ? 'Workout marked as done!' : 'Workout updated successfully!', 'success');
            loadWorkouts();
        } else {
            showMessage(data.message || 'Failed to update workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Save workout error:', error);
        showMessage('Failed to update workout.', 'error');
    });
}

function openSetTypeModal(workoutId, row = null) {
    if (!setTypeModalOverlay) {
        return;
    }

    pendingSetContext = { workoutId, row };
    if (removeSetActionButton) {
        removeSetActionButton.hidden = !row;
    }
    setTypeModalOverlay.style.display = 'flex';
}

function closeSetTypeModal() {
    if (!setTypeModalOverlay) {
        return;
    }

    pendingSetContext = null;
    setTypeModalOverlay.style.display = 'none';
}

function addSetRow(workoutId, setType = 'working') {
    const setList = document.querySelector(`.set-list[data-id="${workoutId}"]`);
    if (!setList) {
        return;
    }

    const nextSetNumber = setList.querySelectorAll('.set-row').length + 1;
    const setTypeMeta = getSetTypeMeta(setType);

    const row = document.createElement('div');
    row.className = 'set-row set-row-modern';
    row.dataset.setType = setType;
    row.dataset.done = 'false';
    row.innerHTML = `
        <div class="set-cell set-cell-label">
            <button type="button" class="set-type-trigger is-${setType}" data-id="${workoutId}">${setType === 'working' ? nextSetNumber : setTypeMeta.code}</button>
        </div>
        <div class="set-cell set-cell-previous">-</div>
        <input
            type="number"
            class="kg-field"
            data-id="${workoutId}"
            placeholder="KG"
            min="0">
        <label class="rep-entry-field">
            <input
                type="number"
                class="reps-field"
                data-id="${workoutId}"
                placeholder="Reps"
                min="1">
        </label>
        <button type="button" class="set-done-btn" data-id="${workoutId}">&#9675;</button>
    `;

    setList.appendChild(row);

    row.querySelector('.set-type-trigger').addEventListener('click', function () {
        openSetTypeModal(workoutId, row);
    });

    row.querySelector('.set-done-btn').addEventListener('click', function () {
        const repsInput = row.querySelector(`.reps-field[data-id="${workoutId}"]`);
        if (!repsInput || Number(repsInput.value) <= 0) {
            showMessage('Enter reps before ticking the set done.', 'error');
            return;
        }

        row.dataset.done = row.dataset.done === 'true' ? 'false' : 'true';
        refreshSetRows(setList);

        const setDetails = collectSetDetails(workoutId);
        if (!setDetails) {
            showMessage('Enter reps for all sets before ticking done.', 'error');
            row.dataset.done = row.dataset.done === 'true' ? 'false' : 'true';
            refreshSetRows(setList);
            return;
        }

        const allDone = setDetails.length > 0 && setDetails.every(setItem => setItem.done);
        saveStrengthWorkout(workoutId, setDetails, allDone);
    });

    refreshSetRows(setList);
}

function removeSetRow(row) {
    const setList = row ? row.closest('.set-list') : null;

    if (!row || !setList) {
        return;
    }

    const rows = setList.querySelectorAll('.set-row');
    if (rows.length === 1) {
        row.querySelector('.reps-field').value = '';
        row.querySelector('.kg-field').value = '';
        return;
    }

    row.remove();

    refreshSetRows(setList);
}

function openWorkoutActionModal(workoutId) {
    if (!workoutActionModalOverlay) {
        return;
    }

    activeWorkoutActionId = workoutId;
    workoutActionModalOverlay.style.display = 'flex';
}

function closeWorkoutActionModal() {
    if (!workoutActionModalOverlay) {
        return;
    }

    activeWorkoutActionId = null;
    workoutActionModalOverlay.style.display = 'none';
}

function openStartWorkoutModal() {
    if (startWorkoutModalOverlay) {
        startWorkoutModalOverlay.style.display = 'flex';
    }
}

function closeStartWorkoutModal() {
    if (startWorkoutModalOverlay) {
        startWorkoutModalOverlay.style.display = 'none';
    }
}

function openRoutineBuilderModal(routine = null, folderId = null) {
    if (!routineBuilderModalOverlay) {
        return;
    }

    closeStartWorkoutModal();
    editingRoutineId = routine ? routine.id : null;
    routineBuilderFolderId = routine ? (routine.folder_id || null) : folderId;

    if (routineNameInput) {
        routineNameInput.value = routine ? (routine.name || '') : '';
    }
    if (routineExerciseList) {
        routineExerciseList.innerHTML = '';
        if (routine && Array.isArray(routine.exercises)) {
            routine.exercises.forEach(exercise => {
                addRoutineExercise(exercise.preset_id, exercise.name, exercise);
            });
        }
    }

    routineBuilderModalOverlay.style.display = 'flex';
    if (routineNameInput) {
        routineNameInput.focus();
    }
}

function closeRoutineBuilderModal() {
    if (routineBuilderModalOverlay) {
        routineBuilderModalOverlay.style.display = 'none';
    }
    editingRoutineId = null;
    routineBuilderFolderId = null;
}

function filterRoutinePresets() {
    if (!routinePresetList) {
        return;
    }

    const searchTerm = routinePresetSearchInput ? routinePresetSearchInput.value.trim().toLowerCase() : '';
    routinePresetList.querySelectorAll('.routine-preset-option').forEach(option => {
        const matchesSearch = !searchTerm || option.dataset.searchName.includes(searchTerm);
        option.style.display = matchesSearch ? 'flex' : 'none';
    });
}

function addRoutineExercise(presetId, name, settings = null) {
    if (!routineExerciseList || !presetId || !name) {
        return;
    }

    const item = document.createElement('div');
    item.className = 'routine-exercise-item';
    item.dataset.presetId = presetId;
    item.innerHTML = `
        <div class="routine-exercise-title">
            <strong>${escapeHtml(name)}</strong>
            <button type="button" class="routine-remove-btn" aria-label="Remove exercise">X</button>
        </div>
        <div class="routine-exercise-controls">
            <label>
                <span>Sets</span>
                <input type="number" class="routine-sets-input" min="1" value="${settings?.sets || 3}">
            </label>
            <label>
                <span>Rep Min</span>
                <input type="number" class="routine-rep-min-input" min="1" value="${settings?.rep_min || 8}">
            </label>
            <label>
                <span>Rep Max</span>
                <input type="number" class="routine-rep-max-input" min="1" value="${settings?.rep_max || 12}">
            </label>
        </div>
    `;

    item.querySelector('.routine-remove-btn').addEventListener('click', function () {
        item.remove();
    });

    routineExerciseList.appendChild(item);
}

function collectRoutineExercises() {
    if (!routineExerciseList) {
        return [];
    }

    return Array.from(routineExerciseList.querySelectorAll('.routine-exercise-item')).map(item => ({
        preset_id: item.dataset.presetId,
        sets: Number(item.querySelector('.routine-sets-input')?.value || 0),
        rep_min: Number(item.querySelector('.routine-rep-min-input')?.value || 0),
        rep_max: Number(item.querySelector('.routine-rep-max-input')?.value || 0)
    }));
}

function getFilteredRoutines() {
    const searchTerm = routineFilterInput ? routineFilterInput.value.trim().toLowerCase() : '';

    if (!searchTerm) {
        return savedRoutines;
    }

    return savedRoutines.filter(routine => {
        const exercises = Array.isArray(routine.exercises) ? routine.exercises : [];
        const exerciseText = exercises
            .map(exercise => exercise.name || '')
            .join(' ')
            .toLowerCase();

        return (routine.name || '').toLowerCase().includes(searchTerm)
            || exerciseText.includes(searchTerm);
    });
}

function closeRoutineMenus(exceptMenu = null) {
    if (!routineList) {
        return;
    }

    routineList.querySelectorAll('.routine-menu').forEach(menu => {
        if (menu !== exceptMenu) {
            menu.hidden = true;
        }
    });
}

function renderRoutines(routines) {
    if (!routineList) {
        return;
    }

    if ((!Array.isArray(routines) || routines.length === 0) && savedRoutineFolders.length === 0) {
        const hasFilter = routineFilterInput && routineFilterInput.value.trim();
        routineList.innerHTML = hasFilter
            ? '<p class="empty-state">No routines match this filter.</p>'
            : '<p class="empty-state">No saved routines yet. Create one from Start a New Workout.</p>';
        return;
    }

    const visibleRoutines = Array.isArray(routines) ? routines : [];
    const folderOptions = [
        '<option value="">Unfiled</option>',
        ...savedRoutineFolders.map(folder => (
            `<option value="${folder.id}">${escapeHtml(formatTitleCase(folder.name))}</option>`
        ))
    ].join('');
    const folderGroups = [
        { id: null, name: 'Unfiled', routines: visibleRoutines.filter(routine => !routine.folder_id) },
        ...savedRoutineFolders.map(folder => ({
            ...folder,
            routines: visibleRoutines.filter(routine => routine.folder_id === folder.id)
        }))
    ].filter(group => group.routines.length > 0 || group.id !== null);

    routineList.innerHTML = folderGroups.map(group => {
        const folderKey = group.id === null ? 'unfiled' : String(group.id);
        const isOpen = openRoutineFolderIds.has(folderKey);

        return `
        <section class="routine-folder-group${isOpen ? ' is-open' : ''}" data-folder-id="${folderKey}">
            <div class="routine-folder-heading" data-folder-id="${folderKey}">
                <button type="button" class="routine-folder-toggle" data-folder-id="${folderKey}" aria-expanded="${isOpen ? 'true' : 'false'}">
                    <span class="routine-folder-arrow">${isOpen ? '-' : '+'}</span>
                    <h3>${escapeHtml(formatTitleCase(group.name))}</h3>
                    <span>${group.routines.length} routine${group.routines.length === 1 ? '' : 's'}</span>
                </button>
                ${group.id !== null ? `
                    <div class="routine-menu-wrap">
                        <button type="button" class="routine-menu-btn routine-folder-menu-trigger" data-folder-id="${folderKey}" aria-label="Folder options">&#8942;</button>
                        <div class="routine-menu routine-folder-menu" data-folder-id="${folderKey}" hidden>
                            <button type="button" class="routine-menu-action routine-folder-menu-action" data-action="add-routine" data-folder-id="${folderKey}">Add New Routine</button>
                            <button type="button" class="routine-menu-action routine-folder-menu-action" data-action="rename" data-folder-id="${folderKey}">Rename Folder</button>
                            <button type="button" class="routine-menu-action routine-folder-menu-action" data-action="move-up" data-folder-id="${folderKey}">Move Up</button>
                            <button type="button" class="routine-menu-action routine-folder-menu-action" data-action="move-down" data-folder-id="${folderKey}">Move Down</button>
                            <button type="button" class="routine-menu-action routine-folder-menu-action is-danger" data-action="delete" data-folder-id="${folderKey}">Delete Folder</button>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="routine-folder-list" ${isOpen ? '' : 'hidden'}>
                ${group.routines.map(routine => {
        const exercises = Array.isArray(routine.exercises) ? routine.exercises : [];
        const exerciseSummary = exercises.map(exercise => {
            const repRange = exercise.rep_min === exercise.rep_max
                ? `${exercise.rep_min} reps`
                : `${exercise.rep_min}-${exercise.rep_max} reps`;
            return `<span>${escapeHtml(formatTitleCase(exercise.name))} &middot; ${exercise.sets} sets &middot; ${repRange}</span>`;
        }).join('');

        return `
            <article class="routine-card">
                <div>
                    <p class="section-label">Routine</p>
                    <h3>${escapeHtml(formatTitleCase(routine.name))}</h3>
                    <div class="routine-summary">${exerciseSummary}</div>
                </div>
                <div class="routine-card-actions">
                    <div class="routine-menu-wrap">
                        <button type="button" class="routine-menu-btn" data-id="${routine.id}" aria-label="Routine options">&#8942;</button>
                        <div class="routine-menu" data-id="${routine.id}" hidden>
                            <button type="button" class="routine-menu-action" data-action="duplicate" data-id="${routine.id}">Duplicate</button>
                            <button type="button" class="routine-menu-action" data-action="edit" data-id="${routine.id}">Edit</button>
                            <button type="button" class="routine-menu-action is-danger" data-action="delete" data-id="${routine.id}">Delete</button>
                        </div>
                    </div>
                    <label class="routine-folder-select">
                        <span>Folder</span>
                        <select class="routine-folder-input" data-id="${routine.id}">
                            ${folderOptions}
                        </select>
                    </label>
                    <button type="button" class="start-routine-btn" data-id="${routine.id}">Start Routine</button>
                </div>
            </article>
        `;
                }).join('')}
            </div>
        </section>
    `;
    }).join('');

    routineList.querySelectorAll('.routine-folder-toggle').forEach(button => {
        button.addEventListener('click', function () {
            const folderId = button.dataset.folderId;
            if (openRoutineFolderIds.has(folderId)) {
                openRoutineFolderIds.delete(folderId);
            } else {
                openRoutineFolderIds.add(folderId);
            }
            renderRoutines(getFilteredRoutines());
        });
    });

    routineList.querySelectorAll('.routine-folder-menu-trigger').forEach(button => {
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            const menu = routineList.querySelector(`.routine-folder-menu[data-folder-id="${button.dataset.folderId}"]`);
            if (menu) {
                closeRoutineMenus(menu);
                menu.hidden = !menu.hidden;
            }
        });
    });

    routineList.querySelectorAll('.routine-folder-menu-action').forEach(button => {
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            handleFolderMenuAction(button.dataset.action, Number(button.dataset.folderId));
        });
    });

    routineList.querySelectorAll('.start-routine-btn').forEach(button => {
        button.addEventListener('click', function () {
            startRoutine(button.dataset.id);
        });
    });

    routineList.querySelectorAll('.routine-menu-btn:not(.routine-folder-menu-trigger)').forEach(button => {
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            const menu = routineList.querySelector(`.routine-menu[data-id="${button.dataset.id}"]`);
            if (menu) {
                closeRoutineMenus(menu);
                menu.hidden = !menu.hidden;
            }
        });
    });

    routineList.querySelectorAll('.routine-menu-action').forEach(button => {
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            handleRoutineMenuAction(button.dataset.action, Number(button.dataset.id));
        });
    });

    routineList.querySelectorAll('.routine-folder-input').forEach(select => {
        const routine = savedRoutines.find(item => String(item.id) === select.dataset.id);
        select.value = routine && routine.folder_id ? String(routine.folder_id) : '';
        select.addEventListener('change', function () {
            updateRoutineFolder(select.dataset.id, select.value ? Number(select.value) : null);
        });
    });
}

function loadRoutines() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    Promise.all([
        fetch('http://127.0.0.1:5000/routines', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(response => response.json()),
        fetch('http://127.0.0.1:5000/routine-folders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(response => response.json())
    ])
    .then(([routineData, folderData]) => {
        if (routineData.status === 'success' && folderData.status === 'success') {
            savedRoutines = Array.isArray(routineData.data) ? routineData.data : [];
            savedRoutineFolders = Array.isArray(folderData.data) ? folderData.data : [];
            renderRoutines(getFilteredRoutines());
        } else {
            showMessage(routineData.message || folderData.message || 'Failed to load routines.', 'error');
        }
    })
    .catch(error => {
        console.error('Load routines error:', error);
        showMessage('Failed to load routines.', 'error');
    });
}

function createRoutineFolder() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    const name = window.prompt('Folder name');
    if (!name || !name.trim()) {
        return;
    }

    fetch('http://127.0.0.1:5000/routine-folders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Folder created.', 'success');
            loadRoutines();
        } else {
            showMessage(data.message || 'Failed to create folder.', 'error');
        }
    })
    .catch(error => {
        console.error('Create folder error:', error);
        showMessage('Failed to create folder.', 'error');
    });
}

function updateRoutineFolder(routineId, folderId) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch(`http://127.0.0.1:5000/routines/${routineId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ folder_id: folderId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Routine folder updated.', 'success');
            loadRoutines();
        } else {
            showMessage(data.message || 'Failed to update routine folder.', 'error');
        }
    })
    .catch(error => {
        console.error('Update routine folder error:', error);
        showMessage('Failed to update routine folder.', 'error');
    });
}

function handleFolderMenuAction(action, folderId) {
    const folder = savedRoutineFolders.find(item => item.id === folderId);

    if (!folder) {
        showMessage('Folder not found.', 'error');
        return;
    }

    if (action === 'add-routine') {
        openRoutineBuilderModal(null, folderId);
        return;
    }

    if (action === 'rename') {
        const name = window.prompt('Folder name', folder.name || '');
        if (name && name.trim()) {
            updateRoutineFolderDetails(folderId, { name: name.trim() });
        }
        return;
    }

    if (action === 'move-up') {
        updateRoutineFolderDetails(folderId, { direction: 'up' });
        return;
    }

    if (action === 'move-down') {
        updateRoutineFolderDetails(folderId, { direction: 'down' });
        return;
    }

    if (action === 'delete') {
        deleteRoutineFolder(folderId);
    }
}

function updateRoutineFolderDetails(folderId, updates) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch(`http://127.0.0.1:5000/routine-folders/${folderId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Folder updated.', 'success');
            openRoutineFolderIds.add(String(folderId));
            loadRoutines();
        } else {
            showMessage(data.message || 'Failed to update folder.', 'error');
        }
    })
    .catch(error => {
        console.error('Update folder error:', error);
        showMessage('Failed to update folder.', 'error');
    });
}

function deleteRoutineFolder(folderId) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    if (!window.confirm('Delete this folder? Routines inside will move to Unfiled.')) {
        return;
    }

    fetch(`http://127.0.0.1:5000/routine-folders/${folderId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Folder deleted.', 'success');
            openRoutineFolderIds.delete(String(folderId));
            openRoutineFolderIds.add('unfiled');
            loadRoutines();
        } else {
            showMessage(data.message || 'Failed to delete folder.', 'error');
        }
    })
    .catch(error => {
        console.error('Delete folder error:', error);
        showMessage('Failed to delete folder.', 'error');
    });
}

function handleRoutineMenuAction(action, routineId) {
    const routine = savedRoutines.find(item => item.id === routineId);

    if (!routine) {
        showMessage('Routine not found.', 'error');
        return;
    }

    if (action === 'edit') {
        openRoutineBuilderModal(routine);
        return;
    }

    if (action === 'duplicate') {
        duplicateRoutine(routineId);
        return;
    }

    if (action === 'delete') {
        deleteRoutine(routineId);
    }
}

function duplicateRoutine(routineId) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch(`http://127.0.0.1:5000/routines/${routineId}/duplicate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Routine duplicated.', 'success');
            loadRoutines();
        } else {
            showMessage(data.message || 'Failed to duplicate routine.', 'error');
        }
    })
    .catch(error => {
        console.error('Duplicate routine error:', error);
        showMessage('Failed to duplicate routine.', 'error');
    });
}

function deleteRoutine(routineId) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    if (!window.confirm('Delete this routine?')) {
        return;
    }

    fetch(`http://127.0.0.1:5000/routines/${routineId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Routine deleted.', 'success');
            loadRoutines();
        } else {
            showMessage(data.message || 'Failed to delete routine.', 'error');
        }
    })
    .catch(error => {
        console.error('Delete routine error:', error);
        showMessage('Failed to delete routine.', 'error');
    });
}

function saveRoutine() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    const name = routineNameInput ? routineNameInput.value.trim() : '';
    const exercises = collectRoutineExercises();

    if (!name) {
        showMessage('Enter a routine name.', 'error');
        return;
    }

    if (exercises.length === 0) {
        showMessage('Add at least one exercise to the routine.', 'error');
        return;
    }

    const requestUrl = editingRoutineId
        ? `http://127.0.0.1:5000/routines/${editingRoutineId}`
        : 'http://127.0.0.1:5000/routines';
    const requestMethod = editingRoutineId ? 'PUT' : 'POST';
    const currentRoutine = editingRoutineId
        ? savedRoutines.find(item => item.id === editingRoutineId)
        : null;
    const folderId = currentRoutine ? (currentRoutine.folder_id || null) : routineBuilderFolderId;

    fetch(requestUrl, {
        method: requestMethod,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name,
            exercises,
            folder_id: folderId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage(editingRoutineId ? 'Routine updated successfully!' : 'Routine saved successfully!', 'success');
            if (routineBuilderForm) {
                routineBuilderForm.reset();
            }
            if (routineExerciseList) {
                routineExerciseList.innerHTML = '';
            }
            closeRoutineBuilderModal();
            loadRoutines();
        } else {
            showMessage(data.message || 'Failed to save routine.', 'error');
        }
    })
    .catch(error => {
        console.error('Save routine error:', error);
        showMessage('Failed to save routine.', 'error');
    });
}

function startRoutine(routineId) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch(`http://127.0.0.1:5000/routines/${routineId}/start`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.location.href = '/workouts/current';
        } else {
            showMessage(data.message || 'Failed to start routine.', 'error');
        }
    })
    .catch(error => {
        console.error('Start routine error:', error);
        showMessage('Failed to start routine.', 'error');
    });
}

function formatHistoryDate(value) {
    if (!value) {
        return 'Date not saved';
    }

    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getHistorySetLabel(setItem, index) {
    const setType = setItem.set_type || 'working';
    if (setType === 'warmup') {
        return 'W';
    }
    if (setType === 'drop') {
        return 'D';
    }
    if (setType === 'failure') {
        return 'F';
    }
    return String(index + 1);
}

function renderWorkoutHistory(historyItems) {
    if (!historyList) {
        return;
    }

    if (!historyItems || historyItems.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No past workouts found yet.</p>';
        return;
    }

    const historyHtml = historyItems.map(session => {
        const sessionName = formatTitleCase(session.session_name || 'Workout');
        const completedAt = formatHistoryDate(session.completed_at);
        const workouts = Array.isArray(session.completed_workout) ? session.completed_workout : [];

        return `
        <article class="workout-card workout-card-sheet history-session-card" data-history-id="${session.id}">
            <div class="history-session-header" role="button" tabindex="0" data-history-toggle="${session.id}">
                <div>
                    <p class="section-label">Completed Workout</p>
                    <h3 class="workout-title">${escapeHtml(sessionName)}</h3>
                    <p class="history-date">${escapeHtml(completedAt)}</p>
                </div>
                <div class="history-session-actions">
                    <button type="button" class="history-toggle-btn secondary-btn" data-history-id="${session.id}">View Details</button>
                    <button type="button" class="history-edit-btn secondary-btn" data-history-id="${session.id}">Edit</button>
                    <button type="button" class="history-delete-btn danger-btn" data-history-id="${session.id}">Delete</button>
                </div>
            </div>

            <div class="history-session-list" hidden>
                ${workouts.map(workout => {
                    const setDetails = Array.isArray(workout.set_details) && workout.set_details.length > 0
                        ? workout.set_details
                        : (Array.isArray(workout.reps) ? workout.reps.map(rep => ({
                            reps: rep,
                            kg: 0,
                            set_type: 'working',
                            done: true
                        })) : []);
                    const thumbnailHtml = workout.exerciseId
                        ? `
                            <div class="current-workout-media history-workout-media">
                                <img
                                    src="/exercise-thumbnail/${encodeURIComponent(workout.exerciseId)}"
                                    alt="${escapeHtml(formatTitleCase(workout.workout))} thumbnail"
                                    class="current-workout-thumb"
                                    loading="lazy">
                            </div>
                        `
                        : '';

                    return `
                        <div class="history-workout-item" data-workout-id="${workout.id}">
                            <div class="current-workout-layout">
                                ${thumbnailHtml}
                                <div class="current-workout-main">
                                    <div class="workout-card-header">
                                        <div class="workout-heading-block">
                                            <h4 class="workout-title">${escapeHtml(formatTitleCase(workout.workout))}</h4>
                                        </div>
                                        <span class="category-tag">${escapeHtml(workout.equipment || 'Custom')}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="strength-editor history-strength-editor">
                                <div class="set-table-head">
                                    <span>Set</span>
                                    <span>Previous</span>
                                    <span>KG</span>
                                    <span>Reps</span>
                                    <span>Status</span>
                                </div>
                                <div class="set-list history-set-list">
                                    ${setDetails.map((setItem, setIndex) => `
                                        <div class="set-row set-row-modern history-set-row" data-set-type="${setItem.set_type || 'working'}">
                                            <div class="set-cell set-cell-label">
                                                <span class="set-type-trigger is-${setItem.set_type || 'working'}">${getHistorySetLabel(setItem, setIndex)}</span>
                                            </div>
                                            <div class="set-cell set-cell-previous">${escapeHtml(`${setItem.kg || 0} kg x ${setItem.reps || 0}`)}</div>
                                            <input type="number" class="history-kg-field" min="0" value="${setItem.kg || 0}" disabled>
                                            <input type="number" class="history-reps-field" min="1" value="${setItem.reps || ''}" disabled>
                                            <span class="history-done-mark">${setItem.done ? '&#10003;' : '&#9675;'}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </article>
    `;
    }).join('');

    historyList.innerHTML = historyHtml;

    historyList.querySelectorAll('[data-history-toggle]').forEach(header => {
        header.addEventListener('click', function (event) {
            if (event.target.closest('button')) {
                return;
            }
            toggleHistoryDetails(header.dataset.historyToggle);
        });

        header.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleHistoryDetails(header.dataset.historyToggle);
            }
        });
    });

    historyList.querySelectorAll('.history-toggle-btn').forEach(button => {
        button.addEventListener('click', function () {
            toggleHistoryDetails(button.dataset.historyId);
        });
    });

    historyList.querySelectorAll('.history-edit-btn').forEach(button => {
        button.addEventListener('click', function () {
            const card = button.closest('.history-session-card');
            if (!card) {
                return;
            }

            showHistoryDetails(card, true);
            const isEditing = card.classList.toggle('is-editing');
            button.textContent = isEditing ? 'Save' : 'Edit';
            card.querySelectorAll('.history-kg-field, .history-reps-field').forEach(input => {
                input.disabled = !isEditing;
            });

            if (!isEditing) {
                saveHistorySession(button.dataset.historyId, card);
            }
        });
    });

    historyList.querySelectorAll('.history-delete-btn').forEach(button => {
        button.addEventListener('click', function () {
            deleteHistorySession(button.dataset.historyId);
        });
    });
}

function showHistoryDetails(card, shouldShow) {
    const details = card.querySelector('.history-session-list');
    const toggleButton = card.querySelector('.history-toggle-btn');

    if (!details) {
        return;
    }

    details.hidden = !shouldShow;
    card.classList.toggle('is-open', shouldShow);
    if (toggleButton) {
        toggleButton.textContent = shouldShow ? 'Hide Details' : 'View Details';
    }
}

function toggleHistoryDetails(historyId) {
    const card = historyList ? historyList.querySelector(`.history-session-card[data-history-id="${historyId}"]`) : null;

    if (!card) {
        return;
    }

    const details = card.querySelector('.history-session-list');
    showHistoryDetails(card, Boolean(details && details.hidden));
}

function collectHistorySession(card) {
    return Array.from(card.querySelectorAll('.history-workout-item')).map(workoutEl => ({
        id: Number(workoutEl.dataset.workoutId),
        set_details: Array.from(workoutEl.querySelectorAll('.history-set-row')).map(row => ({
            kg: Number(row.querySelector('.history-kg-field')?.value || 0),
            reps: Number(row.querySelector('.history-reps-field')?.value || 0),
            set_type: row.dataset.setType || 'working',
            done: true
        }))
    }));
}

function saveHistorySession(historyId, card) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch(`http://127.0.0.1:5000/history-data/${historyId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            completed_workout: collectHistorySession(card)
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Past workout updated successfully!', 'success');
            loadWorkoutHistory();
        } else {
            showMessage(data.message || 'Failed to update past workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Save history error:', error);
        showMessage('Failed to update past workout.', 'error');
    });
}

function deleteHistorySession(historyId) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    const shouldDelete = window.confirm('Delete this past workout?');
    if (!shouldDelete) {
        return;
    }

    fetch(`http://127.0.0.1:5000/history-data/${historyId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Past workout deleted.', 'success');
            loadWorkoutHistory();
        } else {
            showMessage(data.message || 'Failed to delete past workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Delete history error:', error);
        showMessage('Failed to delete past workout.', 'error');
    });
}

function loadWorkoutHistory() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    fetch('http://127.0.0.1:5000/history-data', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            renderWorkoutHistory(data.data);
        } else {
            showMessage(data.message || 'Failed to load workout history.', 'error');
        }
    })
    .catch(error => {
        console.error('Load history error:', error);
        showMessage('Failed to load workout history.', 'error');
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const username = registerForm.querySelector('[name="username"]').value;
        const password = registerForm.querySelector('[name="password"]').value;

        fetch('http://127.0.0.1:5000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.errors) {
                showMessage(data.errors.join(' '), 'error');
            } else {
                showMessage(data.message || 'Registration completed.', 'success');
            }
        })
        .catch(error => {
            console.error('Registration error:', error);
            showMessage('Error occurred during registration.', 'error');
        });
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const username = loginForm.querySelector('[name="username"]').value;
        const password = loginForm.querySelector('[name="password"]').value;

        fetch('http://127.0.0.1:5000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                window.location.href = '/workouts';
            } else {
                showMessage(data.message || 'Login failed.', 'error');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showMessage('Login failed.', 'error');
        });
    });
}

if (loadDataButton) {
    loadDataButton.addEventListener('click', function () {
        loadWorkouts();
    });
}

if (finishWorkoutButton) {
    finishWorkoutButton.addEventListener('click', function () {
        finishWorkout();
    });
}

document.querySelectorAll('.back-page-btn').forEach(button => {
    button.addEventListener('click', function () {
        const fallbackUrl = button.dataset.backUrl || '/workouts';
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = fallbackUrl;
        }
    });
});

if (openStartWorkoutModalButton) {
    openStartWorkoutModalButton.addEventListener('click', function () {
        openStartWorkoutModal();
    });
}

if (closeStartWorkoutModalButton) {
    closeStartWorkoutModalButton.addEventListener('click', function () {
        closeStartWorkoutModal();
    });
}

if (startWorkoutModalOverlay) {
    startWorkoutModalOverlay.addEventListener('click', function (event) {
        if (event.target === startWorkoutModalOverlay) {
            closeStartWorkoutModal();
        }
    });
}

if (newRoutineChoiceButton) {
    newRoutineChoiceButton.addEventListener('click', function () {
        openRoutineBuilderModal();
    });
}

if (closeRoutineBuilderModalButton) {
    closeRoutineBuilderModalButton.addEventListener('click', function () {
        closeRoutineBuilderModal();
    });
}

if (routineBuilderModalOverlay) {
    routineBuilderModalOverlay.addEventListener('click', function (event) {
        if (event.target === routineBuilderModalOverlay) {
            closeRoutineBuilderModal();
        }
    });
}

if (routinePresetSearchInput) {
    routinePresetSearchInput.addEventListener('input', filterRoutinePresets);
}

if (routineFilterInput) {
    routineFilterInput.addEventListener('input', function () {
        renderRoutines(getFilteredRoutines());
    });
}

if (makeRoutineFolderButton) {
    makeRoutineFolderButton.addEventListener('click', function () {
        createRoutineFolder();
    });
}

if (routinePresetList) {
    routinePresetList.querySelectorAll('.routine-preset-option').forEach(option => {
        option.addEventListener('click', function () {
            addRoutineExercise(option.dataset.id, option.dataset.name);
        });
    });
}

if (routineBuilderForm) {
    routineBuilderForm.addEventListener('submit', function (event) {
        event.preventDefault();
        saveRoutine();
    });
}

if (presetEquipmentSelect) {
    presetEquipmentSelect.addEventListener('change', filterPresetWorkouts);
}

if (presetBodyPartSelect) {
    presetBodyPartSelect.addEventListener('change', filterPresetWorkouts);
}

if (presetSearchInput) {
    presetSearchInput.addEventListener('input', filterPresetWorkouts);
}

if (openPresetModalButton) {
    openPresetModalButton.addEventListener('click', function () {
        if (presetModalOverlay) {
            presetModalOverlay.style.display = 'flex';
            filterPresetWorkouts();
        }
    });
}

if (closePresetModalButton) {
    closePresetModalButton.addEventListener('click', function () {
        if (presetModalOverlay) {
            presetModalOverlay.style.display = 'none';
        }
    });
}

if (presetModalOverlay) {
    presetModalOverlay.addEventListener('click', function (event) {
        if (event.target === presetModalOverlay) {
            presetModalOverlay.style.display = 'none';
        }
    });
}

if (presetWorkoutList) {
    const presetOptions = presetWorkoutList.querySelectorAll('.preset-workout-option');

    presetOptions.forEach(option => {
        option.addEventListener('click', function () {
            const bodyParts = JSON.parse(option.dataset.bodyParts || '[]');
            const primaryMuscles = JSON.parse(option.dataset.primaryMuscles || '[]');
            const secondaryMuscles = JSON.parse(option.dataset.secondaryMuscles || '[]');

            presetOptions.forEach(item => {
                item.classList.remove('is-selected');
            });
            option.classList.add('is-selected');

            presetWorkoutIdInput.value = option.dataset.id;
            presetWorkoutNameInput.value = option.dataset.name;
            presetWorkoutEquipmentInput.value = option.dataset.equipment || '';
            presetWorkoutBodyPartsInput.value = JSON.stringify(bodyParts);
            presetWorkoutPrimaryInput.value = JSON.stringify(primaryMuscles);
            presetWorkoutSecondaryInput.value = JSON.stringify(secondaryMuscles);
            if (addPresetButton) {
                addPresetButton.disabled = false;
            }
            updateWorkoutButtons();
        });
    });
}

if (closeWorkoutDetailButton) {
    closeWorkoutDetailButton.addEventListener('click', function () {
        closeWorkoutDetailModal();
    });
}

if (workoutDetailModalOverlay) {
    workoutDetailModalOverlay.addEventListener('click', function (event) {
        if (event.target === workoutDetailModalOverlay) {
            closeWorkoutDetailModal();
        }
    });
}

if (closeSetTypeModalButton) {
    closeSetTypeModalButton.addEventListener('click', function () {
        closeSetTypeModal();
    });
}

if (setTypeModalOverlay) {
    setTypeModalOverlay.addEventListener('click', function (event) {
        if (event.target === setTypeModalOverlay) {
            closeSetTypeModal();
        }
    });
}

document.querySelectorAll('.sheet-option-btn[data-set-type]').forEach(button => {
    button.addEventListener('click', function () {
        if (!pendingSetContext || !pendingSetContext.row) {
            return;
        }

        const { row } = pendingSetContext;
        const selectedType = button.dataset.setType || 'working';
        const setList = row.closest('.set-list');

        if (!setList) {
            closeSetTypeModal();
            return;
        }

        if (selectedType === 'warmup') {
            const rows = Array.from(setList.querySelectorAll('.set-row'));
            const selectedIndex = rows.indexOf(row);
            rows.forEach((item, index) => {
                if (index <= selectedIndex) {
                    item.dataset.setType = 'warmup';
                }
            });
        } else {
            row.dataset.setType = selectedType;
        }

        row.dataset.done = row.dataset.done || 'false';
        refreshSetRows(setList);
        closeSetTypeModal();
    });
});

if (removeSetActionButton) {
    removeSetActionButton.addEventListener('click', function () {
        if (!pendingSetContext || !pendingSetContext.row) {
            return;
        }

        const row = pendingSetContext.row;
        closeSetTypeModal();
        removeSetRow(row);
    });
}

if (closeWorkoutActionModalButton) {
    closeWorkoutActionModalButton.addEventListener('click', function () {
        closeWorkoutActionModal();
    });
}

if (workoutActionModalOverlay) {
    workoutActionModalOverlay.addEventListener('click', function (event) {
        if (event.target === workoutActionModalOverlay) {
            closeWorkoutActionModal();
        }
    });
}

if (deleteWorkoutActionButton) {
    deleteWorkoutActionButton.addEventListener('click', function () {
        if (!activeWorkoutActionId) {
            return;
        }

        const workoutId = activeWorkoutActionId;
        closeWorkoutActionModal();
        deleteWorkout(workoutId);
    });
}

if (customWorkoutInput) {
    customWorkoutInput.addEventListener('input', updateWorkoutButtons);
}

if (addPresetButton) {
    addPresetButton.addEventListener('click', function () {
        const workout = presetWorkoutNameInput.value;
        const equipment = presetWorkoutEquipmentInput.value;
        const bodyParts = JSON.parse(presetWorkoutBodyPartsInput.value || '[]');
        const primaryMuscles = JSON.parse(presetWorkoutPrimaryInput.value || '[]');
        const secondaryMuscles = JSON.parse(presetWorkoutSecondaryInput.value || '[]');
        const presetId = presetWorkoutIdInput.value;

        if (!workout || !presetId) {
            showMessage('Please choose a preset workout.', 'error');
            return;
        }

        createWorkout(workout, equipment, bodyParts, primaryMuscles, secondaryMuscles, presetId);
    });
}

if (addCustomButton) {
    addCustomButton.addEventListener('click', function () {
        const workout = customWorkoutInput.value.trim();
        const equipment = customEquipmentInput ? customEquipmentInput.value.trim() : '';
        const bodyParts = customBodyPartsInput ? parseMuscleInput(customBodyPartsInput.value) : [];
        const primaryMuscles = customPrimaryMusclesInput ? parseMuscleInput(customPrimaryMusclesInput.value) : [];
        const secondaryMuscles = customSecondaryMusclesInput ? parseMuscleInput(customSecondaryMusclesInput.value) : [];

        if (!workout) {
            showMessage('Please enter a custom workout name.', 'error');
            return;
        }

        createWorkout(workout, equipment, bodyParts, primaryMuscles, secondaryMuscles, null);
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', function () {
        localStorage.removeItem('access_token');
        window.location.href = '/';
    });
}

updateWorkoutButtons();

if (window.location.pathname === '/workouts/current') {
    if (!savedToken) {
        window.location.href = '/';
    } else {
        loadWorkouts();
    }
}

if (window.location.pathname === '/workouts/history') {
    if (!savedToken) {
        window.location.href = '/';
    } else {
        loadWorkoutHistory();
    }
}

if (window.location.pathname === '/workouts') {
    if (!savedToken) {
        window.location.href = '/';
    } else {
        loadRoutines();
    }
}


