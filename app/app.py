from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    return render_template('index.html')

@app.route('/data', methods=['GET'])
def get_data():
    return {"id": 1, "Workout": "Bench Press"}

@app.route('/data', methods=['POST'])
def handle_post():
    data = request.get_json()
    return jsonify({"received": data}), 201