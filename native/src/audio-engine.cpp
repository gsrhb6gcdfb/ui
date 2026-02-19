/* ──────────────────────────────────────────────────────
   Audio Engine N-API Implementation
   PortAudio-based audio output with ASIO/WASAPI support
   ────────────────────────────────────────────────────── */

#include "audio-engine.h"
#include <chrono>
#include <cstring>
#include <iostream>

/* Header-only decoders (implementation triggered by defines in binding.gyp) */
#include "dr_wav.h"
#include "dr_mp3.h"

/* ══════════════════════════════════════════════════════
   AudioEngine implementation
   ══════════════════════════════════════════════════════ */

AudioEngine::AudioEngine() {}

AudioEngine::~AudioEngine() {
    shutdown();
}

bool AudioEngine::initialize(uint32_t sampleRate, uint32_t bufferSize, int deviceIndex) {
    if (m_initialized) shutdown();

    PaError err = Pa_Initialize();
    if (err != paNoError) {
        std::cerr << "[AudioEngine] Pa_Initialize failed: " << Pa_GetErrorText(err) << std::endl;
        return false;
    }

    m_sampleRate = sampleRate;
    m_bufferSize = bufferSize;
    m_deviceIndex = deviceIndex;
    m_mixer.setSampleRate(sampleRate);

    // Allocate temp buffers
    m_tempL.resize(bufferSize);
    m_tempR.resize(bufferSize);

    // Select output device
    PaStreamParameters outputParams;
    memset(&outputParams, 0, sizeof(outputParams));

    if (deviceIndex >= 0) {
        outputParams.device = deviceIndex;
    } else {
        outputParams.device = Pa_GetDefaultOutputDevice();
    }

    if (outputParams.device == paNoDevice) {
        std::cerr << "[AudioEngine] No output device found" << std::endl;
        Pa_Terminate();
        return false;
    }

    const PaDeviceInfo* devInfo = Pa_GetDeviceInfo(outputParams.device);
    outputParams.channelCount = 2; // stereo output
    outputParams.sampleFormat = paFloat32;
    outputParams.suggestedLatency = devInfo->defaultLowOutputLatency;
    outputParams.hostApiSpecificStreamInfo = nullptr;

    err = Pa_OpenStream(
        &m_stream,
        nullptr,           // no input
        &outputParams,
        sampleRate,
        bufferSize,
        paClipOff,
        &AudioEngine::paCallback,
        this
    );

    if (err != paNoError) {
        std::cerr << "[AudioEngine] Pa_OpenStream failed: " << Pa_GetErrorText(err) << std::endl;
        Pa_Terminate();
        return false;
    }

    err = Pa_StartStream(m_stream);
    if (err != paNoError) {
        std::cerr << "[AudioEngine] Pa_StartStream failed: " << Pa_GetErrorText(err) << std::endl;
        Pa_CloseStream(m_stream);
        Pa_Terminate();
        return false;
    }

    m_initialized = true;
    m_deviceIndex = outputParams.device;
    startMeteringThread();

    std::cout << "[AudioEngine] Initialized: " << devInfo->name
              << " @ " << sampleRate << "Hz, buffer=" << bufferSize << std::endl;
    return true;
}

void AudioEngine::shutdown() {
    stopMeteringThread();
    if (m_stream) {
        Pa_StopStream(m_stream);
        Pa_CloseStream(m_stream);
        m_stream = nullptr;
    }
    if (m_initialized) {
        Pa_Terminate();
        m_initialized = false;
    }
}

std::vector<AudioEngine::DeviceInfo> AudioEngine::getDevices() const {
    std::vector<DeviceInfo> devices;
    int numDevices = Pa_GetDeviceCount();
    int defaultOut = Pa_GetDefaultOutputDevice();

    for (int i = 0; i < numDevices; ++i) {
        const PaDeviceInfo* info = Pa_GetDeviceInfo(i);
        if (info->maxOutputChannels <= 0) continue; // skip input-only

        const PaHostApiInfo* hostApi = Pa_GetHostApiInfo(info->hostApiIndex);
        devices.push_back({
            i,
            info->name,
            hostApi ? hostApi->name : "Unknown",
            info->maxOutputChannels,
            info->defaultSampleRate,
            i == defaultOut
        });
    }
    return devices;
}

bool AudioEngine::setOutputDevice(int deviceIndex) {
    return initialize(m_sampleRate, m_bufferSize, deviceIndex);
}

