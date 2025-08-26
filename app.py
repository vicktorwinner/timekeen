from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)

# CORS для мобильных устройств
CORS(app, origins=["*"], methods=["GET", "POST", "OPTIONS"])


@app.after_request
def add_header(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Cache-Control"] = "no-cache"
    return response


# Хранение таймеров
active_timers = {}


@app.route("/")
def index():
    return app.send_static_file("../index.html")


@app.route("/api/places")
def get_places():
    places = [
        {
            "id": "work",
            "name": "Работа",
            "description": "Офис",
            "background": "work-bg",
            "icon": "💼",
        },
        {
            "id": "home",
            "name": "Дом",
            "description": "Дома",
            "background": "home-bg",
            "icon": "🏠",
        },
        {
            "id": "cafe",
            "name": "Кафе",
            "description": "Кафе",
            "background": "cafe-bg",
            "icon": "☕",
        },
        {
            "id": "library",
            "name": "Библиотека",
            "description": "Тишина",
            "background": "library-bg",
            "icon": "📚",
        },
    ]
    return jsonify(places)


@app.route("/api/timer/start", methods=["POST", "OPTIONS"])
def start_timer():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json()
    duration = data.get("duration", 25)
    place = data.get("place", "work")

    timer_id = f"timer_{datetime.now().timestamp()}"
    end_time = datetime.now() + timedelta(minutes=duration)

    active_timers[timer_id] = {
        "duration": duration,
        "place": place,
        "start_time": datetime.now().isoformat(),
        "end_time": end_time.isoformat(),
        "is_active": True,
    }

    return jsonify(
        {
            "timer_id": timer_id,
            "duration": duration,
            "end_time": end_time.isoformat(),
            "status": "started",
        }
    )


@app.route("/api/timer/<timer_id>/status")
def get_timer_status(timer_id):
    if timer_id not in active_timers:
        return jsonify({"error": "Timer not found"}), 404

    timer = active_timers[timer_id]
    if not timer["is_active"]:
        return jsonify({"status": "completed"})

    end_time = datetime.fromisoformat(timer["end_time"])
    if datetime.now() >= end_time:
        timer["is_active"] = False
        return jsonify({"status": "completed"})

    remaining = end_time - datetime.now()
    remaining_seconds = int(remaining.total_seconds())

    return jsonify(
        {
            "status": "active",
            "remaining_seconds": remaining_seconds,
            "duration": timer["duration"],
            "place": timer["place"],
        }
    )


@app.route("/api/timer/<timer_id>/stop", methods=["POST"])
def stop_timer(timer_id):
    if timer_id not in active_timers:
        return jsonify({"error": "Timer not found"}), 404

    active_timers[timer_id]["is_active"] = False
    return jsonify({"status": "stopped"})


@app.route("/api/timer/presets")
def get_timer_presets():
    presets = [
        {"name": "Короткий", "duration": 5, "description": "5 мин"},
        {"name": "Помодоро", "duration": 25, "description": "25 мин"},
        {"name": "Длинный", "duration": 15, "description": "15 мин"},
        {"name": "Фокус", "duration": 45, "description": "45 мин"},
        {"name": "Свой", "duration": 0, "description": "Ввести"},
    ]
    return jsonify(presets)


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5001)
