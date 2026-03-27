import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs", "generated")

def load_json_file(filename):
    file_path = os.path.join(OUTPUT_DIR, filename)

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"{filename} not found")

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)