# Day 2 — Backend API Development

##  Goal

Build a functional backend API and start handling data properly.

---

##  What I Built

### 1. Flask API Endpoints

* **GET /data**
  * Retrieve all workouts
  * 
* **POST /data**
  * Add new workout
  * 
* **DELETE /data/<id>**
  * Delete workout by ID

---

### 2. JSON File Storage

* Created `data/workouts.json`
* Stored workouts as a list of objects
* Implemented helper functions:

  * `load_workouts()` → read data from file
  * `save_workouts()` → write data to file

---

### 3. API Testing

* Used **Thunder Client (VS Code)**
* Tested:

  * GET request (browser + Thunder Client)
  * POST request (send JSON data)
  * DELETE request (remove workout)

---

### 4. Input Validation (Security)

Added validation to prevent bad input:

* Check if data exists
* Check required fields (`id`, `workout`)
* Ensure:

  * `id` is integer
  * `workout` is string

Example invalid input:

```json
{
  "id": "abc",
  "workout": "Squat"
}
```

Response:

```json
{
  "error": "ID must be integer"
}
```
will add more validation in future.
---

### 5. Error Handling

* 400 → Bad Request (invalid input)
* 404 → Not Found (delete non-existing workout)
* 201 → Created (successful POST)

---

### 6. CRUD Functionality

* Create → POST
* Read → GET
* Delete → DELETE

(Basic CRUD completed)

---

### 7. Git Workflow

* Used:

  * `git add`
  * `git commit`
  * `git push`
* Committed at key stages:

  * API setup
  * JSON storage
  * Validation
  * DELETE endpoint

---

##  Security Awareness

Learned about: SQL injection, since anyone can GET,POST and DELETE, authentication or authorization


---

##  Current Limitations

* No authentication (anyone can access API)
* No authorization (no user ownership)
* No database (only JSON file)
* No protection against duplicate IDs

---

##  Next Steps (Day 3)

* Implement login system (authentication)
* Add user sessions
* Protect endpoints
* Explore security vulnerabilities and fixes

---

##  Key Takeaways

* Learned how APIs work (request → response)
* Practiced backend data handling
* Introduced security mindset early
* Built a functional mini backend system
