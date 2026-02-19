# 📱 Stage Traxx — Инструкция по сборке Windows приложения

## ⚡ Быстрый старт (за 5 минут)

### Что нужно установить
- **Node.js** (https://nodejs.org) — выберите LTS версию
- **Visual Studio 2022 Community** (https://visualstudio.microsoft.com)
  - Во время установки выберите **"Desktop development with C++"**
- **Git** (https://git-scm.com) — опционально, если будете клонировать через консоль

### Запустить приложение БЕЗ звука (за 1 минуту)

```bash
git clone https://github.com/gsrhb6gcdfb/ui.git stage-traxx
cd stage-traxx
npm install
npm run dev
```

Откройте http://localhost:3000 в браузере — интерфейс работает, но звука нет.

---

## 🎵 Добавить реальный звук (за 10 минут)

### Шаг 1: Установить зависимости (уже сделано выше)
```bash
npm install
```

### Шаг 2: Получить PortAudio (готовая библиотека)

Вместо того чтобы компилировать PortAudio (это сложно), используем готовую версию.

**Вариант A: Автоматически (проще)**
```bash
cd native/deps
powershell -Command "
\$url = 'https://github.com/portaudio/portaudio/releases/download/v19.7.0/portaudio19.zip'
Invoke-WebRequest -Uri \$url -OutFile portaudio.zip
Expand-Archive portaudio.zip -DestinationPath .
Remove-Item portaudio.zip
"
cd ../..
```

**Вариант B: Вручную**
1. Откройте https://github.com/portaudio/portaudio/releases
2. Скачайте файл `portaudio19.zip` (или похожий)
3. Распакуйте в папку `native/deps/portaudio`
4. Убедитесь, что в папке есть подпапки: `include/`, `lib/`, `bin/`

### Шаг 3: Скомпилировать C++ аудио-движок

```bash
cd native
node-gyp rebuild --release
cd ..
```

Если видите ошибку про Visual Studio:
```bash
npm config set msvs_version 2022
cd native
node-gyp rebuild --release
cd ..
```

### Шаг 4: Запустить с звуком

```bash
npm run dev:electron
```

Откроется окно приложения с поддержкой:
- Выбора аудиоустройства (ASIO / WASAPI)
- Загрузки WAV и MP3 файлов
- Реального микширования 8 каналов
- VU метры и регулировка громкости

---

## 📦 Создать Windows установщик (.exe)

```bash
npm run dist:win
```

Готовый файл `Stage Traxx Setup 1.0.0.exe` будет в папке `dist-release/`.
Можете отправить этот .exe другим людям — приложение установится как обычная программа.

---

## 🔧 Структура папок

```
stage-traxx/
├── app/               # Интерфейс (Next.js + React)
├── components/        # Компоненты микшера
├── electron/          # Electron (десктоп оболочка)
├── native/            # C++ аудио-движок
│   ├── src/
│   │   ├── audio-engine.cpp    # PortAudio обертка
│   │   └── mixer.cpp           # Микшер 8 каналов
│   ├── deps/portaudio/         # PortAudio библиотеки
│   └── build/                  # Скомпилированные .node файлы
├── hooks/             # React hooks
├── package.json       # Конфигурация npm
└── BUILD.md           # Эта инструкция
```

---

## ❌ Ошибки и решения

| Ошибка | Решение |
|--------|---------|
| `CMake Error: The source directory does not appear to contain CMakeLists.txt` | Используйте готовую PortAudio (Шаг 2 Вариант A/B) вместо компиляции из исходников |
| `node-gyp ERR! gyp ERR!` | Установите Visual Studio 2022 и запустите: `npm config set msvs_version 2022` |
| `Cannot find portaudio.h` | Проверьте что PortAudio распакована в `native/deps/portaudio` с подпапками `include/`, `lib/`, `bin/` |
| Нет звука в приложении | 1) Проверьте уровень громкости Windows. 2) В приложении откройте "Настройки" и выберите правильное устройство вывода |
| Electron не открывается | Попробуйте `npm run dev` в браузере. Если браузер работает, проблема в C++ аддоне — проверьте step 3 |

---

## 📋 Все команды

| Команда | Что делает |
|---------|-----------|
| `npm install` | Установить JavaScript зависимости |
| `npm run dev` | Запустить в браузере (без звука) |
| `npm run dev:electron` | Запустить Electron + реальный звук |
| `npm run dist:win` | Создать Windows .exe установщик |

---

## ✅ Чеклист

- [ ] Node.js установлен (`node --version` показывает версию)
- [ ] Visual Studio 2022 установлена (можно проверить в Панель управления → Программы)
- [ ] Проект клонирован: `git clone ...`
- [ ] `npm install` завершён без красных ошибок
- [ ] PortAudio распакована в `native/deps/portaudio`
- [ ] `npm run dev` работает в браузере на http://localhost:3000
- [ ] `npm run dev:electron` открывает окно без ошибок в консоли
- [ ] Можно загружать аудиофайлы и слышать звук

---

## 💡 Советы

**Для быстрого тестирования UI:**
```bash
npm run dev        # Работает сразу, без сборки C++
```

**Для разработки с реальным звуком:**
```bash
npm run dev:electron   # Медленнее стартует, но работает полностью
```

**Если не слышно звука:**
1. Откройте консоль: Ctrl+Shift+I (в окне Electron)
2. Перейдите на вкладку Console
3. Посмотрите есть ли красные ошибки
4. Если видите `audio_engine.node not found` — переделайте Шаг 3
