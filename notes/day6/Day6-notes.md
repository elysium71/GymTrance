# Day 6 Notes

## Tasks Completed:
1. **Fixed Frontend Form Handling**:
   - Corrected the **register** and **login** form targeting in the frontend.
   - Ensured JavaScript event listeners were attached to the actual forms.
   - Prevented incorrect selector usage and form submission issues.

2. **Saved JWT Token in Browser**:
   - Stored the **JWT access token** in `localStorage` after a successful login.
   - Verified that the token remains available after refreshing the page.
   - Added console logging to confirm token persistence during testing.

3. **Tested Protected Route Access**:
   - Confirmed that the backend `/data` route is protected using **`@jwt_required()`**.
   - Added frontend logic to send the saved token in the **Authorization header**.
   - Successfully tested access to protected workout data using:
     - `Authorization: Bearer <token>`

4. **Improved Frontend UI Feedback**:
   - Replaced most popup alerts with an on-page **message box**.
   - Displayed success and error messages directly in the UI for:
     - Register
     - Login
     - Load Workouts

5. **Frontend Code Cleanup**:
   - Moved JavaScript logic out of `index.html` and into `app/static/js/app.js`.
   - Linked the external JavaScript file from the template.
   - Reduced duplicate frontend logic and improved project structure.

---

## Features Improved:
1. **Authentication Flow**:
   - Registration and login now work more cleanly from the browser.
   - Login now has real meaning because the token is saved and reused.

2. **Protected API Access**:
   - The frontend can now call a protected backend route using the saved JWT.
   - This is an important step toward secure user-specific workout access.

3. **User Experience**:
   - Users now get visible status messages on the page instead of relying only on alerts.
   - The app feels more like a real web application.

---

## Problems Faced:
1. **Branch Confusion**:
   - Some completed work was not visible at first because progress existed on the `code` branch instead of `main`.

2. **Frontend Selector Issues**:
   - Early form selectors were targeting the wrong elements.
   - This caused confusion when testing registration and login behavior.

3. **Token Debugging**:
   - It was necessary to confirm whether the JWT was actually being saved and loaded correctly.
   - Testing with browser console and `localStorage` helped identify the issue.

---

## What I Learned:
- Difference between **HTML structure** and **JavaScript behavior**
- How to store and reuse a **JWT token** in the browser
- How protected routes work with **Authorization headers**
- Why separating logic into `app.js` makes the frontend easier to manage
- How to test frontend changes step by step using:
  - Browser console
  - Local Storage
  - Flask server logs

---

## Git Commits:
```bash
Show auth and workout status messages in the UI
Add Day 6 notes
```

---

## Next Step (Day 7)
- Show workout data on the page instead of only logging it in console
- Add a proper workout list section in the UI
- Begin improving the workout management experience for the logged-in user

---

## Reflection

Today I connected the frontend and backend more completely.
The app now supports login, token storage, protected route access, and clearer user feedback.
This was an important step from basic feature testing toward a more realistic and secure web application.
