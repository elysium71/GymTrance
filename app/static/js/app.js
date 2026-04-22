const registerForm = document.querySelector('#register-form');
const loginForm = document.querySelector('#login-form-element');
const loadDataButton = document.querySelector('#load-data-btn');

const savedToken = localStorage.getItem('access_token');
console.log('Token on page load:', savedToken);

if (savedToken) {
    console.log('Token already exists:', savedToken);
} else {
    console.log('No token found');
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
        alert(data.message || 'Registration completed');
    })
    .catch(error => {
        console.error('Registration error:', error);
        alert('Error occurred during registration.');
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
            alert('Login successful!');
        } else {
            alert(data.message || 'Login failed');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('Login failed.');
    });
});

loadDataButton.addEventListener('click', function () {
    const token = localStorage.getItem('access_token');

    if (!token) {
        alert('Please log in first');
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
        alert('Workouts loaded successfully!');
    })
    .catch(error => {
        console.error('Load workouts error:', error);
        alert('Failed to load workouts.');
    });
});
