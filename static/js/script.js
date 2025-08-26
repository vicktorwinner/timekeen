/**
 * Основной класс приложения Pomodoro Timer
 * Управляет всем функционалом приложения: местами, таймерами, UI состоянием
 */
class PomodoroApp {
  constructor() {
    // Текущее выбранное место работы (null если не выбрано)
    this.currentPlace = null;

    // ID активного таймера (null если таймер не запущен)
    this.currentTimer = null;

    // Интервал для обновления таймера (setInterval ID)
    this.timerInterval = null;

    // Массив доступных мест для работы
    this.places = [];

    // Массив стандартных интервалов времени для таймера
    this.timerPresets = [];

    this.init();
  }

  /**
   * Инициализация приложения
   * Загружает данные, настраивает обработчики событий и рендерит интерфейс
   */
  async init() {
    // Загружаем данные о местах и пресетах таймера с сервера
    await this.loadData();

    // Настраиваем обработчики событий для всех интерактивных элементов
    this.setupEventListeners();

    // Рендерим сетку мест на приветственном экране
    this.renderPlaces();

    // Рендерим список стандартных интервалов времени
    this.renderTimerPresets();
  }

  /**
   * Загружает данные с сервера
   * Получает список мест и стандартные интервалы времени
   */
  async loadData() {
    try {
      /* Режим офлайн, если открыт по file:// */
      const IS_OFFLINE =
        typeof location !== "undefined" && location.protocol === "file:";

      /* Локальные данные для офлайн-режима */
      const OFFLINE_PLACES = [
        {
          id: "work",
          name: "Работа",
          description: "Офисная обстановка",
          background: "work-bg",
          icon: "💼",
        },
        {
          id: "home",
          name: "Дом",
          description: "Домашняя обстановка",
          background: "home-bg",
          icon: "🏠",
        },
        {
          id: "cafe",
          name: "Кафе",
          description: "Интерьер кафе",
          background: "cafe-bg",
          icon: "☕",
        },
        {
          id: "library",
          name: "Библиотека",
          description: "Тихая атмосфера",
          background: "library-bg",
          icon: "📚",
        },
      ];

      const OFFLINE_PRESETS = [
        { name: "Короткий перерыв", duration: 5, description: "5 минут" },
        { name: "Помодоро", duration: 25, description: "25 минут" },
        { name: "Длинный перерыв", duration: 15, description: "15 минут" },
        { name: "Глубокий фокус", duration: 45, description: "45 минут" },
        {
          name: "Произвольное время",
          duration: 0,
          description: "Ввести вручную",
        },
      ];

      if (IS_OFFLINE) {
        this.places = OFFLINE_PLACES;
        this.timerPresets = OFFLINE_PRESETS;
        return;
      }
      // Загружаем список доступных мест работы (работа, дом, кафе, библиотека)
      const placesResponse = await fetch("/api/places");
      this.places = await placesResponse.json();

      // Загружаем стандартные интервалы Pomodoro (5, 15, 25, 45 минут)
      const presetsResponse = await fetch("/api/timer/presets");
      this.timerPresets = await presetsResponse.json();
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    }
  }

