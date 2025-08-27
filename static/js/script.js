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
    this.wakeLock = null; // Wake Lock дескриптор
    this.completedSessions = 0; // Счётчик завершённых сессий

    // Настройки пользователя (по умолчанию включаем вибро и звук)
    this.settings = {
      sound: true,
      haptics: true,
      wakelock: true,
      confirmStop: false,
      banner: false,
      volume: 100,
      largeDigits: false,
    };
    this.dailyGoal = 8;

    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.renderPlaces();
    this.renderTimerPresets();

    // Восстанавливаем ранее выбранные значения (если есть)
    try {
      const lastDuration = parseInt(localStorage.getItem("lastDuration") || "");
      if (!Number.isNaN(lastDuration) && lastDuration > 0) {
        const input = document.getElementById("custom-duration");
        if (input) input.value = String(lastDuration);
      }
    } catch (_) {}

    // Главный экран: приветствие, часы и совет дня
    this.initHomeScreenWidgets();

    // Предзагрузка изображений
    this.preloadAllPlaceImages();
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
    const btnBack = document.getElementById("btn-back");
    const btnStart = document.getElementById("btn-start");
    const btnSettingsOpen = document.getElementById("btn-settings");
    const settingsModal = document.getElementById("settings-modal");
    const goalInput = document.getElementById("i-goal");

    // A11y labels
    btnBack.setAttribute("aria-label", "Назад к выбору места");
    btnStart.setAttribute("aria-label", "Запустить/остановить таймер");
    if (btnSettingsOpen)
      btnSettingsOpen.setAttribute("aria-label", "Открыть настройки");

    // Click debouncing to avoid double taps
    let clickLocked = false;
    const withLock = (fn) => {
      if (clickLocked) return;
      clickLocked = true;
      try {
        fn();
      } finally {
        setTimeout(() => (clickLocked = false), 250);
      }
    };

    btnBack.addEventListener("click", () => withLock(() => this.goBack()));

    btnStart.addEventListener("click", () =>
      withLock(() => {
        if (this.currentTimer) {
          this.stopTimer();
        } else {
          this.showTimerModal();
        }
      })
    );

    // Открытие настроек с первого экрана
    if (btnSettingsOpen)
      btnSettingsOpen.addEventListener("click", () =>
        settingsModal.classList.add("active")
      );
    document
      .getElementById("settings-close")
      .addEventListener("click", () =>
        settingsModal.classList.remove("active")
      );
    settingsModal.addEventListener("click", (e) => {
      if (e.target.id === "settings-modal")
        settingsModal.classList.remove("active");
    });

    // Тумблеры настроек (модалка)
    const toggleSound = document.getElementById("toggle-sound");
    const toggleHaptics = document.getElementById("toggle-haptics");
    const toggleWakelock = document.getElementById("toggle-wakelock");
    const toggleConfirmStop = document.getElementById("toggle-confirm-stop");
    const toggleBanner = document.getElementById("toggle-banner");
    const toggleLargeDigits = document.getElementById("toggle-large-digits");
    const volumeRange = document.getElementById("volume-range");

    // Тумблеры настроек (inline — теперь на welcome)
    const iSound = document.getElementById("i-sound");
    const iHaptics = document.getElementById("i-haptics");
    const iWakelock = document.getElementById("i-wakelock");

    // Инициализация из localStorage
    try {
      const raw = localStorage.getItem("settings");
      if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
      const g = parseInt(localStorage.getItem("dailyGoal") || "");
      if (!Number.isNaN(g) && g > 0) this.dailyGoal = Math.min(20, g);
    } catch (_) {}

    if (goalInput) goalInput.value = String(this.dailyGoal);

    const syncUI = () => {
      if (toggleSound) toggleSound.checked = !!this.settings.sound;
      if (toggleHaptics) toggleHaptics.checked = !!this.settings.haptics;
      if (toggleWakelock) toggleWakelock.checked = !!this.settings.wakelock;
      if (toggleConfirmStop)
        toggleConfirmStop.checked = !!this.settings.confirmStop;
      if (toggleBanner) toggleBanner.checked = !!this.settings.banner;
      if (toggleLargeDigits)
        toggleLargeDigits.checked = !!this.settings.largeDigits;
      if (volumeRange) volumeRange.value = String(this.settings.volume);
      const badge = document.getElementById("sessions-badge");
      if (badge) badge.textContent = String(this.completedSessions);
      const timerText = document.getElementById("timer-text");
      if (timerText)
        timerText.classList.toggle("large", !!this.settings.largeDigits);
      const audio = document.getElementById("timer-sound");
      if (audio)
        audio.volume = Math.max(0, Math.min(1, this.settings.volume / 100));
    };

    syncUI();

    const persist = () => {
      try {
        localStorage.setItem("settings", JSON.stringify(this.settings));
      } catch (_) {}
      syncUI();
    };

    const bindToggle = (el, key) =>
      el &&
      el.addEventListener("change", () => {
        this.settings[key] = el.checked;
        persist();
      });
    bindToggle(toggleSound, "sound");
    bindToggle(toggleHaptics, "haptics");
    bindToggle(toggleWakelock, "wakelock");
    bindToggle(toggleConfirmStop, "confirmStop");
    bindToggle(toggleBanner, "banner");
    bindToggle(toggleLargeDigits, "largeDigits");
    if (volumeRange)
      volumeRange.addEventListener("input", () => {
        this.settings.volume = parseInt(volumeRange.value) || 0;
        persist();
      });

    bindToggle(iSound, "sound");
    bindToggle(iHaptics, "haptics");
    bindToggle(iWakelock, "wakelock");

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
          const input = document.getElementById("custom-duration");
          if (input) input.focus();
        }
      }
    });

    document.getElementById("btn-custom").addEventListener("click", () => {
      const val = document.getElementById("custom-duration").value;
      const duration = parseInt(val);
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

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.currentTimer) {
        this.requestWakeLock();
      }
    });

    // Быстрые пресеты на главном экране (отображаются при выборе места)
    const quick = document.getElementById("quick-presets");
    if (quick) {
      quick.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn.small");
        if (!btn) return;
        const d = parseInt(btn.dataset.q);
        if (!Number.isNaN(d)) this.startTimer(d);
      });
    }

    if (goalInput)
      goalInput.addEventListener("change", () => {
        const v = parseInt(goalInput.value);
        if (!Number.isNaN(v) && v > 0) {
          this.dailyGoal = Math.min(20, v);
          try {
            localStorage.setItem("dailyGoal", String(this.dailyGoal));
          } catch (_) {}
          const badge = document.getElementById("sessions-badge");
          if (badge)
            badge.textContent = `${this.completedSessions}/${this.dailyGoal}`;
        }
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

    // Кнопка перехода с welcome на places
    const btnContinue = document.getElementById("btn-continue");
    if (btnContinue) {
      btnContinue.addEventListener("click", () => {
        document.getElementById("welcome-screen").classList.remove("active");
        document.getElementById("places-screen").classList.add("active");
      });
    }

    const btnBackToWelcome = document.getElementById("btn-back-to-welcome");
    if (btnBackToWelcome) {
      btnBackToWelcome.addEventListener("click", () => {
        document.getElementById("places-screen").classList.remove("active");
        document.getElementById("welcome-screen").classList.add("active");
      });
    }
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

    // Переход: places -> main
    document.getElementById("places-screen").classList.remove("active");
    document.getElementById("main-screen").classList.add("active");

    const timerPlace = document.getElementById("timer-place");
    if (timerPlace) timerPlace.textContent = place.name;

    this.updateBottomPanel();
    this.applyAccentByPlace(place.id);
    this.applyCharacterImage();

    try {
      localStorage.setItem("lastPlaceId", place.id);
    } catch (_) {}
  }

  applyAccentByPlace(placeId) {
    const root = document.documentElement;
    const accents = {
      work: ["#4caf50", "#6dd56b"],
      home: ["#ff6f91", "#ffd36e"],
      cafe: ["#00c2ff", "#66e0ff"],
      library: ["#9b59b6", "#d6a8e9"],
    };
    const [start, end] = accents[placeId] || ["#4caf50", "#6dd56b"];
    root.style.setProperty("--accentStart", start);
    root.style.setProperty("--accentEnd", end);
  }

  showMainScreen() {
    document.getElementById("welcome-screen").classList.remove("active");
    document.getElementById("main-screen").classList.add("active");
  }

  goBack() {
    this.stopTimer();
    document.getElementById("main-screen").classList.remove("active");
    document.getElementById("places-screen").classList.add("active");
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

    // Сохраняем последнюю длительность
    try {
      localStorage.setItem("lastDuration", String(duration));
    } catch (_) {}

    // Всегда офлайн
    this.currentTimer = `timer_${Date.now()}`;
    this.startTimerDisplay(duration);
    this.enterFocusMode();
    this.updateTimerControls();

    // Тактильный отклик
    if (this.settings.haptics && navigator.vibrate) navigator.vibrate(30);

    // Wake Lock по настройке
    if (this.settings.wakelock) this.requestWakeLock();
  }

  startTimerDisplay(duration) {
    const timerDisplay = document.getElementById("timer-display");
    const timerText = document.getElementById("timer-text");
    const timerProgress = document.getElementById("timer-progress");
    const timerPlace = document.getElementById("timer-place");

    timerDisplay.style.display = "block";
    if (this.currentPlace && timerPlace)
      timerPlace.textContent = this.currentPlace.name;

    let remainingSeconds = duration * 60;
    const totalSeconds = duration * 60;

    // Убираем возможное мигание
    timerText.classList.remove("blink-soft");

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
    // Подтверждение ранней остановки, если включено и таймер только начался (< 15 сек)
    if (this.settings.confirmStop && this.timerInterval) {
      // Здесь нет точного времени старта, делаем мягкую проверку по тексту
      const t = document.getElementById("timer-text");
      if (t && /:\d{2}$/.test(t.textContent || "")) {
        // Если минуты почти не изменились, спросим подтверждение
        const m = parseInt((t.textContent || "").split(":")[0]);
        if (!Number.isNaN(m)) {
          const confirmStop = confirm("Остановить таймер?");
          if (!confirmStop) return;
        }
      }
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.currentTimer = null;
    document.getElementById("timer-display").style.display = "none";
    const timerText = document.getElementById("timer-text");
    if (timerText) timerText.classList.add("blink-soft");
    this.exitFocusMode();
    this.updateTimerControls();

    if (this.settings.haptics && navigator.vibrate) navigator.vibrate(15);

    this.releaseWakeLock();
  }

  timerCompleted() {
    this.stopTimer();

    // Инкремент счётчика сессий
    this.completedSessions += 1;
    const badge = document.getElementById("sessions-badge");
    if (badge) badge.textContent = String(this.completedSessions);

    // Уведомление
    this.showNotification("Время истекло!");

    // Звук, если включён
    if (this.settings.sound) {
      const audio = document.getElementById("timer-sound");
      if (audio && audio.play) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    }

    if (this.settings.haptics && navigator.vibrate)
      navigator.vibrate([200, 100, 200]);

    if (this.settings.banner) {
      const banner = document.getElementById("completion-banner");
      if (banner) {
        banner.style.display = "block";
        setTimeout(() => (banner.style.display = "none"), 3000);
      }
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

  // ——— Улучшения
  preloadAllPlaceImages() {
    const sources = [];
    this.places.forEach((p) => {
      sources.push(`./static/images/char-${p.id}-idle.png`);
      sources.push(`./static/images/char-${p.id}-working.gif`);
    });
    sources.forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }

  async requestWakeLock() {
    try {
      if ("wakeLock" in navigator && navigator.wakeLock.request) {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLock.addEventListener?.("release", () => {
          // noop
        });
      }
    } catch (_) {
      // молча игнорируем — не критично
    }
  }

  async releaseWakeLock() {
    try {
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch (_) {}
  }

  initHomeScreenWidgets() {
    const greet = document.getElementById("home-greeting");
    const clock = document.getElementById("home-clock");
    const tip = document.getElementById("home-tip");

    // Приветствие по времени суток
    const hour = new Date().getHours();
    const part =
      hour < 5
        ? "Доброй ночи"
        : hour < 12
        ? "Доброе утро"
        : hour < 18
        ? "Добрый день"
        : "Добрый вечер";
    if (greet) greet.textContent = `${part}!`;

    // Живые часы
    const updateClock = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      if (clock) clock.textContent = `${hh}:${mm}`;
    };
    updateClock();
    setInterval(updateClock, 1000 * 10); // раз в 10 секунд достаточно

    // Советы дня (локально)
    const tips = [
      "Сконцентрируйтесь на одной задаче.",
      "Сделайте короткую разминку перед фокусом.",
      "Отключите лишние уведомления.",
      "Начните с самой важной задачи.",
      "Сформулируйте цель на сессию заранее.",
    ];
    try {
      const idx = Math.floor(Math.random() * tips.length);
      if (tip) tip.textContent = tips[idx];
    } catch (_) {}
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.pomodoroApp = new PomodoroApp();
});

window.addEventListener("error", (e) => console.error("Ошибка:", e.error));
window.addEventListener("unhandledrejection", (e) =>
  console.error("Ошибка промиса:", e.reason)
);
