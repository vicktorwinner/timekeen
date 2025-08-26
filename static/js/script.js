/**
 * Мобильная версия Pomodoro Timer
 * Оптимизирована для телефонов и планшетов
 */
class PomodoroApp {
  constructor() {
    this.currentPlace = null;
    this.currentTimer = null;
    this.timerInterval = null;
    this.places = [];
    this.timerPresets = [];
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.renderPlaces();
    this.renderTimerPresets();
  }

  async loadData() {
    // Всегда используем офлайн данные
    this.places = [
      {
        id: "work",
        name: "Работа",
        description: "Офис",
        background: "work-bg",
        icon: "💼",
      },
      {
        id: "home",
        name: "Дом",
        description: "Дома",
        background: "home-bg",
        icon: "🏠",
      },
      {
        id: "cafe",
        name: "Кафе",
        description: "Кафе",
        background: "cafe-bg",
        icon: "☕",
      },
      {
        id: "library",
        name: "Библиотека",
        description: "Тишина",
        background: "library-bg",
        icon: "📚",
      },
    ];
    this.timerPresets = [
      { name: "Короткий", duration: 5, description: "5 мин" },
      { name: "Помодоро", duration: 25, description: "25 мин" },
      { name: "Длинный", duration: 15, description: "15 мин" },
      { name: "Фокус", duration: 45, description: "45 мин" },
      { name: "Свой", duration: 0, description: "Ввести" },
    ];
  }

