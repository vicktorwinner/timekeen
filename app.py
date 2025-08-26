from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime, timedelta
import json

# Ищем шаблоны в корне проекта
app = Flask(__name__, template_folder=".")
CORS(app)

# Хранение активных таймеров (в реальном приложении лучше использовать Redis)
active_timers = {}


@app.route("/")
def index():
    """Главная страница приложения"""
    return render_template("index.html")


@app.route("/api/places")
def get_places():
    """API для получения списка мест"""
    places = [
        {
            "id": "work",
            "name": "Работа",
            "description": "Офисная обстановка",
            "background": "work-bg",
            "icon": "💼",
        },
        {
            "id": "home",
            "name": "Дом",
            "description": "Домашняя обстановка",
            "background": "home-bg",
            "icon": "🏠",
        },
        {
            "id": "cafe",
            "name": "Кафе",
            "description": "Интерьер кафе",
            "background": "cafe-bg",
            "icon": "☕",
        },
        {
            "id": "library",
            "name": "Библиотека",
            "description": "Тихая атмосфера",
            "background": "library-bg",
            "icon": "📚",
        },
    ]
    return jsonify(places)


@app.route("/api/timer/start", methods=["POST"])
def start_timer():
    """API для запуска таймера"""
    data = request.get_json()
    duration = data.get("duration", 25)  # в минутах
    place = data.get("place", "work")

    # Создаем уникальный ID для таймера
    timer_id = f"timer_{datetime.now().timestamp()}"

    # Вычисляем время окончания
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
    """API для получения статуса таймера"""
    if timer_id not in active_timers:
        return jsonify({"error": "Timer not found"}), 404

    timer = active_timers[timer_id]

    if not timer["is_active"]:
        return jsonify({"status": "completed"})

    # Проверяем, не истекло ли время
    end_time = datetime.fromisoformat(timer["end_time"])
    if datetime.now() >= end_time:
        timer["is_active"] = False
        return jsonify({"status": "completed"})

    # Вычисляем оставшееся время
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
    """API для остановки таймера"""
    if timer_id not in active_timers:
        return jsonify({"error": "Timer not found"}), 404

    active_timers[timer_id]["is_active"] = False
    return jsonify({"status": "stopped"})


@app.route("/api/timer/presets")
def get_timer_presets():
    """API для получения стандартных интервалов Pomodoro"""
    presets = [
        {"name": "Короткий перерыв", "duration": 5, "description": "5 минут"},
        {"name": "Помодоро", "duration": 25, "description": "25 минут"},
        {"name": "Длинный перерыв", "duration": 15, "description": "15 минут"},
        {"name": "Глубокий фокус", "duration": 45, "description": "45 минут"},
        {"name": "Произвольное время", "duration": 0, "description": "Ввести вручную"},
    ]
    return jsonify(presets)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
