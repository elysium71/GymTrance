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

    const workoutHtml = workouts.map(workout => `
        <article class="workout-card">
            <div class="workout-card-header">
                <h3 class="workout-title">${workout.workout}</h3>
                <span class="category-tag">${workout.category}</span>
            </div>
            <p class="workout-id">
                ${workout.preset_id ? `Preset ID: ${workout.preset_id}` : `Workout ID: ${workout.id}`}
            </p>

            <button type="button" class="delete-workout-btn" data-id="${workout.id}">Delete</button>
        </article>
    `).join('');

    workoutList.innerHTML = workoutHtml;

    const deleteButtons = document.querySelectorAll('.delete-workout-btn');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            deleteWorkout(button.dataset.id);
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
