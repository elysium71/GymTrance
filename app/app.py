from flask import Flask, render_template, request, jsonify, send_file
# Implement User Authentication
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import json
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3 #SQL database for user authentication
import re #for password validation
from datetime import datetime, timedelta 
from io import BytesIO
from urllib.request import urlopen
from urllib.error import URLError, HTTPError
from PIL import Image


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = BASE_DIR / "users.db"

DATA_DIR.mkdir(exist_ok=True)

PRESET_FILE = DATA_DIR / "workouts.json"
WORKOUT_SECTION_FILE = DATA_DIR / "workoutsection.json"
WORKOUT_HISTORY_FILE = DATA_DIR / "workouthistory.json"
ROUTINE_FILE = DATA_DIR / "routines.json"
ROUTINE_FOLDER_FILE = DATA_DIR / "routinefolders.json"
THUMBNAIL_DIR = DATA_DIR / "thumbnails"
GIF_DIR = DATA_DIR / "gif"

THUMBNAIL_DIR.mkdir(exist_ok=True)
GIF_DIR.mkdir(exist_ok=True)

if not PRESET_FILE.exists():
    with open(PRESET_FILE, "w", encoding="utf-8") as f:
        f.write("[]")

if not WORKOUT_SECTION_FILE.exists():
    with open(WORKOUT_SECTION_FILE, "w", encoding="utf-8") as f:
        f.write("[]")

if not WORKOUT_HISTORY_FILE.exists():
    with open(WORKOUT_HISTORY_FILE, "w", encoding="utf-8") as f:
        f.write("[]")

if not ROUTINE_FILE.exists():
    with open(ROUTINE_FILE, "w", encoding="utf-8") as f:
        f.write("[]")

if not ROUTINE_FOLDER_FILE.exists():
    with open(ROUTINE_FOLDER_FILE, "w", encoding="utf-8") as f:
        f.write("[]")


# Initialize Flask app and JWT

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # secret key
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)  # Set token expiration
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
    preset_workouts = load_preset_workouts()
    return render_template("workouts_home.html", preset_workouts=preset_workouts)

@app.route("/workouts/current")
def current_workout_page():
    preset_workouts = load_preset_workouts()
    equipment_options = sorted({
        equipment
        for workout in preset_workouts
        for equipment in workout.get("equipments", [])
        if isinstance(equipment, str) and equipment.strip()
    })
    body_part_options = sorted({
        body_part.strip()
        for workout in preset_workouts
        for body_part in workout.get("bodyParts", [])
        if isinstance(body_part, str) and body_part.strip()
    })
    return render_template(
        "workouts_current.html",
        preset_workouts=preset_workouts,
        equipment_options=equipment_options,
        body_part_options=body_part_options
    )

@app.route("/workouts/history")
def workout_history_page():
    return render_template("workouts_history.html")



# load data safely
def load_preset_workouts():
    try:
        with open(PRESET_FILE, "r", encoding="utf-8") as file:
            workouts = json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(PRESET_FILE, "w", encoding="utf-8") as file:
            json.dump([], file)
        return []

    if not isinstance(workouts, list):
        return []

    available_gif_ids = {path.stem for path in GIF_DIR.glob("*.gif")}
    return [
        workout for workout in workouts
        if isinstance(workout, dict)
        and workout.get("exerciseId") in available_gif_ids
    ]

