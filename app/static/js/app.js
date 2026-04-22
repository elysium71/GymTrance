const registerForm = document.querySelector('#register-form');
const loginForm = document.querySelector('#login-form-element');
const loadDataButton = document.querySelector('#load-data-btn');
const messageBox = document.querySelector('#message-box');

const savedToken = localStorage.getItem('access_token');
console.log('Token on page load:', savedToken);

if (savedToken) {
    console.log('Token already exists:', savedToken);
} else {
    console.log('No token found');
}

function showMessage(message, type) {
    messageBox.textContent = message;

    if (type === 'success') {
        messageBox.style.color = 'green';
    } else if (type === 'error') {
        messageBox.style.color = 'red';
    } else {
        messageBox.style.color = 'black';
    }
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

        if (data.message) {
            showMessage(data.message, 'success');
        } else if (data.errors) {
            showMessage(data.errors.join(' '), 'error');
        } else {
            showMessage('Registration completed.', 'success');
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
            console.log('Saved token:', localStorage.getItem('access_token'));
            showMessage('Login successful!', 'success');
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
    const token = localStorage.getItem('access_token');

    if (!token) {
        showMessage('Please log in first.', 'error');
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
        } else {
            showMessage(data.message || 'Failed to load workouts.', 'error');
        }
    })
    .catch(error => {
        console.error('Load workouts error:', error);
        showMessage('Failed to load workouts.', 'error');
    });
});