  setupEventListeners() {
    document
      .getElementById("btn-back")
      .addEventListener("click", () => this.goBack());

    document.getElementById("btn-start").addEventListener("click", () => {
      if (this.currentTimer) {
        this.stopTimer();
      } else {
        this.showTimerModal();
      }
    });

    document
      .getElementById("modal-close")
      .addEventListener("click", () => this.hideTimerModal());

    document.getElementById("timer-modal").addEventListener("click", (e) => {
      if (e.target.id === "timer-modal") this.hideTimerModal();
    });

    document.getElementById("timer-presets").addEventListener("click", (e) => {
      const presetItem = e.target.closest(".preset-item");
      if (presetItem) {
        const duration = parseInt(presetItem.dataset.duration);
        if (duration > 0) {
          this.startTimer(duration);
          this.hideTimerModal();
        } else {
          document.getElementById("custom-duration").focus();
        }
      }
    });

    document.getElementById("btn-custom").addEventListener("click", () => {
      const duration = parseInt(
        document.getElementById("custom-duration").value
      );
      if (duration > 0 && duration <= 120) {
        this.startTimer(duration);
        this.hideTimerModal();
      }
    });

    document
      .getElementById("custom-duration")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") document.getElementById("btn-custom").click();
      });
  }

  renderPlaces() {
    const placesGrid = document.getElementById("places-grid");
    const placesButtons = document.getElementById("places-buttons");

    placesGrid.innerHTML = this.places
      .map(
        (place) => `
      <div class="place-card" data-place-id="${place.id}">
        <span class="place-icon">${place.icon}</span>
        <div class="place-name">${place.name}</div>
        <div class="place-description">${place.description}</div>
      </div>
    `
      )
      .join("");

    placesButtons.innerHTML = this.places
      .map(
        (place) => `
      <button class="btn place-btn" data-place-id="${place.id}">
        ${place.icon} ${place.name}
      </button>
    `
      )
      .join("");

    placesGrid.addEventListener("click", (e) => {
      const placeCard = e.target.closest(".place-card");
      if (placeCard) this.selectPlace(placeCard.dataset.placeId);
    });

    placesButtons.addEventListener("click", (e) => {
      const placeBtn = e.target.closest(".place-btn");
      if (placeBtn) this.selectPlace(placeBtn.dataset.placeId);
    });
  }

  renderTimerPresets() {
    document.getElementById("timer-presets").innerHTML = this.timerPresets
      .map(
        (preset) => `
      <div class="preset-item" data-duration="${preset.duration}">
        <div class="preset-name">${preset.name}</div>
        <div class="preset-description">${preset.description}</div>
      </div>
    `
      )
      .join("");
  }

  selectPlace(placeId) {
    const place = this.places.find((p) => p.id === placeId);
    if (!place) return;

    this.currentPlace = place;
    document.getElementById(
      "main-screen"
    ).className = `screen ${place.background}`;
    this.showMainScreen();
    this.updateBottomPanel();
    this.applyCharacterImage();
  }

  showMainScreen() {
    document.getElementById("welcome-screen").classList.remove("active");
    document.getElementById("main-screen").classList.add("active");
  }

  goBack() {
    this.stopTimer();
    document.getElementById("main-screen").classList.remove("active");
    document.getElementById("welcome-screen").classList.add("active");
    document.getElementById("main-screen").className = "screen";
    this.updateBottomPanel();
  }

  updateBottomPanel() {
    const placesButtons = document.getElementById("places-buttons");
    const timerControls = document.getElementById("timer-controls");

    if (this.currentPlace) {
      placesButtons.style.display = "none";
      timerControls.style.display = "flex";
      this.updateTimerControls();
    } else {
      placesButtons.style.display = "flex";
      timerControls.style.display = "none";
    }
  }

  updateTimerControls() {
    const btnStart = document.getElementById("btn-start");
    const btnBack = document.getElementById("btn-back");

    if (this.currentTimer) {
      btnStart.textContent = "⏹";
      btnStart.className = "btn btn-stop";
      btnBack.style.display = "none";
    } else {
      btnStart.textContent = "▶";
      btnStart.className = "btn btn-start";
      btnBack.style.display = "block";
    }
  }

  showTimerModal() {
    document.getElementById("timer-modal").classList.add("active");
  }

  hideTimerModal() {
    document.getElementById("timer-modal").classList.remove("active");
  }

  async startTimer(duration) {
    if (this.currentTimer) {
      alert("Таймер уже запущен!");
      return;
    }

    if (!this.currentPlace) {
      alert("Выберите место");
      return;
    }

    // Всегда запускаем в офлайн режиме
    this.currentTimer = `timer_${Date.now()}`;
    this.startTimerDisplay(duration);
    this.enterFocusMode();
    this.updateTimerControls();
  }

  startTimerDisplay(duration) {
    const timerDisplay = document.getElementById("timer-display");
    const timerText = document.getElementById("timer-text");
    const timerProgress = document.getElementById("timer-progress");

    timerDisplay.style.display = "block";
    let remainingSeconds = duration * 60;
    const totalSeconds = duration * 60;

    const updateTimer = () => {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      timerText.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;

      const progress = Math.max(
        0,
        Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)
      );
      timerProgress.style.width = `${progress}%`;

      if (remainingSeconds <= 0) {
        timerProgress.style.width = "100%";
        this.timerCompleted();
        return;
      }
      remainingSeconds--;
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.currentTimer = null;
    document.getElementById("timer-display").style.display = "none";
    this.exitFocusMode();
    this.updateTimerControls();
  }

  timerCompleted() {
    this.stopTimer();
    this.showNotification("Время истекло!");

    // Вибрация на мобильных устройствах
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  enterFocusMode() {
    document.getElementById("main-screen").classList.add("focus-active");
    this.applyCharacterImage();
  }

  exitFocusMode() {
    document.getElementById("main-screen").classList.remove("focus-active");
    this.applyCharacterImage();
  }

  applyCharacterImage() {
    const img = document.getElementById("character-img");
    if (!this.currentPlace) return;

    const isWorking = this.currentTimer !== null;
    const imagePath = isWorking
      ? `./static/images/char-${this.currentPlace.id}-working.gif`
      : `./static/images/char-${this.currentPlace.id}-idle.png`;

    img.src = imagePath;
  }

  showNotification(message) {
    const notification = document.getElementById("completion-notification");
    notification.querySelector(".notification-text").textContent = message;
    notification.style.display = "block";
    setTimeout(() => (notification.style.display = "none"), 3000);
  }
}

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
  window.pomodoroApp = new PomodoroApp();
});

// Обработка ошибок
window.addEventListener("error", (e) => console.error("Ошибка:", e.error));
window.addEventListener("unhandledrejection", (e) =>
  console.error("Ошибка промиса:", e.reason)
);