AudioEngine::Status AudioEngine::getStatus() const {
    Status s;
    s.sampleRate = m_sampleRate;
    s.bufferSize = m_bufferSize;
    s.cpuLoad = m_stream ? Pa_GetStreamCpuLoad(m_stream) : 0.0;

    if (m_deviceIndex >= 0) {
        const PaDeviceInfo* info = Pa_GetDeviceInfo(m_deviceIndex);
        if (info) {
            s.outputDevice = info->name;
            const PaHostApiInfo* hostApi = Pa_GetHostApiInfo(info->hostApiIndex);
            s.hostApi = hostApi ? hostApi->name : "Unknown";
        }
    }
    return s;
}

/* ── PortAudio callback (audio thread) ───────────────── */
int AudioEngine::paCallback(
    const void* /*input*/, void* output,
    unsigned long framesPerBuffer,
    const PaStreamCallbackTimeInfo* /*timeInfo*/,
    PaStreamCallbackFlags /*statusFlags*/,
    void* userData)
{
    auto* engine = static_cast<AudioEngine*>(userData);
    float* out = static_cast<float*>(output);

    engine->m_mixer.processBlock(
        engine->m_tempL.data(),
        engine->m_tempR.data(),
        (uint32_t)framesPerBuffer
    );

    // Interleave L/R into stereo output
    for (unsigned long i = 0; i < framesPerBuffer; ++i) {
        out[i * 2 + 0] = engine->m_tempL[i];
        out[i * 2 + 1] = engine->m_tempR[i];
    }

    return paContinue;
}

/* ── Metering thread ─────────────────────────────────── */
void AudioEngine::startMeteringThread() {
    if (m_meterRunning.load()) return;
    m_meterRunning.store(true);
    m_meterThread = std::thread([this]() {
        while (m_meterRunning.load()) {
            if (m_meterCallback) {
                m_meterCallback();
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(33)); // ~30fps
        }
    });
}

void AudioEngine::stopMeteringThread() {
    m_meterRunning.store(false);
    if (m_meterThread.joinable()) {
        m_meterThread.join();
    }
}

/* ══════════════════════════════════════════════════════
   N-API Module  --  JavaScript bindings
   ══════════════════════════════════════════════════════ */

static AudioEngine* g_engine = nullptr;
static Napi::ThreadSafeFunction g_meterTsfn;
static Napi::ThreadSafeFunction g_timeTsfn;

/* ── Initialize ──────────────────────────────────────── */
Napi::Value Initialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (g_engine) {
        g_engine->shutdown();
        delete g_engine;
    }
    g_engine = new AudioEngine();

    uint32_t sampleRate = 48000;
    uint32_t bufferSize = 256;

    if (info.Length() > 0 && info[0].IsObject()) {
        auto opts = info[0].As<Napi::Object>();
        if (opts.Has("sampleRate")) sampleRate = opts.Get("sampleRate").As<Napi::Number>().Uint32Value();
        if (opts.Has("bufferSize")) bufferSize = opts.Get("bufferSize").As<Napi::Number>().Uint32Value();
    }

    bool ok = g_engine->initialize(sampleRate, bufferSize);
    return Napi::Boolean::New(env, ok);
}

/* ── Get Devices ─────────────────────────────────────── */
Napi::Value GetDevices(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    auto arr = Napi::Array::New(env);
    if (!g_engine) return arr;

    auto devices = g_engine->getDevices();
    for (size_t i = 0; i < devices.size(); ++i) {
        auto obj = Napi::Object::New(env);
        obj.Set("index", Napi::Number::New(env, devices[i].index));
        obj.Set("name", Napi::String::New(env, devices[i].name));
        obj.Set("hostApi", Napi::String::New(env, devices[i].hostApi));
        obj.Set("maxOutputChannels", Napi::Number::New(env, devices[i].maxOutputChannels));
        obj.Set("defaultSampleRate", Napi::Number::New(env, devices[i].defaultSampleRate));
        obj.Set("isDefault", Napi::Boolean::New(env, devices[i].isDefault));
        arr.Set((uint32_t)i, obj);
    }
    return arr;
}

/* ── Set Output Device ───────────────────────────────── */
Napi::Value SetOutputDevice(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!g_engine || info.Length() < 1) return Napi::Boolean::New(env, false);
    int idx = info[0].As<Napi::Number>().Int32Value();
    return Napi::Boolean::New(env, g_engine->setOutputDevice(idx));
}

