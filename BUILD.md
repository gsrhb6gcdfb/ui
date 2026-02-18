# Stage Traxx -- Инструкция по сборке (Windows)

## Требования

Перед началом установите:

| Инструмент | Где скачать | Зачем нужен |
|---|---|---|
| **Node.js 20+** | https://nodejs.org | Запуск проекта, npm |
| **Git** | https://git-scm.com | Клонирование репозитория |
| **Visual Studio 2022** (Community) | https://visualstudio.microsoft.com | Компиляция C++ аддона |
| **Python 3.10+** | https://python.org | Нужен для `node-gyp` |

При установке Visual Studio обязательно выберите компонент **"Desktop development with C++"** (Разработка классических приложений C++).

---

## Шаг 1. Клонирование и установка зависимостей

```bash
git clone <url-репозитория> stage-traxx
cd stage-traxx
npm install
```

---

## Шаг 2. Скачивание библиотек декодирования

```bash
node scripts/setup-native-deps.js
```

Скрипт скачает заголовочные файлы `dr_wav.h` и `dr_mp3.h` (декодеры WAV/MP3) в папку `native/deps/`.

---

## Шаг 3. Сборка PortAudio с ASIO

### 3.1 Скачайте исходники

- **PortAudio**: http://www.portaudio.com/download.html
- **ASIO SDK**: https://www.steinberg.net/developers/ (нужна регистрация, бесплатно)

### 3.2 Соберите PortAudio через CMake

```bash
# Распакуйте архив PortAudio
cd portaudio
mkdir build
cd build

# Соберите с поддержкой ASIO
cmake .. -DPA_USE_ASIO=ON -DASIOSDK_ROOT="C:\path\to\asio-sdk"
cmake --build . --config Release
```

### 3.3 Скопируйте результаты в проект

Скопируйте три файла из сборки PortAudio в папку `native/deps/portaudio/`:

```
portaudio.h         -->  native/deps/portaudio/include/portaudio.h
portaudio_x64.lib   -->  native/deps/portaudio/lib/portaudio_x64.lib
portaudio_x64.dll   -->  native/deps/portaudio/bin/portaudio_x64.dll
```

---

## Шаг 4. Сборка нативного аудио-аддона

```bash
npm install node-addon-api
cd native
node-gyp rebuild
cd ..
```

После успешной сборки в `native/build/Release/` появится файл `audio_engine.node`.

---

## Шаг 5. Запуск в режиме разработки

### Только UI (в браузере, без аудио-движка)

```bash
npm run dev
```

Откройте http://localhost:3000 -- интерфейс работает в режиме симуляции.

### Electron + нативное аудио

```bash
npm run dev:electron
```

Откроется окно Electron с полным аудио-движком. В этом режиме:
- Доступен выбор ASIO / WASAPI устройств
- Работает реальное воспроизведение WAV / MP3
- Отображаются настоящие VU-метры
- Микширование 8 каналов с панорамой

---

## Шаг 6. Сборка установщика (.exe)

```bash
npm run dist:win
```

Эта команда выполнит:
1. Статическую сборку Next.js (папка `out/`)
2. Компиляцию Electron TypeScript (папка `dist-electron/`)
3. Упаковку через electron-builder в NSIS-установщик

Готовый установщик появится в папке `dist-release/`. Файл будет называться примерно:

```
dist-release/Stage Traxx Setup 1.0.0.exe
```

---

## Структура проекта

```
stage-traxx/
  app/                    # Next.js страницы (UI)
  components/             # React-компоненты микшера
  electron/
    main.ts               # Главный процесс Electron
    preload.ts            # Мост между UI и нативным кодом
    ipc-handlers.ts       # Обработчики IPC-команд
  native/
    src/
      audio-engine.cpp    # PortAudio обертка + N-API привязки
      audio-engine.h
      mixer.cpp           # Микшер 8 каналов (volume, pan, mute/solo)
      mixer.h
    deps/
      dr_wav.h            # Декодер WAV
      dr_mp3.h            # Декодер MP3
      portaudio/          # Заголовки и библиотеки PortAudio
    binding.gyp           # Конфигурация node-gyp
  hooks/
    use-audio-engine.ts   # React-хук для работы с движком
  lib/
    electron-api.ts       # Типизированный доступ к electronAPI
  types/
    electron.d.ts         # TypeScript-типы для IPC
  scripts/
    setup-native-deps.js  # Скрипт загрузки зависимостей
```

---

## Решение проблем

| Проблема | Решение |
|---|---|
| `node-gyp rebuild` не находит компилятор | Убедитесь, что установлен VS 2022 с C++ workload. Запустите `npm config set msvs_version 2022` |
| `Cannot find portaudio.h` | Проверьте, что `portaudio.h` лежит в `native/deps/portaudio/include/` |
| `Cannot find portaudio_x64.lib` | Проверьте, что `.lib` файл лежит в `native/deps/portaudio/lib/` |
| ASIO устройства не видны | Убедитесь, что PortAudio собран с `-DPA_USE_ASIO=ON`, и что установлен ASIO-драйвер устройства |
| Electron не запускается | Проверьте `npm run build:electron`, ошибки TypeScript будут видны в консоли |
| Нет звука в Electron | Откройте вкладку "Настройки" внизу, проверьте выбранное устройство вывода |

---

## Краткая шпаргалка

```bash
# Первоначальная настройка (один раз)
npm install
node scripts/setup-native-deps.js
# ... сборка PortAudio (см. шаг 3) ...
npm install node-addon-api
cd native && node-gyp rebuild && cd ..

# Ежедневная разработка
npm run dev:electron

# Финальная сборка
npm run dist:win
```
