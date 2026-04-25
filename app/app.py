from flask import Flask, render_template, request, jsonify
# Implement User Authentication
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import json
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3 #SQL database for user authentication
import re #for password validation
from datetime import timedelta 


PRESET_FILE = "data/workouts.json"
WORKOUT_SECTION_FILE = "data/workoutsection.json"
WORKOUT_HISTORY_FILE = "data/workouthistory.json"

Path("data").mkdir(exist_ok=True)

if not Path(PRESET_FILE).exists():
    with open(PRESET_FILE, "w") as f:
        f.write("[]")

if not Path(WORKOUT_SECTION_FILE).exists():
    with open(WORKOUT_SECTION_FILE, "w") as f:
        f.write("[]")

if not Path(WORKOUT_HISTORY_FILE).exists():
    with open(WORKOUT_HISTORY_FILE, "w") as f:
        f.write("[]")



# Initialize Flask app and JWT
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "users.db"
ALLOWED_CATEGORIES = {"Strength", "Cardio", "Flexibility"}

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # secret key
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)  # Set token expiration
jwt = JWTManager(app)
# Custom response for unauthorized access

@jwt.unauthorized_loader
def custom_unauthorized_response(err_str):
    return jsonify({
        "status": "error",
        "message": "Missing or invalid Authorization header."
    }), 401

@jwt.invalid_token_loader
def custom_invalid_token_response(err_str):
    return jsonify({
        "status": "error",
        "message": "Invalid token. Please log in again."
    }), 422

@jwt.expired_token_loader
def custom_expired_token_response(jwt_header, jwt_payload):
    return jsonify({
        "status": "error",
        "message": "Token has expired. Please log in again."
    }), 401

PRESET_FILE = "data/workouts.json"
WORKOUT_SECTION_FILE = "data/workoutsection.json"

Path("data").mkdir(exist_ok=True)

if not Path(PRESET_FILE).exists():
    with open(PRESET_FILE, "w") as f:
        f.write("[]")

if not Path(WORKOUT_SECTION_FILE).exists():
    with open(WORKOUT_SECTION_FILE, "w") as f:
        f.write("[]")


