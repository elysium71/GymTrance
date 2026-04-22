# Day 4 Notes

## Tasks Completed:
1. **Tested User Authentication**:
   - Successfully tested the **Register** and **Login** functionality using Thunder Client.
   - Implemented **POST** method to register users and validate credentials for login.

2. **Tested Workout Management**:
   - **GET**: Successfully retrieved workout data from `/data`.
   - **POST**: Successfully added new workouts with validation for required fields.
   - **PUT**: Successfully updated workouts and handled invalid workout ID cases.
   - **DELETE**: Successfully deleted workouts and handled non-existing workout cases.

3. **Frontend UI/UX**:
   - Registered users and logged in through the **browser**, making use of the **JavaScript** to send JSON data via `fetch` API.
   - Styled the registration and login forms using **CSS** to improve the UI.

4. **Error Handling**:
   - Ensured proper error messages were returned for missing fields, invalid credentials, and non-existing workouts.

---

## New Packages Installed:
1. **Flask-JWT-Extended**:
   - For handling **JWT-based authentication** in your Flask app.
   - Allows you to create **JWT tokens** and protect routes with **`@jwt_required()`**.

   **Command used**:
   ```bash
   pip install Flask-JWT-Extended