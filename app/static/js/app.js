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

const savedToken = localStorage.getItem('access_token');

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
        ? instructions.map(step => `<li>${escapeHtml(step)}</li>`).join('')
        : '<li>No instructions available.</li>';

    return `
        <div class="workout-detail-panel">
            ${hasGif ? `
                <div class="workout-detail-media">
                    <img
                        src="${escapeHtml(workout.gifUrl)}"
                        alt="${escapeHtml(workout.workout)} demonstration"
                        class="workout-detail-gif"
                        loading="lazy">
                </div>
            ` : ''}
            <div class="workout-detail-copy">
                <p class="workout-detail-label">Instructions</p>
                <ol class="workout-detail-steps">
                    ${instructionItems}
                </ol>
            </div>
        </div>
    `;
}

function openWorkoutDetailModal(workout) {
    if (!workoutDetailModalOverlay || !workoutDetailBody || !workoutDetailTitle) {
        return;
    }

    workoutDetailTitle.textContent = workout.workout || 'Workout Detail';
    workoutDetailBody.innerHTML = renderWorkoutExpandedDetails(workout);
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
            : [{ reps: '', kg: '' }];

        const setRows = setEntries.map((setEntry, index) => `
            <div class="set-row">
                <div class="set-label">Set ${index + 1}</div>
                <input
                    type="number"
                    class="reps-field"
                    data-id="${workout.id}"
                    placeholder="Reps"
                    min="1"
                    value="${setEntry.reps || ''}">
                <input
                    type="number"
                    class="kg-field"
                    data-id="${workout.id}"
                    placeholder="KG"
                    min="0"
                    value="${setEntry.kg || ''}">
                <button type="button" class="remove-set-btn" data-id="${workout.id}">Delete Set</button>
            </div>
        `).join('');

        return `
            <article class="workout-card">
                <div class="workout-card-header">
                    <h3 class="workout-title">${workout.workout}</h3>
                    <span class="category-tag">${workout.equipment || 'Custom'}</span>
                </div>

                ${renderWorkoutDetails(workout)}

                ${(workout.gifUrl || (Array.isArray(workout.instructions) && workout.instructions.length > 0)) ? `
                    <button
                        type="button"
                        class="toggle-detail-btn"
                        data-id="${workout.id}">
                        Show Details
                    </button>
                ` : ''}

                <div class="strength-editor" data-id="${workout.id}">
                    <div class="set-list" data-id="${workout.id}">
                        ${setRows}
                    </div>
                    <div class="strength-actions">
                        <button type="button" class="add-set-btn" data-id="${workout.id}">Add Set</button>
                        <button type="button" class="save-strength-btn" data-id="${workout.id}">Save</button>
                    </div>
                </div>

                <button type="button" class="delete-workout-btn" data-id="${workout.id}">Delete</button>
            </article>
        `;
    }).join('');

    workoutList.innerHTML = workoutHtml;

    document.querySelectorAll('.delete-workout-btn').forEach(button => {
        button.addEventListener('click', function () {
            deleteWorkout(button.dataset.id);
        });
    });

    document.querySelectorAll('.add-set-btn').forEach(button => {
        button.addEventListener('click', function () {
            addSetRow(button.dataset.id);
        });
    });

    document.querySelectorAll('.remove-set-btn').forEach(button => {
        button.addEventListener('click', function () {
            removeSetRow(button);
        });
    });

    document.querySelectorAll('.save-strength-btn').forEach(button => {
        button.addEventListener('click', function () {
            const workoutId = button.dataset.id;
            const repInputs = document.querySelectorAll(`.reps-field[data-id="${workoutId}"]`);

            const setDetails = Array.from(repInputs).map(repsInput => {
                const row = repsInput.closest('.set-row');
                const kgInput = row.querySelector(`.kg-field[data-id="${workoutId}"]`);

                return {
                    reps: Number(repsInput.value),
                    kg: kgInput.value ? Number(kgInput.value) : 0
                };
            }).filter(setItem => setItem.reps > 0);

            saveStrengthWorkout(workoutId, setDetails);
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

function saveStrengthWorkout(workoutId, setDetails) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    if (!Array.isArray(setDetails) || setDetails.length === 0) {
        showMessage('Please add at least one set with reps.', 'error');
        return;
    }

    fetch(`http://127.0.0.1:5000/data/${workoutId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            sets: setDetails.length,
            reps: setDetails.map(setItem => setItem.reps),
            set_details: setDetails
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Workout updated successfully!', 'success');
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

function addSetRow(workoutId) {
    const setList = document.querySelector(`.set-list[data-id="${workoutId}"]`);
    if (!setList) {
        return;
    }

    const nextSetNumber = setList.querySelectorAll('.set-row').length + 1;

    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
        <div class="set-label">Set ${nextSetNumber}</div>
        <input
            type="number"
            class="reps-field"
            data-id="${workoutId}"
            placeholder="Reps"
            min="1">
        <input
            type="number"
            class="kg-field"
            data-id="${workoutId}"
            placeholder="KG"
            min="0">
        <button type="button" class="remove-set-btn" data-id="${workoutId}">Delete Set</button>
    `;

    setList.appendChild(row);

    row.querySelector('.remove-set-btn').addEventListener('click', function () {
        removeSetRow(this);
    });
}

function removeSetRow(button) {
    const row = button.closest('.set-row');
    const setList = button.closest('.set-list');

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

    setList.querySelectorAll('.set-row').forEach((setRow, index) => {
        const label = setRow.querySelector('.set-label');
        if (label) {
            label.textContent = `Set ${index + 1}`;
        }
    });
}

function renderWorkoutHistory(historyItems) {
    if (!historyList) {
        return;
    }

    if (!historyItems || historyItems.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No past workouts found yet.</p>';
        return;
    }

    const historyHtml = historyItems.map((session, index) => `
        <article class="workout-card">
            <div class="workout-card-header">
                <h3 class="workout-title">Workout Session ${index + 1}</h3>
                <span class="category-tag">Completed</span>
            </div>

            <div class="history-session-list">
                ${session.completed_workout.map(workout => `
                    <div class="history-workout-item">
                        <p><strong>${workout.workout}</strong></p>
                        <p><strong>Equipment:</strong> ${workout.equipment || 'No equipment listed'}</p>
                        <p><strong>Body Parts:</strong> ${formatMuscleList(workout.bodyParts)}</p>
                        <p><strong>Primary:</strong> ${formatMuscleList(workout.primaryMuscles)}</p>
                        <p><strong>Secondary:</strong> ${formatMuscleList(workout.secondaryMuscles)}</p>

                        ${Array.isArray(workout.set_details) && workout.set_details.length > 0 ? `
                            <div class="history-set-list">
                                ${workout.set_details.map((setItem, setIndex) => `
                                    <p>Set ${setIndex + 1}: ${setItem.reps} reps${setItem.kg !== undefined ? `, ${setItem.kg} kg` : ''}</p>
                                `).join('')}
                            </div>
                        ` : Array.isArray(workout.reps) && workout.reps.length > 0 ? `
                            <div class="history-set-list">
                                ${workout.reps.map((rep, setIndex) => `
                                    <p>Set ${setIndex + 1}: ${rep} reps</p>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </article>
    `).join('');

    historyList.innerHTML = historyHtml;
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
    }
}