  /**
   * Настраивает обработчики событий для всех интерактивных элементов
   * Обрабатывает клики по кнопкам, модальным окнам и другим элементам
   */
  setupEventListeners() {
    // Кнопка "Назад" - возвращает к выбору места
    document.getElementById("btn-back").addEventListener("click", () => {
      this.goBack();
    });

    // Кнопка запуска/остановки таймера - динамически изменяет поведение
    const btnStart = document.getElementById("btn-start");
    btnStart.addEventListener("click", (e) => {
      // Проверяем текущее состояние: если таймер активен - останавливаем, иначе - запускаем
      if (this.currentTimer) {
        this.stopTimer();
      } else {
        this.showTimerModal();
      }
    });

    // Закрытие модального окна по клику на крестик
    document.getElementById("modal-close").addEventListener("click", () => {
      this.hideTimerModal();
    });

    // Закрытие модального окна по клику вне области контента
    document.getElementById("timer-modal").addEventListener("click", (e) => {
      // Если клик был по фону модального окна (не по контенту)
      if (e.target.id === "timer-modal") {
        this.hideTimerModal();
      }
    });

    // Обработка кликов по пресетам таймера
    document.getElementById("timer-presets").addEventListener("click", (e) => {
      // Проверяем, был ли клик по элементу пресета
      if (e.target.closest(".preset-item")) {
        const presetItem = e.target.closest(".preset-item");
        const duration = parseInt(presetItem.dataset.duration);

        if (duration > 0) {
          // Если выбран конкретный интервал - запускаем таймер
          this.startTimer(duration);
          this.hideTimerModal();
        } else {
          // Если выбрано "Произвольное время" - фокусируемся на поле ввода
          document.getElementById("custom-duration").focus();
        }
      }
    });

    // Кнопка запуска таймера с произвольным временем
    document.getElementById("btn-custom").addEventListener("click", () => {
      const duration = parseInt(
        document.getElementById("custom-duration").value
      );
      // Проверяем валидность введенного времени (от 1 до 120 минут)
      if (duration > 0 && duration <= 120) {
        this.startTimer(duration);
        this.hideTimerModal();
      } else {
        alert("Пожалуйста, введите время от 1 до 120 минут");
      }
    });

    // Обработка нажатия Enter в поле произвольного времени
    document
      .getElementById("custom-duration")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          // При нажатии Enter автоматически кликаем по кнопке запуска
          document.getElementById("btn-custom").click();
        }
      });
  }

  /**
   * Рендерит места работы в интерфейсе
   * Создает карточки мест для приветственного экрана и кнопки для главного экрана
   */
  renderPlaces() {
    const placesGrid = document.getElementById("places-grid");
    const placesButtons = document.getElementById("places-buttons");

    // Рендерим карточки мест для приветственного экрана (сетка 2x2)
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

    // Рендерим кнопки мест для главного экрана (горизонтальная панель)
    placesButtons.innerHTML = this.places
      .map(
        (place) => `
            <button class="btn place-btn" data-place-id="${place.id}">
                ${place.icon} ${place.name}
            </button>
        `
      )
      .join("");

    // Добавляем обработчики кликов для выбора места
    placesGrid.addEventListener("click", (e) => {
      // Находим ближайшую карточку места (если клик был по дочернему элементу)
      const placeCard = e.target.closest(".place-card");
      if (placeCard) {
        const placeId = placeCard.dataset.placeId;
        this.selectPlace(placeId);
      }
    });

    placesButtons.addEventListener("click", (e) => {
      // Находим ближайшую кнопку места (если клик был по дочернему элементу)
      const placeBtn = e.target.closest(".place-btn");
      if (placeBtn) {
        const placeId = placeBtn.dataset.placeId;
        this.selectPlace(placeId);
      }
    });
  }

  /**
   * Рендерит стандартные интервалы времени для таймера
   * Создает список пресетов в модальном окне выбора времени
   */
  renderTimerPresets() {
    const presetsContainer = document.getElementById("timer-presets");
    presetsContainer.innerHTML = this.timerPresets
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

  /**
   * Выбирает место для работы и переключает интерфейс
   * @param {string} placeId - ID выбранного места
   */
  selectPlace(placeId) {
    // Находим объект места по ID
    const place = this.places.find((p) => p.id === placeId);
    if (!place) return;

    // Сохраняем выбранное место
    this.currentPlace = place;

    // Обновляем фон главного экрана в соответствии с выбранным местом
    const mainScreen = document.getElementById("main-screen");
    mainScreen.className = `screen ${place.background}`;

    // Переключаемся с приветственного экрана на главный
    this.showMainScreen();

    // Обновляем нижнюю панель (показываем кнопки управления таймером)
    this.updateBottomPanel();

    // применяем картинку под место
    this.applyCharacterImageForPlace();
  }

  /**
   * Переключает интерфейс с приветственного экрана на главный
   * Использует плавную анимацию перехода
   */
  showMainScreen() {
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainScreen = document.getElementById("main-screen");

    // Добавляем класс для анимации исчезновения
    welcomeScreen.classList.add("fade-out");

    // Через 500мс (время анимации) переключаем экраны
    setTimeout(() => {
      welcomeScreen.classList.remove("active", "fade-out");
      mainScreen.classList.add("active");
    }, 500);
  }

  /**
   * Возвращает пользователя к приветственному экрану
   * Сбрасывает все состояния и останавливает активный таймер
   */
  goBack() {
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainScreen = document.getElementById("main-screen");

    // Сбрасываем состояние приложения
    this.currentPlace = null;
    this.stopTimer(); // Останавливаем таймер если он был запущен

    // Возвращаемся к приветственному экрану
    mainScreen.classList.remove("active");
    welcomeScreen.classList.add("active");

    // Сбрасываем фон главного экрана на стандартный
    mainScreen.className = "screen";

    // Обновляем нижнюю панель (показываем кнопки выбора места)
    this.updateBottomPanel();
  }

  /**
   * Обновляет отображение нижней панели в зависимости от состояния
   * Переключает между кнопками выбора места и управления таймером
   */
  updateBottomPanel() {
    const placesButtons = document.getElementById("places-buttons");
    const timerControls = document.getElementById("timer-controls");

    if (this.currentPlace) {
      // Если место выбрано - скрываем кнопки мест, показываем управление таймером
      placesButtons.style.display = "none";
      timerControls.style.display = "flex";
      this.updateTimerControls(); // Обновляем кнопки управления таймером
    } else {
      // Если место не выбрано - показываем кнопки выбора места, скрываем управление таймером
      placesButtons.style.display = "flex";
      timerControls.style.display = "none";
    }
  }

  /**
   * Обновляет состояние кнопок управления таймером
   * Динамически изменяет текст и стиль кнопки в зависимости от состояния таймера
   */
  updateTimerControls() {
    const btnStart = document.getElementById("btn-start");
    const btnBack = document.getElementById("btn-back");

    if (this.currentTimer) {
      // Таймер активен - показываем только кнопку остановки
      btnStart.textContent = "⏹ Остановить";
      btnStart.className = "btn btn-stop";
      btnBack.style.display = "none"; // Скрываем кнопку "Назад" во время работы таймера
    } else {
      // Таймер не активен - показываем кнопки запуска и возврата
      btnStart.textContent = "▶ Запустить";
      btnStart.className = "btn btn-start";
      btnBack.style.display = "block"; // Показываем кнопку "Назад"
    }
  }

  /**
   * Показывает модальное окно выбора времени для таймера
   * Сбрасывает предыдущий выбор пресета
   */
  showTimerModal() {
    const modal = document.getElementById("timer-modal");
    modal.classList.add("active");

    // Сбрасываем выделение всех пресетов (убираем класс selected)
    document.querySelectorAll(".preset-item").forEach((item) => {
      item.classList.remove("selected");
    });
  }

  /**
   * Скрывает модальное окно выбора времени
   */
  hideTimerModal() {
    const modal = document.getElementById("timer-modal");
    modal.classList.remove("active");
  }

  /**
   * Запускает таймер с указанной длительностью
   * Отправляет запрос на сервер и обновляет интерфейс
   * @param {number} duration - Длительность таймера в минутах
   */
  async startTimer(duration) {
    // Проверяем, не запущен ли уже таймер (предотвращаем множественные таймеры)
    if (this.currentTimer) {
      alert("Таймер уже запущен! Сначала остановите текущий таймер.");
      return;
    }

    if (typeof location !== "undefined" && location.protocol === "file:") {
      // Генерируем локальный timer_id и запускаем локальный таймер
      this.currentTimer = `timer_${Date.now()}`;
      this.startTimerDisplay(duration);
      this.animateCharacter(true);
      this.enterFocusMode();
      this.updateTimerControls();
      return;
    }

    try {
      // Отправляем POST запрос на сервер для запуска таймера
      const response = await fetch("/api/timer/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duration: duration,
          place: this.currentPlace.id,
        }),
      });

      const result = await response.json();

      if (result.status === "started") {
        // Сохраняем ID таймера для дальнейшего управления
        this.currentTimer = result.timer_id;

        // Запускаем визуальное отображение таймера
        this.startTimerDisplay(duration);

        // Анимируем персонажа (садимся за работу)
        this.animateCharacter(true);

        // Включаем фокус-режим (меняем изображение и фон)
        this.enterFocusMode();

        // Обновляем кнопки управления (показываем кнопку остановки)
        this.updateTimerControls();
      }
    } catch (error) {
      console.error("Ошибка запуска таймера:", error);
      alert("Не удалось запустить таймер");
    }
  }

  /**
   * Запускает визуальное отображение таймера
   * Показывает круговой прогресс-бар и обновляет время каждую секунду
   * @param {number} duration - Длительность таймера в минутах
   */
  startTimerDisplay(duration) {
    const timerDisplay = document.getElementById("timer-display");
    const timerText = document.getElementById("timer-text");
    const timerProgress = document.getElementById("timer-progress");
    const timerPlace = document.getElementById("timer-place");

    // Показываем панель таймера
    timerDisplay.style.display = "block";

    // Отображаем текущее место
    timerPlace.textContent = this.currentPlace ? this.currentPlace.name : "—";

    // Инициализируем время
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
        // На финише фиксируем 100%
        timerProgress.style.width = "100%";
        this.timerCompleted();
        return;
      }

      remainingSeconds--;
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  /**
   * Останавливает активный таймер
   * Очищает интервал, отправляет запрос на сервер и обновляет интерфейс
   */
  stopTimer() {
    // Очищаем интервал обновления таймера
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (typeof location !== "undefined" && location.protocol === "file:") {
      // Отправляем запрос на сервер для остановки таймера
      if (this.currentTimer) {
        // В офлайн-режиме нет API, поэтому просто удаляем локальный timer_id
        this.currentTimer = null;
      }
    } else {
      if (this.currentTimer) {
        fetch(`/api/timer/${this.currentTimer}/stop`, { method: "POST" }).catch(
          (error) => console.error("Ошибка остановки таймера:", error)
        );
      }
    }
    this.currentTimer = null;

    // Выключаем фокус-режим (возвращаем idle-изображение и фон)
    this.exitFocusMode();

    // Скрываем визуальное отображение таймера
    document.getElementById("timer-display").style.display = "none";

    // Возвращаем персонажа в исходное положение (встаем)
    this.animateCharacter(false);

    // Обновляем кнопки управления (показываем кнопку запуска)
    this.updateTimerControls();
  }

  /**
   * Обрабатывает завершение таймера
   * Воспроизводит звук, показывает уведомление и обновляет интерфейс
   */
  timerCompleted() {
    // Останавливаем таймер (очищает интервал и обновляет кнопки)
    this.stopTimer();

    // Воспроизводим звуковой сигнал завершения
    const audio = document.getElementById("timer-sound");
    if (audio) {
      audio
        .play()
        .catch((error) => console.log("Не удалось воспроизвести звук:", error));
    }

    // Показываем уведомление о завершении таймера
    this.showNotification("Время истекло!");

    // Возвращаем персонажа в исходное положение (встаем)
    this.animateCharacter(false);

    // Примечание: updateTimerControls уже вызывается в stopTimer()
  }

  /**
   * Анимирует персонажа между состояниями "стоя" и "сидя"
   * @param {boolean} sitting - true для состояния "сидя", false для "стоя"
   */
  animateCharacter(sitting) {
    const character = document.getElementById("character");

    if (sitting) {
      // Добавляем класс для анимации "сидя за работой"
      character.classList.add("sitting");
    } else {
      // Убираем класс для возврата в состояние "стоя"
      character.classList.remove("sitting");
    }
  }

  /**
   * Карта изображений персонажа по местам
   * idle — обычное состояние, working — во время таймера
   */
  characterImages = {
    work: {
      idle: "./static/images/char-work-idle.png",
      working: "./static/images/char-work-working.gif",
    },
    home: {
      idle: "./static/images/char-home-idle.png",
      working: "./static/images/char-home-working.gif",
    },
    cafe: {
      idle: "./static/images/char-cafe-idle.png",
      working: "./static/images/char-cafe-working.gif",
    },
    library: {
      idle: "./static/images/char-library-idle.png",
      working: "./static/images/char-library-working.gif",
    },
  };

  /**
   * Применяет картику персонажа в зависимости от текущего места и состояния (idle/working)
   */
  applyCharacterImageForPlace() {
    const img = document.getElementById("character-img");
    if (!img || !this.currentPlace) return;
    const placeId = this.currentPlace.id;
    const cfg = this.characterImages[placeId];
    if (!cfg) return;
    // сохраняем источники в data-атрибуты
    img.dataset.idleSrc = cfg.idle;
    img.dataset.workingSrc = cfg.working;
    // Выбираем актуальный источник по состоянию таймера
    const isWorking = Boolean(this.currentTimer);
    const nextSrc = isWorking ? cfg.working : cfg.idle;
    // Устанавливаем напрямую относительный путь — работает и для http(s), и для file://
    img.src = nextSrc;
  }

  /**
   * Обновляю enterFocusMode/exitFocusMode для смены картинки персонажа
   */
  enterFocusMode() {
    const mainScreen = document.getElementById("main-screen");
    if (!mainScreen.classList.contains("focus-active")) {
      mainScreen.classList.add("focus-active");
    }
    const img = document.getElementById("character-img");
    if (img) {
      const workingSrc = img.dataset.workingSrc;
      if (workingSrc) img.src = workingSrc;
    }
  }

  exitFocusMode() {
    const mainScreen = document.getElementById("main-screen");
    mainScreen.classList.remove("focus-active");
    const img = document.getElementById("character-img");
    if (img) {
      const idleSrc = img.dataset.idleSrc;
      if (idleSrc) img.src = idleSrc;
    }
  }

  /**
   * Показывает временное уведомление пользователю
   * @param {string} message - Текст уведомления
   */
  showNotification(message) {
    const notification = document.getElementById("completion-notification");
    const notificationText = notification.querySelector(".notification-text");

    // Устанавливаем текст уведомления
    notificationText.textContent = message;

    // Показываем уведомление
    notification.style.display = "block";

    // Автоматически скрываем уведомление через 3 секунды
    setTimeout(() => {
      notification.style.display = "none";
    }, 3000);
  }

  /**
   * Инициализирует интеграцию с Telegram Web App
   * Настраивает тему, обработчики событий и готовность приложения
   */
  initTelegramWebApp() {
    // Проверяем, доступен ли Telegram Web App API
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;

      // Уведомляем Telegram о готовности приложения
      tg.ready();

      // Автоматически определяем и применяем тему (светлая/темная)
      if (tg.colorScheme === "dark") {
        document.body.classList.add("dark-theme");
      }

      // Обрабатываем события от Telegram
      tg.onEvent("mainButtonClicked", () => {
        // Обработчик клика по главной кнопке Telegram
        // Можно добавить логику для главной кнопки
      });

      tg.onEvent("backButtonClicked", () => {
        // Обработчик нажатия кнопки "Назад" в Telegram
        if (this.currentPlace) {
          this.goBack(); // Возвращаемся к выбору места
        }
      });
    }
  }
}

