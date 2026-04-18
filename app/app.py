from flask import Flask, render_template, request, jsonify
import json


app = Flask(__name__)


# save data into json file.
DATA_FILE = "data/workouts.json"

def load_workouts():
    with open(DATA_FILE, "r") as file:
        return json.load(file)

def save_workouts(workouts):
    with open(DATA_FILE, "w") as file:
        json.dump(workouts, file, indent=4)


@app.route("/")
def index():
    return render_template('index.html')

# get the data in json file.
@app.route('/data', methods=['GET'])
def get_data():
    workouts = load_workouts()
    return jsonify(workouts)

# post the data in json file.
@app.route('/data', methods=['POST'])
def handle_post():
    data = request.get_json()

    # Validation starts here
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "id" not in data or "workout" not in data:
        return jsonify({"error": "Missing fields"}), 400

    if not isinstance(data["id"], int):
        return jsonify({"error": "ID must be integer"}), 400

    if not isinstance(data["workout"], str):
        return jsonify({"error": "Workout must be string"}), 400
    # Validation ends here

    workouts = load_workouts()
    workouts.append(data)
    save_workouts(workouts)

    return jsonify({
        "message": "Workout added successfully",
        "received": data
    }), 201

# delete the data in json file.
@app.route('/data/<int:workout_id>', methods=['DELETE'])
def delete_workout(workout_id):
    workouts = load_workouts()

    workout_to_delete = None
    for w in workouts:
        if w["id"] == workout_id:
            workout_to_delete = w
            break

    if not workout_to_delete:
        return jsonify({"error": "Workout not found"}), 404

    workouts.remove(workout_to_delete)
    save_workouts(workouts)

    return jsonify({"message": "Workout deleted"}), 200
