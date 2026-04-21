document.querySelector('#registration-form form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    let username = document.querySelector('[name="username"]').value;
    let password = document.querySelector('[name="password"]').value;

    // Send JSON data via fetch API
    fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // Ensure Content-Type is JSON
        },
        body: JSON.stringify({ username, password })  // Send data as JSON
    })
    .then(response => response.json())
    .then(data => {
        if (data.errors) {
            // Display errors to the user
            alert(data.errors.join("\n"));
        } else if (data.message) {
            // Show success message
            alert(data.message); // Show success message only once
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Error occurred during registration.');
    });
});

document.querySelector('#login-form form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    let username = document.querySelector('[name="username"]').value;
    let password = document.querySelector('[name="password"]').value;

    // Send JSON data via fetch API
    fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // Ensure Content-Type is JSON
        },
        body: JSON.stringify({ username, password })  // Send data as JSON
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            alert('Login successful! Token: ' + data.access_token);
        } else if (data.message) {
            alert(data.message);  // Display the error message from the backend
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Login failed.');
    });
});