# Assuming you have a SQLite database 'users.db'
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT)''')
    conn.commit()
    conn.close()

# Password validation
def is_password_strong(password):
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[0-9]", password):
        errors.append("Password must contain at least one number.")
    if not re.search(r"[\W_]", password):  # Special character
        errors.append("Password must contain at least one special character.")
    
    return errors if errors else True


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)   # Get JSON data from the request, Flask will not throw an error if body is empty or invalid JSON

    if not data: # Validate that we received JSON data
        return jsonify({"message": "Invalid or missing JSON body."}), 400

    username = (data.get("username") or "").strip() # trim username before validation/query.
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Please enter a valid username and password."}), 400

    password_validation_result = is_password_strong(password)
    if password_validation_result != True:
        return jsonify({"errors": password_validation_result}), 400

    # Check if user exists
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username=?", (username,))
    if c.fetchone():
        conn.close()
        return jsonify({"message": "Username already taken. Please choose a different one."}), 400

    # Store the user
    hashed_password = generate_password_hash(password)
    c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_password))
    conn.commit()
    conn.close()

    return jsonify({"message": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)   # Get JSON data from the request, Flask will not throw an error if body is empty or invalid JSON
    if not data:  # Validate that we received JSON data
        return jsonify({"message": "Invalid or missing JSON body."}), 400
    username = (data.get("username") or "").strip() # trim username before validation/query.
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Please enter both username and password."}), 400

    # Check if the user exists in the database
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username=?", (username,))
    user = c.fetchone()

    if not user:  # Username not found
        conn.close()
        return jsonify({"message": "Invalid username. Please check your credentials."}), 401

    # Compare the password
    stored_password_hash = user[1]  # Assuming password is in the second column
    if not check_password_hash(stored_password_hash, password):
        conn.close()
        return jsonify({"message": "Incorrect password. Please try again."}), 401

    # Create JWT token if login is successful
    access_token = create_access_token(identity=username)
    conn.close()
    return jsonify({"access_token": access_token}), 200


@app.route("/workouts")
def workouts_home():
    return render_template("workouts_home.html")

@app.route("/workouts/current")
def current_workout_page():
    preset_workouts = load_preset_workouts()
    return render_template("workouts_current.html", preset_workouts=preset_workouts)

@app.route("/workouts/history")
def workout_history_page():
    return render_template("workouts_history.html")



# load data safely
def load_preset_workouts():
    try:
        with open(PRESET_FILE, "r") as file:
            return json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(PRESET_FILE, "w") as file:
            json.dump([], file)
        return []

def load_workout_sections():
    try:
        with open(WORKOUT_SECTION_FILE, "r") as file:
            return json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(WORKOUT_SECTION_FILE, "w") as file:
            json.dump([], file)
        return []

def save_workout_sections(workouts):
    with open(WORKOUT_SECTION_FILE, "w") as file:
        json.dump(workouts, file, indent=4)

def load_workout_history():
    try:
        with open(WORKOUT_HISTORY_FILE, "r") as file:
            return json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(WORKOUT_HISTORY_FILE, "w") as file:
            json.dump([], file)
        return []

def save_workout_history(history):
    with open(WORKOUT_HISTORY_FILE, "w") as file:
        json.dump(history, file, indent=4)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/history-data", methods=["GET"])
@jwt_required()
def get_history_data():
    current_user = get_jwt_identity()
    history = load_workout_history()

    user_history = [item for item in history if item.get("owner") == current_user]

    return jsonify({
        "status": "success",
        "message": "Workout history retrieved",
        "data": user_history
    }), 200

# GET all workouts

@app.route("/data", methods=["GET"])
@jwt_required()
def get_data():
    current_user = get_jwt_identity()
    workouts = load_workout_sections()

    user_workouts = [w for w in workouts if w.get("owner") == current_user]

    category = (request.args.get("category") or "").strip()
    keyword = (request.args.get("q") or "").strip().lower()

    if category:
        user_workouts = [w for w in user_workouts if w.get("category") == category]

    if keyword:
        user_workouts = [
            w for w in user_workouts
            if keyword in (w.get("workout") or "").lower()
        ]

    return jsonify({
        "status": "success",
        "message": "Workouts retrieved",
        "data": user_workouts
    }), 200



# POST new workout
@app.route("/data", methods=["POST"])
@jwt_required()
def handle_post():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    if "workout" not in data or "category" not in data:
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    if not isinstance(data["workout"], str) or not data["workout"].strip():
        return jsonify({"status": "error", "message": "Workout must be non-empty string"}), 400
    if not isinstance(data["category"], str):
        return jsonify({"status": "error", "message": "Category must be string"}), 400

    preset_id = data.get("preset_id")
    if preset_id is not None and not isinstance(preset_id, int):
        return jsonify({"status": "error", "message": "preset_id must be integer"}), 400

    category = data["category"].strip().title()
    if category not in ALLOWED_CATEGORIES:
        return jsonify({
            "status": "error",
            "message": f"Invalid category. Allowed: {', '.join(sorted(ALLOWED_CATEGORIES))}"
        }), 400

    current_user = get_jwt_identity()
    workouts = load_workout_sections()

    custom_ids = [
        item.get("id", 0)
        for item in workouts
        if isinstance(item.get("id"), int) and item.get("id") >= 10000
    ]

    next_id = max(custom_ids, default=9999) + 1

    new_workout = {
        "id": next_id,
        "preset_id": preset_id,
        "workout": data["workout"].strip(),
        "category": category,
        "owner": current_user,
        "is_preset": False
    }

    workouts.append(new_workout)
    save_workout_sections(workouts)

    return jsonify({
        "status": "success",
        "message": "Workout added",
        "data": new_workout
    }), 201

@app.route("/finish-workout", methods=["POST"])
@jwt_required()
def finish_workout():
    current_user = get_jwt_identity()
    current_workouts = load_workout_sections()
    workout_history = load_workout_history()

    user_workouts = [w for w in current_workouts if w.get("owner") == current_user]

    if not user_workouts:
        return jsonify({
            "status": "error",
            "message": "No active workout to finish"
        }), 400

    workout_history.append({
        "owner": current_user,
        "completed_workout": user_workouts
    })
    save_workout_history(workout_history)

    remaining_workouts = [w for w in current_workouts if w.get("owner") != current_user]
    save_workout_sections(remaining_workouts)

    return jsonify({
        "status": "success",
        "message": "Workout finished successfully"
    }), 200


# PUT update workout
@app.route("/data/<int:workout_id>", methods=["PUT"])
@jwt_required()
def update_workout(workout_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    if "workout" not in data and "category" not in data and "sets" not in data and "reps" not in data:
        return jsonify({"status": "error", "message": "Nothing to update"}), 400


    current_user = get_jwt_identity()
    workouts = load_workout_sections()
    workout_to_update = None

    for w in workouts:
        if w["id"] == workout_id:
            if w.get("owner") != current_user:
                return jsonify({
                    "status": "error",
                    "message": "You are not allowed to modify this workout."
                }), 403

            if "workout" in data:
                if not isinstance(data["workout"], str) or not data["workout"].strip():
                    return jsonify({"status": "error", "message": "Workout must be non-empty string"}), 400
                w["workout"] = data["workout"].strip()

            if "category" in data:
                if not isinstance(data["category"], str):
                    return jsonify({"status": "error", "message": "Category must be string"}), 400
                category = data["category"].strip().title()
                if category not in ALLOWED_CATEGORIES:
                    return jsonify({
                        "status": "error",
                        "message": f"Invalid category. Allowed: {', '.join(sorted(ALLOWED_CATEGORIES))}"
                    }), 400
                w["category"] = category

            if "sets" in data:
                if not isinstance(data["sets"], int) or data["sets"] <= 0:
                    return jsonify({"status": "error", "message": "Sets must be a positive integer"}), 400
                w["sets"] = data["sets"]

            if "reps" in data:
                if not isinstance(data["reps"], list) or not data["reps"]:
                    return jsonify({"status": "error", "message": "Reps must be a non-empty list"}), 400
                if not all(isinstance(rep, int) and rep > 0 for rep in data["reps"]):
                    return jsonify({"status": "error", "message": "Each rep value must be a positive integer"}), 400
                w["reps"] = data["reps"]
                w["sets"] = len(data["reps"])
            
            if "set_details" in data:
                if not isinstance(data["set_details"], list) or not data["set_details"]:
                    return jsonify({"status": "error", "message": "set_details must be a non-empty list"}), 400

                cleaned_sets = []
                for set_item in data["set_details"]:
                    if not isinstance(set_item, dict):
                        return jsonify({"status": "error", "message": "Each set must be an object"}), 400

                    reps = set_item.get("reps")
                    kg = set_item.get("kg", 0)

                    if not isinstance(reps, int) or reps <= 0:
                        return jsonify({"status": "error", "message": "Each set reps must be a positive integer"}), 400

                    if not isinstance(kg, (int, float)) or kg < 0:
                        return jsonify({"status": "error", "message": "Each set kg must be zero or positive"}), 400

                    cleaned_sets.append({
                        "reps": reps,
                        "kg": kg
                    })

                w["set_details"] = cleaned_sets
                w["sets"] = len(cleaned_sets)
                w["reps"] = [item["reps"] for item in cleaned_sets]



            workout_to_update = w
            break

    if not workout_to_update:
        return jsonify({"status": "error", "message": "Workout not found"}), 404

    save_workout_sections(workouts)

    return jsonify({
        "status": "success",
        "message": "Workout updated",
        "data": workout_to_update
    }), 200



# DELETE workout
@app.route("/data/<int:workout_id>", methods=["DELETE"])
@jwt_required()
def delete_workout(workout_id):
    current_user = get_jwt_identity()
    workouts = load_workout_sections()

    workout_to_delete = None
    for w in workouts:
        if w["id"] == workout_id:
            if w.get("owner") != current_user:
                return jsonify({
                    "status": "error",
                    "message": "You are not allowed to modify this workout."
                }), 403
            workout_to_delete = w
            break

    if not workout_to_delete:
        return jsonify({"status": "error", "message": "Workout not found"}), 404

    workouts.remove(workout_to_delete)
    save_workout_sections(workouts)


    return jsonify({
        "status": "success",
        "message": "Workout deleted"
    }), 200



if __name__ == "__main__":
    init_db()
    app.run(debug=True)