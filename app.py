from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from src.core.profile_collector import ProfileCollector
import os

app = Flask(__name__, static_folder='testing', static_url_path='/')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/search', methods=['POST'])
def search():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    handle = data.get('handle')
    specific_handles = data.get('specific_handles', {})

    if not name:
        return jsonify({"error": "Name is a mandatory field."}), 400

    collector = ProfileCollector()
    results = collector.collect(
        name=name,
        email=email,
        generic_handle=handle,
        specific_handles=specific_handles
    )
    return jsonify(results)

if __name__ == '__main__':
    app.run(port=5001, debug=True)
