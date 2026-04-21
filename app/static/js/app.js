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
            alert('Login successful!');

            // Store the access token (in localStorage or sessionStorage)
            localStorage.setItem('access_token', data.access_token);

            // Now fetch the workouts using the token
            fetchWorkouts(data.access_token);
        } else if (data.message) {
            alert(data.message);  // Display the error message from the backend
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Login failed.');
    });
});

// Function to fetch workouts after successful login
function fetchWorkouts(token) {
    fetch('http://127.0.0.1:5000/data', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`  // Add the token in the Authorization header
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            // Display workouts on the page
            const workouts = data.data;
            let workoutList = '<ul>';
            workouts.forEach(workout => {
                workoutList += `<li>${workout.workout}</li>`;
            });
            workoutList += '</ul>';
            document.querySelector('#workouts').innerHTML = workoutList; // Assuming you have an element with id 'workouts'
        } else {
            alert('Failed to fetch workouts.');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Error fetching workouts.');
    });
}