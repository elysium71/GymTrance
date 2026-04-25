const registerForm = document.querySelector('#register-form');
const loginForm = document.querySelector('#login-form-element');
const loadDataButton = document.querySelector('#load-data-btn');
const logoutButton = document.querySelector('#logout-btn');
const addWorkoutForm = document.querySelector('#add-workout-form');
const messageBox = document.querySelector('#message-box');
const workoutList = document.querySelector('#workout-list');
const presetWorkoutSelect = document.querySelector('#preset-workout-select');
const customWorkoutInput = document.querySelector('#custom-workout-input');
const customCategorySelect = document.querySelector('#custom-category-select');
const addPresetButton = document.querySelector('#add-preset-btn');
const addCustomButton = document.querySelector('#add-custom-btn');


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
function updateWorkoutButtons() {
    if (addPresetButton && presetWorkoutSelect) {
        addPresetButton.disabled = !presetWorkoutSelect.value;
    }

    if (addCustomButton && customWorkoutInput && customCategorySelect) {
        addCustomButton.disabled = !customWorkoutInput.value.trim() || !customCategorySelect.value;
    }
}

function createWorkout(workout, category, presetId = null) {
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
        body: JSON.stringify({ workout, category, preset_id: presetId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showMessage('Workout added successfully!', 'success');
            if (addWorkoutForm) {
                addWorkoutForm.reset();
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


function renderWorkouts(workouts) {
    if (!workoutList) {
        return;
    }

    if (!workouts || workouts.length === 0) {
        workoutList.innerHTML = '<p class="empty-state">No workouts found. Add your first one and start building your streak.</p>';
        return;
    }

    const workoutHtml = workouts.map(workout => {
        const setEntries = Array.isArray(workout.set_details) && workout.set_details.length > 0
            ? workout.set_details
            : Array.isArray(workout.reps) && workout.reps.length > 0
                ? workout.reps.map(rep => ({ reps: rep, kg: '' }))
                : [{ reps: '', kg: '' }];

        const setRows = setEntries.map((setEntry, index) => `
            <div class="set-row">
                <span class="set-label">Set ${index + 1}</span>
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
                    <span class="category-tag">${workout.category}</span>
                </div>
                <p class="workout-id">
                    ${workout.preset_id ? `Preset ID: ${workout.preset_id}` : `Custom ID: ${workout.id}`}
                </p>

                ${workout.category === 'Strength' ? `
                    <div class="strength-editor" data-id="${workout.id}">
                        <div class="set-list" data-id="${workout.id}">
                            ${setRows}
                        </div>
                        <div class="strength-actions">
                            <button type="button" class="add-set-btn" data-id="${workout.id}">Add Set</button>
                            <button type="button" class="save-strength-btn" data-id="${workout.id}">Save</button>
                        </div>
                    </div>
                ` : ''}

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
            const rows = document.querySelectorAll(`.set-row .reps-field[data-id="${workoutId}"]`);

            const setDetails = Array.from(rows).map(repsInput => {
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




    const saveButtons = document.querySelectorAll('.save-strength-btn');
    saveButtons.forEach(button => {
        button.addEventListener('click', function () {
            const workoutId = button.dataset.id;
            const sets = document.querySelector(`.sets-field[data-id="${workoutId}"]`).value;
            const reps = document.querySelector(`.reps-field[data-id="${workoutId}"]`).value;
            saveStrengthWorkout(workoutId, sets, reps);
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
            showMessage('Strength workout updated successfully!', 'success');
            loadWorkouts();
        } else {
            showMessage(data.message || 'Failed to update workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Save strength workout error:', error);
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
        row.innerHTML = `
            <span class="set-label">Set ${nextSetNumber}</span>
            <input
                type="number"
                class="reps-field"
                data-id="${workoutId}"
                placeholder="Reps"
                min="1"
                value="">
            <input
                type="number"
                class="kg-field"
                data-id="${workoutId}"
                placeholder="KG"
                min="0"
                value="">
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

if (addWorkoutForm) {
    if (presetWorkoutSelect) {
        presetWorkoutSelect.addEventListener('change', updateWorkoutButtons);
    }

    if (customWorkoutInput) {
        customWorkoutInput.addEventListener('input', updateWorkoutButtons);
    }

    if (customCategorySelect) {
        customCategorySelect.addEventListener('change', updateWorkoutButtons);
    }

    if (addPresetButton) {
        addPresetButton.addEventListener('click', function () {
            const selectedOption = presetWorkoutSelect.options[presetWorkoutSelect.selectedIndex];
            const workout = selectedOption.value;
            const category = selectedOption.dataset.category || '';
            const presetId = Number(selectedOption.dataset.presetId);

            if (!workout || !category) {
                showMessage('Please choose a preset workout.', 'error');
                return;
            }

            createWorkout(workout, category, presetId);
        });
    }


    if (addCustomButton) {
        addCustomButton.addEventListener('click', function () {
            const workout = customWorkoutInput.value.trim();
            const category = customCategorySelect.value;

            if (!workout || !category) {
                showMessage('Please complete the custom workout section.', 'error');
                return;
            }

            createWorkout(workout, category, null);

        });
    }
    updateWorkoutButtons();

}

if (logoutButton) {
    logoutButton.addEventListener('click', function () {
        localStorage.removeItem('access_token');
        window.location.href = '/';
    });
}

if (window.location.pathname === '/workouts') {
    if (!savedToken) {
        window.location.href = '/';
    } else {
        loadWorkouts();
    }
}
