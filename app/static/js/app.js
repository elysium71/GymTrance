const registerForm = document.querySelector('#register-form');
const loginForm = document.querySelector('#login-form-element');
const loadDataButton = document.querySelector('#load-data-btn');
const logoutButton = document.querySelector('#logout-btn');
const clearWorkoutsButton = document.querySelector('#clear-workouts-btn');
const addWorkoutForm = document.querySelector('#add-workout-form');
const messageBox = document.querySelector('#message-box');
const workoutList = document.querySelector('#workout-list');

const savedToken = localStorage.getItem('access_token');
console.log('Token on page load:', savedToken);

function showMessage(message, type) {
    messageBox.textContent = message;

    if (type === 'success') {
        messageBox.style.color = '#3ddc97';
    } else if (type === 'error') {
        messageBox.style.color = '#ff5f6d';
    } else {
        messageBox.style.color = '#f5f7fb';
    }
}

function renderWorkouts(workouts) {
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
            <p class="workout-id">Workout ID: ${workout.id}</p>
        </article>
    `).join('');

    workoutList.innerHTML = workoutHtml;
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
        console.log('Protected data response:', data);

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
        console.log('Registration response:', data);

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
        console.log('Login response:', data);

        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            showMessage('Login successful!', 'success');
            loadWorkouts();
        } else {
            showMessage(data.message || 'Login failed.', 'error');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showMessage('Login failed.', 'error');
    });
});

loadDataButton.addEventListener('click', function () {
    loadWorkouts();
});

addWorkoutForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
        return;
    }

    const id = Number(addWorkoutForm.querySelector('[name="id"]').value);
    const workout = addWorkoutForm.querySelector('[name="workout"]').value.trim();
    const category = addWorkoutForm.querySelector('[name="category"]').value;

    fetch('http://127.0.0.1:5000/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, workout, category })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Add workout response:', data);

        if (data.status === 'success') {
            showMessage('Workout added successfully!', 'success');
            addWorkoutForm.reset();
            loadWorkouts();
        } else {
            showMessage(data.message || 'Failed to add workout.', 'error');
        }
    })
    .catch(error => {
        console.error('Add workout error:', error);
        showMessage('Failed to add workout.', 'error');
    });
});

logoutButton.addEventListener('click', function () {
    localStorage.removeItem('access_token');
    renderWorkouts([]);
    showMessage('Logged out successfully.', 'success');
});

clearWorkoutsButton.addEventListener('click', function () {
    workoutList.innerHTML = '';
    showMessage('Workout list cleared.', 'success');
});

if (savedToken) {
    loadWorkouts();
} else {
    renderWorkouts([]);
}
