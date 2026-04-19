from flask import Flask, render_template, request, jsonify
import json
from pathlib import Path

app = Flask(__name__)

DATA_FILE = "data/workouts.json"

# ensure file exists
Path("data").mkdir(exist_ok=True)
if not Path(DATA_FILE).exists():
    with open(DATA_FILE, "w") as f:
        f.write("[]")

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
    app.run(debug=True)