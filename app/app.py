from flask import Flask, render_template, request, jsonify
# Implement User Authentication
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import json
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3 #SQL database for user authentication
import re ## for password validation

# Initialize Flask app and JWT
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "users.db"

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # secret key
jwt = JWTManager(app)

DATA_FILE = "data/workouts.json"

# ensure file exists
Path("data").mkdir(exist_ok=True)
if not Path(DATA_FILE).exists():
    with open(DATA_FILE, "w") as f:
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

# load data safely
def load_workouts():
    try:
        with open(DATA_FILE, "r") as file:
            return json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(DATA_FILE, "w") as file:
            json.dump([], file)
        return []

# save data
def save_workouts(workouts):
    with open(DATA_FILE, "w") as file:
        json.dump(workouts, file, indent=4)

@app.route("/")
def index():
    return render_template("index.html")

# GET all workouts

@app.route("/data", methods=["GET"])
@jwt_required()  # Protect the route with JWT authentication
def get_data():
    workouts = load_workouts()
    return jsonify({
        "status": "success",
        "message": "Workouts retrieved",
        "data": workouts
    }), 200

# POST new workout
@app.route("/data", methods=["POST"])
def handle_post():
    data = request.get_json()

    # validate input
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    if "id" not in data or "workout" not in data:
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    if not isinstance(data["id"], int):
        return jsonify({"status": "error", "message": "ID must be integer"}), 400
    if not isinstance(data["workout"], str):
        return jsonify({"status": "error", "message": "Workout must be string"}), 400

    workouts = load_workouts()

    # check duplicate id
    if any(item.get("id") == data["id"] for item in workouts):
        return jsonify({"status": "error", "message": "Workout id already existed"}), 400

    workouts.append(data)
    save_workouts(workouts)

    return jsonify({
        "status": "success",
        "message": "Workout added",
        "data": data
    }), 201

# PUT update workout
@app.route("/data/<int:workout_id>", methods=["PUT"])
def update_workout(workout_id):
    data = request.get_json()

    # validate input
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    if "workout" not in data:
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    if not isinstance(data["workout"], str):
        return jsonify({"status": "error", "message": "Workout must be string"}), 400

    workouts = load_workouts()
    workout_to_update = None

    # find and update
    for w in workouts:
        if w["id"] == workout_id:
            w["workout"] = data["workout"]
            workout_to_update = w
            break

    if not workout_to_update:
        return jsonify({"status": "error", "message": "Workout not found"}), 404

    save_workouts(workouts)

    return jsonify({
        "status": "success",
        "message": "Workout updated",
        "data": workout_to_update
    }), 200

# DELETE workout
@app.route("/data/<int:workout_id>", methods=["DELETE"])
def delete_workout(workout_id):
    workouts = load_workouts()

    workout_to_delete = None
    for w in workouts:
        if w["id"] == workout_id:
            workout_to_delete = w
            break

    if not workout_to_delete:
        return jsonify({"status": "error", "message": "Workout not found"}), 404

    workouts.remove(workout_to_delete)
    save_workouts(workouts)

    return jsonify({
        "status": "success",
        "message": "Workout deleted"
    }), 200

if __name__ == "__main__":
    init_db()
    app.run(debug=True)