/**
 * Инициализация приложения при загрузке страницы
 * Создает экземпляр приложения и настраивает интеграцию с Telegram
 */
document.addEventListener("DOMContentLoaded", () => {
  // Создаем основной экземпляр приложения
  const app = new PomodoroApp();

  // Инициализируем интеграцию с Telegram Web App (если доступно)
  app.initTelegramWebApp();

  // Делаем приложение доступным глобально для отладки в консоли браузера
  window.pomodoroApp = app;
});

/**
 * Обработка изменения видимости страницы
 * Позволяет корректно работать с таймером при переключении вкладок
 */
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    window.pomodoroApp &&
    window.pomodoroApp.timerInterval
  ) {
    // Страница скрыта - можно приостановить таймер или сохранить состояние
    // В будущем здесь можно добавить логику паузы/возобновления таймера
    console.log("Страница скрыта");
  }
});

/**
 * Глобальный обработчик ошибок JavaScript
 * Логирует все ошибки в консоль для отладки
 */
window.addEventListener("error", (e) => {
  console.error("Ошибка приложения:", e.error);
});

/**
 * Обработчик необработанных отклонений промисов
 * Логирует ошибки асинхронных операций для отладки
 */
window.addEventListener("unhandledrejection", (e) => {
  console.error("Необработанная ошибка промиса:", e.reason);
});
