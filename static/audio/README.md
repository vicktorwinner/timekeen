# Аудио файлы для уведомлений

## Требуемые файлы

### timer-complete.mp3

Звуковой сигнал, воспроизводимый по завершении таймера.

## Рекомендации

1. **Формат**: MP3 (совместим с большинством браузеров)
2. **Длительность**: 2-5 секунд
3. **Громкость**: Умеренная, не слишком громкая
4. **Тон**: Приятный, не раздражающий

## Источники аудио

### Онлайн генераторы

- [Online Tone Generator](https://www.szynalski.com/tone-generator/)
- [Bfxr](https://www.bfxr.net/) - генератор звуковых эффектов

### Готовые звуки

- [Freesound](https://freesound.org/) - бесплатные звуки
- [Zapsplat](https://www.zapsplat.com/) - звуковая библиотека

## Создание простого звука

Если у вас нет готового файла, можете создать простой звук через JavaScript:

```javascript
// Создание простого звукового сигнала
function createBeep() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.5
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}
```

## Замена в коде

Если вы хотите использовать JavaScript-звук вместо MP3 файла, замените в `script.js`:

```javascript
// Вместо:
const audio = document.getElementById("timer-sound");
if (audio) {
  audio
    .play()
    .catch((error) => console.log("Не удалось воспроизвести звук:", error));
}

// Используйте:
createBeep();
```