/* ── Get Status ──────────────────────────────────────── */
Napi::Value GetStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    auto obj = Napi::Object::New(env);
    if (!g_engine) return obj;
    auto s = g_engine->getStatus();
    obj.Set("sampleRate", Napi::Number::New(env, s.sampleRate));
    obj.Set("bufferSize", Napi::Number::New(env, s.bufferSize));
    obj.Set("outputDevice", Napi::String::New(env, s.outputDevice));
    obj.Set("hostApi", Napi::String::New(env, s.hostApi));
    obj.Set("cpuLoad", Napi::Number::New(env, s.cpuLoad));
    return obj;
}

/* ── Load / Unload File ──────────────────────────────── */
Napi::Value LoadFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!g_engine || info.Length() < 2) return env.Null();

    int channelId = info[0].As<Napi::Number>().Int32Value();
    std::string filePath = info[1].As<Napi::String>().Utf8Value();

    bool ok = g_engine->getMixer().loadFile(channelId, filePath);
    if (!ok) return env.Null();

    auto& f = g_engine->getMixer().getChannel(channelId).file;
    auto obj = Napi::Object::New(env);
    obj.Set("path", Napi::String::New(env, f.filePath));
    obj.Set("name", Napi::String::New(env, f.fileName));
    obj.Set("sampleRate", Napi::Number::New(env, f.sampleRate));
    obj.Set("channels", Napi::Number::New(env, f.fileChannels));
    obj.Set("durationSeconds", Napi::Number::New(env, (double)f.totalFrames / f.sampleRate));
    obj.Set("frames", Napi::Number::New(env, (double)f.totalFrames));
    return obj;
}

Napi::Value UnloadFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!g_engine || info.Length() < 1) return env.Undefined();
    int channelId = info[0].As<Napi::Number>().Int32Value();
    g_engine->getMixer().unloadFile(channelId);
    return env.Undefined();
}

/* ── Transport ───────────────────────────────────────── */
Napi::Value Play(const Napi::CallbackInfo& info) {
    if (g_engine) g_engine->getMixer().play();
    return info.Env().Undefined();
}
Napi::Value Pause(const Napi::CallbackInfo& info) {
    if (g_engine) g_engine->getMixer().pause();
    return info.Env().Undefined();
}
Napi::Value Stop(const Napi::CallbackInfo& info) {
    if (g_engine) g_engine->getMixer().stop();
    return info.Env().Undefined();
}
Napi::Value Seek(const Napi::CallbackInfo& info) {
    if (g_engine && info.Length() > 0) {
        double t = info[0].As<Napi::Number>().DoubleValue();
        g_engine->getMixer().seek(t);
    }
    return info.Env().Undefined();
}

/* ── Channel Control ─────────────────────────────────── */
Napi::Value SetVolume(const Napi::CallbackInfo& info) {
    if (g_engine && info.Length() >= 2) {
        int id = info[0].As<Napi::Number>().Int32Value();
        float v = info[1].As<Napi::Number>().FloatValue();
        g_engine->getMixer().setVolume(id, v / 100.0f); // JS sends 0-100
    }
    return info.Env().Undefined();
}
Napi::Value SetPan(const Napi::CallbackInfo& info) {
    if (g_engine && info.Length() >= 2) {
        int id = info[0].As<Napi::Number>().Int32Value();
        float p = info[1].As<Napi::Number>().FloatValue();
        g_engine->getMixer().setPan(id, p / 50.0f); // JS sends -50..+50
    }
    return info.Env().Undefined();
}
Napi::Value SetMute(const Napi::CallbackInfo& info) {
    if (g_engine && info.Length() >= 2) {
        int id = info[0].As<Napi::Number>().Int32Value();
        bool m = info[1].As<Napi::Boolean>().Value();
        g_engine->getMixer().setMute(id, m);
    }
    return info.Env().Undefined();
}
Napi::Value SetSolo(const Napi::CallbackInfo& info) {
    if (g_engine && info.Length() >= 2) {
        int id = info[0].As<Napi::Number>().Int32Value();
        bool s = info[1].As<Napi::Boolean>().Value();
        g_engine->getMixer().setSolo(id, s);
    }
    return info.Env().Undefined();
}
Napi::Value SetMasterVolume(const Napi::CallbackInfo& info) {
    if (g_engine && info.Length() >= 1) {
        float v = info[0].As<Napi::Number>().FloatValue();
        g_engine->getMixer().setMasterVolume(v / 100.0f);
    }
    return info.Env().Undefined();
}