def load_workout_sections():
    try:
        with open(WORKOUT_SECTION_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(WORKOUT_SECTION_FILE, "w", encoding="utf-8") as file:
            json.dump([], file)
        return []

def save_workout_sections(workouts):
    with open(WORKOUT_SECTION_FILE, "w", encoding="utf-8") as file:
        json.dump(workouts, file, indent=4)

def load_workout_history():
    try:
        with open(WORKOUT_HISTORY_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(WORKOUT_HISTORY_FILE, "w", encoding="utf-8") as file:
            json.dump([], file)
        return []

def save_workout_history(history):
    with open(WORKOUT_HISTORY_FILE, "w", encoding="utf-8") as file:
        json.dump(history, file, indent=4)


def load_routines():
    try:
        with open(ROUTINE_FILE, "r", encoding="utf-8") as file:
            routines = json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(ROUTINE_FILE, "w", encoding="utf-8") as file:
            json.dump([], file)
        return []

    return routines if isinstance(routines, list) else []


def save_routines(routines):
    with open(ROUTINE_FILE, "w", encoding="utf-8") as file:
        json.dump(routines, file, indent=4)


def load_routine_folders():
    try:
        with open(ROUTINE_FOLDER_FILE, "r", encoding="utf-8") as file:
            folders = json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        with open(ROUTINE_FOLDER_FILE, "w", encoding="utf-8") as file:
            json.dump([], file)
        return []

    return folders if isinstance(folders, list) else []


def save_routine_folders(folders):
    with open(ROUTINE_FOLDER_FILE, "w", encoding="utf-8") as file:
        json.dump(folders, file, indent=4)


def normalize_text(value):
    if value is None:
        return ""
    if not isinstance(value, str):
        return ""
    return value.strip()


def normalize_string_list(value):
    if value is None:
        return []

    if isinstance(value, str):
        parts = [item.strip() for item in value.split(",")]
        return [item for item in parts if item]

    if isinstance(value, list):
        cleaned_items = []
        for item in value:
            if isinstance(item, str):
                stripped = item.strip()
                if stripped:
                    cleaned_items.append(stripped)
        return cleaned_items

    return []


def clean_routine_exercises(exercises):
    if not isinstance(exercises, list) or not exercises:
        return None, "Add at least one exercise"

    cleaned_exercises = []
    for exercise in exercises:
        if not isinstance(exercise, dict):
            return None, "Each exercise must be an object"

        preset_id = normalize_text(exercise.get("preset_id"))
        if not preset_id or not find_preset_workout(preset_id):
            return None, "Choose a valid preset exercise"

        sets = exercise.get("sets")
        rep_min = exercise.get("rep_min")
        rep_max = exercise.get("rep_max")

        if not isinstance(sets, int) or sets <= 0:
            return None, "Sets must be a positive number"
        if not isinstance(rep_min, int) or rep_min <= 0:
            return None, "Rep min must be a positive number"
        if not isinstance(rep_max, int) or rep_max < rep_min:
            return None, "Rep max must be at least rep min"

        preset_workout = find_preset_workout(preset_id)
        cleaned_exercises.append({
            "preset_id": preset_id,
            "name": preset_workout.get("name", "Preset workout"),
            "sets": sets,
            "rep_min": rep_min,
            "rep_max": rep_max
        })

    return cleaned_exercises, None


def find_preset_workout(exercise_id):
    preset_workouts = load_preset_workouts()
    for workout in preset_workouts:
        if workout.get("exerciseId") == exercise_id:
            return workout
    return None


def enrich_workout_record(workout):
    if not isinstance(workout, dict):
        return workout

    preset_id = workout.get("preset_id") or workout.get("exerciseId")
    if not preset_id:
        return workout

    preset_workout = find_preset_workout(str(preset_id))
    if not preset_workout:
        return workout

    enriched_workout = dict(workout)
    exercise_id = preset_workout.get("exerciseId")
    gif_path = GIF_DIR / f"{exercise_id}.gif" if exercise_id else None

    enriched_workout["exerciseId"] = exercise_id
    enriched_workout["instructions"] = preset_workout.get("instructions", [])
    enriched_workout["gifUrl"] = (
        f"/exercise-gif/{exercise_id}"
        if gif_path and gif_path.exists()
        else None
    )

    return enriched_workout


def calculate_muscle_split(workouts):
    muscle_scores = {}

    for workout in workouts:
        if not isinstance(workout, dict):
            continue

        set_details = workout.get("set_details", [])
        if isinstance(set_details, list) and set_details:
            set_count = sum(1 for set_item in set_details if isinstance(set_item, dict) and set_item.get("done") is True)
        else:
            set_count = 1 if workout.get("completed") is True else 0

        if set_count <= 0:
            continue

        primary_muscles = normalize_string_list(workout.get("primaryMuscles"))
        secondary_muscles = normalize_string_list(workout.get("secondaryMuscles"))

        for muscle in primary_muscles:
            muscle_scores[muscle] = muscle_scores.get(muscle, 0) + set_count

        for muscle in secondary_muscles:
            muscle_scores[muscle] = muscle_scores.get(muscle, 0) + (set_count * 0.5)

    total_score = sum(muscle_scores.values())
    if total_score <= 0:
        return []

    muscle_split = [
        {
            "muscle": muscle,
            "percent": round((score / total_score) * 100)
        }
        for muscle, score in muscle_scores.items()
    ]
    muscle_split.sort(key=lambda item: item["percent"], reverse=True)

    rounding_gap = 100 - sum(item["percent"] for item in muscle_split)
    if muscle_split and rounding_gap:
        muscle_split[0]["percent"] += rounding_gap

    return muscle_split


MUSCLE_MAP_ALIASES = {
    "chest": {"chest", "pectorals", "upper chest"},
    "shoulders": {"shoulders", "delts", "deltoids", "rear deltoids", "rotator cuff"},
    "biceps": {"biceps", "brachialis"},
    "triceps": {"triceps"},
    "forearms": {"forearms", "lower arms", "wrists", "wrist extensors", "wrist flexors", "grip muscles", "hands"},
    "abs": {"abs", "abdominals", "core", "lower abs", "obliques", "waist"},
    "upper_back": {"back", "upper back", "lats", "latissimus dorsi", "rhomboids", "trapezius", "traps", "levator scapulae"},
    "lower_back": {"lower back", "spine"},
    "glutes": {"glutes"},
    "quads": {"quadriceps", "quads", "upper legs"},
    "hamstrings": {"hamstrings"},
    "calves": {"calves", "soleus", "lower legs", "shins", "ankles", "ankle stabilizers", "feet"},
    "hips": {"hip flexors", "adductors", "abductors", "inner thighs", "groin"},
    "neck": {"neck", "sternocleidomastoid"},
}

MUSCLE_MAP_LABELS = {
    "chest": "Chest",
    "shoulders": "Shoulders",
    "biceps": "Biceps",
    "triceps": "Triceps",
    "forearms": "Forearms",
    "abs": "Abs",
    "upper_back": "Upper Back",
    "lower_back": "Lower Back",
    "glutes": "Glutes",
    "quads": "Quads",
    "hamstrings": "Hamstrings",
    "calves": "Calves",
    "hips": "Hips",
    "neck": "Neck",
}


def muscle_map_group(muscle):
    normalized_muscle = normalize_text(muscle).lower()
    for group, aliases in MUSCLE_MAP_ALIASES.items():
        if normalized_muscle in aliases:
            return group
    return normalized_muscle.replace(" ", "_") if normalized_muscle else None


def calculate_muscle_map(workouts):
    group_hits = {}

    for workout in workouts:
        if not isinstance(workout, dict):
            continue

        set_details = workout.get("set_details", [])
        if isinstance(set_details, list) and set_details:
            has_completed_set = any(
                isinstance(set_item, dict) and set_item.get("done") is True
                for set_item in set_details
            )
        else:
            has_completed_set = workout.get("completed") is True

        if not has_completed_set:
            continue

        primary_groups = {
            muscle_map_group(muscle)
            for muscle in normalize_string_list(workout.get("primaryMuscles"))
        }
        secondary_groups = {
            muscle_map_group(muscle)
            for muscle in normalize_string_list(workout.get("secondaryMuscles"))
        }

        for group in primary_groups:
            if not group:
                continue
            group_hits.setdefault(group, {"primary": 0, "secondary": 0})
            group_hits[group]["primary"] += 1

        for group in secondary_groups:
            if not group:
                continue
            group_hits.setdefault(group, {"primary": 0, "secondary": 0})
            group_hits[group]["secondary"] += 1

    muscle_map = []
    for group, hits in group_hits.items():
        if hits["primary"] > 0 or hits["secondary"] >= 2:
            level = "primary"
        elif hits["secondary"] == 1:
            level = "secondary"
        else:
            level = "none"

        muscle_map.append({
            "group": group,
            "label": MUSCLE_MAP_LABELS.get(group, group.replace("_", " ").title()),
            "level": level,
            "primary_hits": hits["primary"],
            "secondary_hits": hits["secondary"]
        })

    muscle_map.sort(key=lambda item: (item["level"] != "primary", item["label"]))
    return muscle_map


def next_numeric_id(items, floor=9999):
    ids = [
        item.get("id", 0)
        for item in items
        if isinstance(item, dict)
        and isinstance(item.get("id"), int)
        and item.get("id") >= floor
    ]
    return max(ids, default=floor) + 1


def build_workout_from_routine_exercise(exercise, owner, workout_id):
    preset_id = str(exercise.get("preset_id") or "")
    preset_workout = find_preset_workout(preset_id)

    if not preset_workout:
        return None

    sets = exercise.get("sets", 1)
    rep_min = exercise.get("rep_min", 1)
    rep_max = exercise.get("rep_max", rep_min)

    if not isinstance(sets, int) or sets <= 0:
        sets = 1
    if not isinstance(rep_min, int) or rep_min <= 0:
        rep_min = 1
    if not isinstance(rep_max, int) or rep_max < rep_min:
        rep_max = rep_min

    set_details = [
        {
            "reps": rep_min,
            "kg": 0,
            "set_type": "working",
            "done": False
        }
        for _ in range(sets)
    ]

    return {
        "id": workout_id,
        "preset_id": preset_id,
        "workout": preset_workout.get("name", "Preset workout"),
        "equipment": (preset_workout.get("equipments") or [""])[0],
        "bodyParts": preset_workout.get("bodyParts", []),
        "primaryMuscles": preset_workout.get("targetMuscles", []),
        "secondaryMuscles": preset_workout.get("secondaryMuscles", []),
        "owner": owner,
        "is_preset": False,
        "completed": False,
        "notes": "",
        "sets": sets,
        "reps": [item["reps"] for item in set_details],
        "set_details": set_details,
        "routine_rep_min": rep_min,
        "routine_rep_max": rep_max
    }


def clean_set_details(set_details):
    if not isinstance(set_details, list) or not set_details:
        return None, "set_details must be a non-empty list"

    cleaned_sets = []
    for set_item in set_details:
        if not isinstance(set_item, dict):
            return None, "Each set must be an object"

        reps = set_item.get("reps")
        kg = set_item.get("kg", 0)
        set_type = set_item.get("set_type", "working")
        done = set_item.get("done", False)

        if not isinstance(reps, int) or reps <= 0:
            return None, "Each set reps must be a positive integer"

        if not isinstance(kg, (int, float)) or kg < 0:
            return None, "Each set kg must be zero or positive"

        if set_type not in {"warmup", "working", "drop", "failure"}:
            return None, "Invalid set type"

        if not isinstance(done, bool):
            return None, "done must be boolean"

        cleaned_sets.append({
            "reps": reps,
            "kg": kg,
            "set_type": set_type,
            "done": done
        })

    return cleaned_sets, None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/exercise-thumbnail/<exercise_id>")
def exercise_thumbnail(exercise_id):
    thumbnail_path = THUMBNAIL_DIR / f"{exercise_id}.png"
    gif_path = GIF_DIR / f"{exercise_id}.gif"

    if thumbnail_path.exists():
        return send_file(thumbnail_path, mimetype="image/png")

    gif_bytes = None
    if gif_path.exists():
        gif_bytes = gif_path.read_bytes()
    else:
        workout = find_preset_workout(exercise_id)
        if not workout or not workout.get("gifUrl"):
            return ("", 404)

        try:
            with urlopen(workout["gifUrl"]) as response:
                gif_bytes = response.read()
        except (HTTPError, URLError):
            return ("", 404)

    with Image.open(BytesIO(gif_bytes)) as gif_image:
        gif_image.seek(0)
        still_image = gif_image.convert("RGBA")
        still_image.save(thumbnail_path, format="PNG")

    return send_file(thumbnail_path, mimetype="image/png")


@app.route("/exercise-gif/<exercise_id>")
def exercise_gif(exercise_id):
    gif_path = GIF_DIR / f"{exercise_id}.gif"
    if gif_path.exists():
        return send_file(gif_path, mimetype="image/gif")
    return ("", 404)


@app.route("/history-data", methods=["GET"])
@jwt_required()
def get_history_data():
    current_user = get_jwt_identity()
    history = load_workout_history()

    user_history = []
    for index, item in enumerate(history):
        if item.get("owner") != current_user:
            continue

        completed_workouts = [
            enrich_workout_record(workout)
            for workout in item.get("completed_workout", [])
        ]
        session_name = item.get("session_name") or item.get("routine_name")
        if not session_name and completed_workouts:
            session_name = completed_workouts[0].get("routine_name") or completed_workouts[0].get("workout")

        enriched_item = dict(item)
        enriched_item["id"] = item.get("id", index + 1)
        enriched_item["session_name"] = session_name or "Workout"
        enriched_item["completed_at"] = item.get("completed_at", "")
        enriched_item["completed_workout"] = completed_workouts
        enriched_item["muscle_split"] = item.get("muscle_split") or calculate_muscle_split(completed_workouts)
        enriched_item["muscle_map"] = item.get("muscle_map") or calculate_muscle_map(completed_workouts)
        user_history.append(enriched_item)

    return jsonify({
        "status": "success",
        "message": "Workout history retrieved",
        "data": user_history
    }), 200


@app.route("/history-data/<int:history_id>", methods=["PUT"])
@jwt_required()
def update_history_data(history_id):
    data = request.get_json(silent=True)

    if not data or not isinstance(data.get("completed_workout"), list):
        return jsonify({"status": "error", "message": "completed_workout is required"}), 400

    current_user = get_jwt_identity()
    history = load_workout_history()
    session_to_update = None

    for index, session in enumerate(history):
        session_id = session.get("id", index + 1)
        if session_id == history_id:
            if session.get("owner") != current_user:
                return jsonify({"status": "error", "message": "You are not allowed to modify this history."}), 403
            session_to_update = session
            break

    if not session_to_update:
        return jsonify({"status": "error", "message": "History session not found"}), 404

    requested_updates = {
        item.get("id"): item
        for item in data.get("completed_workout", [])
        if isinstance(item, dict) and item.get("id") is not None
    }

    for workout in session_to_update.get("completed_workout", []):
        update_item = requested_updates.get(workout.get("id"))
        if not update_item:
            continue

        cleaned_sets, error = clean_set_details(update_item.get("set_details"))
        if error:
            return jsonify({"status": "error", "message": error}), 400

        workout["set_details"] = cleaned_sets
        workout["sets"] = len(cleaned_sets)
        workout["reps"] = [item["reps"] for item in cleaned_sets]

    session_to_update["muscle_split"] = calculate_muscle_split(session_to_update.get("completed_workout", []))
    session_to_update["muscle_map"] = calculate_muscle_map(session_to_update.get("completed_workout", []))
    save_workout_history(history)

    return jsonify({
        "status": "success",
        "message": "Workout history updated",
        "data": session_to_update
    }), 200


@app.route("/history-data/<int:history_id>", methods=["DELETE"])
@jwt_required()
def delete_history_data(history_id):
    current_user = get_jwt_identity()
    history = load_workout_history()
    session_to_delete = None

    for index, session in enumerate(history):
        session_id = session.get("id", index + 1)
        if session_id == history_id:
            if session.get("owner") != current_user:
                return jsonify({"status": "error", "message": "You are not allowed to delete this history."}), 403
            session_to_delete = session
            break

    if not session_to_delete:
        return jsonify({"status": "error", "message": "History session not found"}), 404

    history.remove(session_to_delete)
    save_workout_history(history)

    return jsonify({
        "status": "success",
        "message": "Workout history deleted"
    }), 200


@app.route("/routines", methods=["GET"])
@jwt_required()
def get_routines():
    current_user = get_jwt_identity()
    routines = load_routines()
    user_routines = [routine for routine in routines if routine.get("owner") == current_user]

    return jsonify({
        "status": "success",
        "message": "Routines retrieved",
        "data": user_routines
    }), 200


@app.route("/routine-folders", methods=["GET"])
@jwt_required()
def get_routine_folders():
    current_user = get_jwt_identity()
    folders = load_routine_folders()
    user_folders = [folder for folder in folders if folder.get("owner") == current_user]
    user_folders.sort(key=lambda folder: (folder.get("order", folder.get("id", 0)), folder.get("id", 0)))

    return jsonify({
        "status": "success",
        "message": "Routine folders retrieved",
        "data": user_folders
    }), 200


@app.route("/routine-folders", methods=["POST"])
@jwt_required()
def create_routine_folder():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    name = normalize_text(data.get("name"))
    if not name:
        return jsonify({"status": "error", "message": "Folder name is required"}), 400

    current_user = get_jwt_identity()
    folders = load_routine_folders()
    user_orders = [
        folder.get("order", 0)
        for folder in folders
        if folder.get("owner") == current_user and isinstance(folder.get("order", 0), int)
    ]
    folder = {
        "id": next_numeric_id(folders),
        "owner": current_user,
        "name": name,
        "order": max(user_orders, default=0) + 1
    }

    folders.append(folder)
    save_routine_folders(folders)

    return jsonify({
        "status": "success",
        "message": "Routine folder saved",
        "data": folder
    }), 201


@app.route("/routine-folders/<int:folder_id>", methods=["PUT"])
@jwt_required()
def update_routine_folder(folder_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    current_user = get_jwt_identity()
    folders = load_routine_folders()
    folder_to_update = None

    for folder in folders:
        if folder.get("id") == folder_id:
            if folder.get("owner") != current_user:
                return jsonify({"status": "error", "message": "You are not allowed to update this folder."}), 403
            folder_to_update = folder
            break

    if not folder_to_update:
        return jsonify({"status": "error", "message": "Folder not found"}), 404

    if "name" in data:
        name = normalize_text(data.get("name"))
        if not name:
            return jsonify({"status": "error", "message": "Folder name is required"}), 400
        folder_to_update["name"] = name

    if "direction" in data:
        direction = data.get("direction")
        if direction not in {"up", "down"}:
            return jsonify({"status": "error", "message": "Invalid folder direction"}), 400

        user_folders = [folder for folder in folders if folder.get("owner") == current_user]
        user_folders.sort(key=lambda folder: (folder.get("order", folder.get("id", 0)), folder.get("id", 0)))
        for index, folder in enumerate(user_folders):
            folder["order"] = index + 1

        current_index = user_folders.index(folder_to_update)
        swap_index = current_index - 1 if direction == "up" else current_index + 1
        if 0 <= swap_index < len(user_folders):
            user_folders[current_index]["order"], user_folders[swap_index]["order"] = (
                user_folders[swap_index]["order"],
                user_folders[current_index]["order"]
            )

    save_routine_folders(folders)

    return jsonify({
        "status": "success",
        "message": "Routine folder updated",
        "data": folder_to_update
    }), 200


@app.route("/routine-folders/<int:folder_id>", methods=["DELETE"])
@jwt_required()
def delete_routine_folder(folder_id):
    current_user = get_jwt_identity()
    folders = load_routine_folders()
    folder_to_delete = None

    for folder in folders:
        if folder.get("id") == folder_id:
            if folder.get("owner") != current_user:
                return jsonify({"status": "error", "message": "You are not allowed to delete this folder."}), 403
            folder_to_delete = folder
            break

    if not folder_to_delete:
        return jsonify({"status": "error", "message": "Folder not found"}), 404

    folders.remove(folder_to_delete)
    save_routine_folders(folders)

    routines = load_routines()
    for routine in routines:
        if routine.get("owner") == current_user and routine.get("folder_id") == folder_id:
            routine["folder_id"] = None
    save_routines(routines)

    return jsonify({
        "status": "success",
        "message": "Routine folder deleted"
    }), 200


@app.route("/routines/<int:routine_id>", methods=["PUT"])
@jwt_required()
def update_routine(routine_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    folder_id = data.get("folder_id")
    if "folder_id" in data and folder_id is not None and not isinstance(folder_id, int):
        return jsonify({"status": "error", "message": "folder_id must be a number or null"}), 400

    name = normalize_text(data.get("name")) if "name" in data else None
    if "name" in data and not name:
        return jsonify({"status": "error", "message": "Routine name is required"}), 400

    cleaned_exercises = None
    if "exercises" in data:
        cleaned_exercises, error = clean_routine_exercises(data.get("exercises"))
        if error:
            return jsonify({"status": "error", "message": error}), 400

    current_user = get_jwt_identity()
    routines = load_routines()
    routine_to_update = None

    if "folder_id" in data and folder_id is not None:
        folders = load_routine_folders()
        folder_exists = any(
            folder.get("id") == folder_id and folder.get("owner") == current_user
            for folder in folders
        )
        if not folder_exists:
            return jsonify({"status": "error", "message": "Folder not found"}), 404

    for routine in routines:
        if routine.get("id") == routine_id:
            if routine.get("owner") != current_user:
                return jsonify({"status": "error", "message": "You are not allowed to update this routine."}), 403
            if "folder_id" in data:
                routine["folder_id"] = folder_id
            if name is not None:
                routine["name"] = name
            if cleaned_exercises is not None:
                routine["exercises"] = cleaned_exercises
            routine_to_update = routine
            break

    if not routine_to_update:
        return jsonify({"status": "error", "message": "Routine not found"}), 404

    save_routines(routines)

    return jsonify({
        "status": "success",
        "message": "Routine updated",
        "data": routine_to_update
    }), 200


@app.route("/routines/<int:routine_id>/duplicate", methods=["POST"])
@jwt_required()
def duplicate_routine(routine_id):
    current_user = get_jwt_identity()
    routines = load_routines()
    routine = next(
        (
            item for item in routines
            if item.get("id") == routine_id and item.get("owner") == current_user
        ),
        None
    )

    if not routine:
        return jsonify({"status": "error", "message": "Routine not found"}), 404

    duplicated = dict(routine)
    duplicated["id"] = next_numeric_id(routines)
    duplicated["name"] = f"{routine.get('name', 'Routine')} Copy"
    duplicated["exercises"] = [dict(exercise) for exercise in routine.get("exercises", [])]
    routines.append(duplicated)
    save_routines(routines)

    return jsonify({
        "status": "success",
        "message": "Routine duplicated",
        "data": duplicated
    }), 201


@app.route("/routines/<int:routine_id>", methods=["DELETE"])
@jwt_required()
def delete_routine(routine_id):
    current_user = get_jwt_identity()
    routines = load_routines()
    routine = next(
        (
            item for item in routines
            if item.get("id") == routine_id and item.get("owner") == current_user
        ),
        None
    )

    if not routine:
        return jsonify({"status": "error", "message": "Routine not found"}), 404

    routines.remove(routine)
    save_routines(routines)

    return jsonify({
        "status": "success",
        "message": "Routine deleted"
    }), 200


@app.route("/routines", methods=["POST"])
@jwt_required()
def create_routine():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    name = normalize_text(data.get("name"))
    exercises = data.get("exercises")

    if not name:
        return jsonify({"status": "error", "message": "Routine name is required"}), 400

    if not isinstance(exercises, list) or not exercises:
        return jsonify({"status": "error", "message": "Add at least one exercise"}), 400

    cleaned_exercises, error = clean_routine_exercises(exercises)
    if error:
        return jsonify({"status": "error", "message": error}), 400

    current_user = get_jwt_identity()
    routines = load_routines()
    routine = {
        "id": next_numeric_id(routines),
        "owner": current_user,
        "name": name,
        "folder_id": None,
        "exercises": cleaned_exercises
    }

    routines.append(routine)
    save_routines(routines)

    return jsonify({
        "status": "success",
        "message": "Routine saved",
        "data": routine
    }), 201


@app.route("/routines/<int:routine_id>/start", methods=["POST"])
@jwt_required()
def start_routine(routine_id):
    current_user = get_jwt_identity()
    routines = load_routines()
    routine = next(
        (
            item for item in routines
            if item.get("id") == routine_id and item.get("owner") == current_user
        ),
        None
    )

    if not routine:
        return jsonify({"status": "error", "message": "Routine not found"}), 404

    workouts = load_workout_sections()
    remaining_workouts = [w for w in workouts if w.get("owner") != current_user]
    next_id = next_numeric_id(remaining_workouts)
    imported_workouts = []

    for exercise in routine.get("exercises", []):
        workout = build_workout_from_routine_exercise(exercise, current_user, next_id)
        if workout:
            workout["routine_name"] = routine.get("name", "")
            imported_workouts.append(workout)
            next_id += 1

    if not imported_workouts:
        return jsonify({"status": "error", "message": "Routine has no valid exercises"}), 400

    remaining_workouts.extend(imported_workouts)
    save_workout_sections(remaining_workouts)

    return jsonify({
        "status": "success",
        "message": "Routine started",
        "data": imported_workouts
    }), 201

# GET all workouts

@app.route("/data", methods=["GET"])
@jwt_required()
def get_data():
    current_user = get_jwt_identity()
    workouts = load_workout_sections()

    user_workouts = [w for w in workouts if w.get("owner") == current_user]
    user_workouts = [enrich_workout_record(workout) for workout in user_workouts]

    keyword = (request.args.get("q") or "").strip().lower()

    if keyword:
        user_workouts = [
            w for w in user_workouts
            if keyword in (w.get("workout") or "").lower()
            or keyword in (w.get("equipment") or "").lower()
            or any(keyword in muscle.lower() for muscle in w.get("primaryMuscles", []))
            or any(keyword in muscle.lower() for muscle in w.get("secondaryMuscles", []))
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
    if "workout" not in data:
        return jsonify({"status": "error", "message": "Missing workout name"}), 400
    if not isinstance(data["workout"], str) or not data["workout"].strip():
        return jsonify({"status": "error", "message": "Workout must be non-empty string"}), 400

    preset_id = data.get("preset_id")
    if preset_id is not None and not isinstance(preset_id, str):
        return jsonify({"status": "error", "message": "preset_id must be string"}), 400

    equipment = normalize_text(data.get("equipment"))
    body_parts = normalize_string_list(data.get("body_parts"))
    primary_muscles = normalize_string_list(data.get("primary_muscles"))
    secondary_muscles = normalize_string_list(data.get("secondary_muscles"))

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
        "equipment": equipment,
        "bodyParts": body_parts,
        "primaryMuscles": primary_muscles,
        "secondaryMuscles": secondary_muscles,
        "owner": current_user,
        "is_preset": False,
        "completed": False,
        "notes": normalize_text(data.get("notes"))
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

    session_name = user_workouts[0].get("routine_name") if user_workouts else ""
    if not session_name:
        session_name = user_workouts[0].get("workout") if len(user_workouts) == 1 else "Workout"

    muscle_split = calculate_muscle_split(user_workouts)
    muscle_map = calculate_muscle_map(user_workouts)

    workout_history.append({
        "id": next_numeric_id(workout_history),
        "owner": current_user,
        "session_name": session_name,
        "completed_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "completed_workout": user_workouts,
        "muscle_split": muscle_split,
        "muscle_map": muscle_map
    })
    save_workout_history(workout_history)

    remaining_workouts = [w for w in current_workouts if w.get("owner") != current_user]
    save_workout_sections(remaining_workouts)

    return jsonify({
        "status": "success",
        "message": "Workout finished successfully",
        "muscle_split": muscle_split,
        "muscle_map": muscle_map
    }), 200


# PUT update workout
@app.route("/data/<int:workout_id>", methods=["PUT"])
@jwt_required()
def update_workout(workout_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    if (
        "workout" not in data
        and "equipment" not in data
        and "body_parts" not in data
        and "primary_muscles" not in data
        and "secondary_muscles" not in data
        and "sets" not in data
        and "reps" not in data
        and "set_details" not in data
        and "completed" not in data
        and "notes" not in data
    ):
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

            if "equipment" in data:
                if data["equipment"] is not None and not isinstance(data["equipment"], str):
                    return jsonify({"status": "error", "message": "Equipment must be string"}), 400
                w["equipment"] = normalize_text(data.get("equipment"))

            if "body_parts" in data:
                w["bodyParts"] = normalize_string_list(data.get("body_parts"))

            if "primary_muscles" in data:
                w["primaryMuscles"] = normalize_string_list(data.get("primary_muscles"))

            if "secondary_muscles" in data:
                w["secondaryMuscles"] = normalize_string_list(data.get("secondary_muscles"))

            if "notes" in data:
                if data["notes"] is not None and not isinstance(data["notes"], str):
                    return jsonify({"status": "error", "message": "notes must be string"}), 400
                w["notes"] = normalize_text(data.get("notes"))

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
                    set_type = set_item.get("set_type", "working")
                    done = set_item.get("done", False)

                    if not isinstance(reps, int) or reps <= 0:
                        return jsonify({"status": "error", "message": "Each set reps must be a positive integer"}), 400

                    if not isinstance(kg, (int, float)) or kg < 0:
                        return jsonify({"status": "error", "message": "Each set kg must be zero or positive"}), 400

                    if set_type not in {"warmup", "working", "drop", "failure"}:
                        return jsonify({"status": "error", "message": "Invalid set type"}), 400

                    if not isinstance(done, bool):
                        return jsonify({"status": "error", "message": "done must be boolean"}), 400

                    cleaned_sets.append({
                        "reps": reps,
                        "kg": kg,
                        "set_type": set_type,
                        "done": done
                    })

                w["set_details"] = cleaned_sets
                w["sets"] = len(cleaned_sets)
                w["reps"] = [item["reps"] for item in cleaned_sets]

            if "completed" in data:
                if not isinstance(data["completed"], bool):
                    return jsonify({"status": "error", "message": "completed must be boolean"}), 400
                w["completed"] = data["completed"]


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