/* ── Metering callbacks ──────────────────────────────── */
Napi::Value OnMeterData(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsFunction()) return env.Undefined();

    auto callback = info[0].As<Napi::Function>();
    g_meterTsfn = Napi::ThreadSafeFunction::New(env, callback, "MeterCallback", 0, 1);

    if (g_engine) {
        g_engine->setMeterCallback([&]() {
            if (!g_engine) return;
            g_meterTsfn.NonBlockingCall([](Napi::Env env, Napi::Function jsCallback) {
                if (!g_engine) return;
                auto data = Napi::Object::New(env);

                // Channel meters
                auto channels = Napi::Array::New(env, MAX_CHANNELS);
                for (int i = 0; i < MAX_CHANNELS; ++i) {
                    auto& ch = g_engine->getMixer().getChannel(i);
                    auto chObj = Napi::Object::New(env);
                    chObj.Set("id", Napi::Number::New(env, i + 1)); // 1-based for JS
                    chObj.Set("rmsL", Napi::Number::New(env, ch.rmsL.load()));
                    chObj.Set("rmsR", Napi::Number::New(env, ch.rmsR.load()));
                    chObj.Set("peakL", Napi::Number::New(env, ch.peakL.load()));
                    chObj.Set("peakR", Napi::Number::New(env, ch.peakR.load()));
                    channels.Set((uint32_t)i, chObj);
                }
                data.Set("channels", channels);

                // Master meters
                auto& m = g_engine->getMixer().getMaster();
                auto master = Napi::Object::New(env);
                master.Set("rmsL", Napi::Number::New(env, m.rmsL.load()));
                master.Set("rmsR", Napi::Number::New(env, m.rmsR.load()));
                master.Set("peakL", Napi::Number::New(env, m.peakL.load()));
                master.Set("peakR", Napi::Number::New(env, m.peakR.load()));
                data.Set("master", master);

                jsCallback.Call({data});
            });
        });
    }
    return env.Undefined();
}

Napi::Value OnTimeUpdate(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsFunction()) return env.Undefined();
    /* Time updates are piggybacked on the meter callback in ipc-handlers.ts
       by reading getCurrentTime() on each meter tick. This avoids a second thread. */
    return env.Undefined();
}

/* ── Dispose ─────────────────────────────────────────── */
Napi::Value Dispose(const Napi::CallbackInfo& info) {
    if (g_engine) {
        g_engine->shutdown();
        delete g_engine;
        g_engine = nullptr;
    }
    if (g_meterTsfn) g_meterTsfn.Release();
    if (g_timeTsfn) g_timeTsfn.Release();
    return info.Env().Undefined();
}

/* ══════════════════════════════════════════════════════
   Module registration
   ══════════════════════════════════════════════════════ */

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("initialize", Napi::Function::New(env, Initialize));
    exports.Set("getDevices", Napi::Function::New(env, GetDevices));
    exports.Set("setOutputDevice", Napi::Function::New(env, SetOutputDevice));
    exports.Set("getStatus", Napi::Function::New(env, GetStatus));
    exports.Set("loadFile", Napi::Function::New(env, LoadFile));
    exports.Set("unloadFile", Napi::Function::New(env, UnloadFile));
    exports.Set("play", Napi::Function::New(env, Play));
    exports.Set("pause", Napi::Function::New(env, Pause));
    exports.Set("stop", Napi::Function::New(env, Stop));
    exports.Set("seek", Napi::Function::New(env, Seek));
    exports.Set("setVolume", Napi::Function::New(env, SetVolume));
    exports.Set("setPan", Napi::Function::New(env, SetPan));
    exports.Set("setMute", Napi::Function::New(env, SetMute));
    exports.Set("setSolo", Napi::Function::New(env, SetSolo));
    exports.Set("setMasterVolume", Napi::Function::New(env, SetMasterVolume));
    exports.Set("onMeterData", Napi::Function::New(env, OnMeterData));
    exports.Set("onTimeUpdate", Napi::Function::New(env, OnTimeUpdate));
    exports.Set("dispose", Napi::Function::New(env, Dispose));
    return exports;
}

NODE_API_MODULE(audio_engine, Init)
