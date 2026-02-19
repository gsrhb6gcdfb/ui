/* ──────────────────────────────────────────────────────
   Audio Engine  --  PortAudio wrapper + N-API bindings
   ────────────────────────────────────────────────────── */

#pragma once

#include "mixer.h"
#include <portaudio.h>
#include <napi.h>
#include <thread>
#include <atomic>
#include <functional>

class AudioEngine {
public:
    AudioEngine();
    ~AudioEngine();

    // Initialize PortAudio with given config
    bool initialize(uint32_t sampleRate, uint32_t bufferSize, int deviceIndex = -1);
    void shutdown();

    // Device enumeration
    struct DeviceInfo {
        int index;
        std::string name;
        std::string hostApi;
        int maxOutputChannels;
        double defaultSampleRate;
        bool isDefault;
    };
    std::vector<DeviceInfo> getDevices() const;
    bool setOutputDevice(int deviceIndex);

    // Status
    struct Status {
        uint32_t sampleRate;
        uint32_t bufferSize;
        std::string outputDevice;
        std::string hostApi;
        double cpuLoad;
    };
    Status getStatus() const;

    // Access to mixer
    Mixer& getMixer() { return m_mixer; }

    // Metering callback (called from metering thread)
    using MeterCallback = std::function<void()>;
    void setMeterCallback(MeterCallback cb) { m_meterCallback = cb; }

    // Start/stop metering thread
    void startMeteringThread();
    void stopMeteringThread();

private:
    // PortAudio callback
    static int paCallback(const void* input, void* output,
                          unsigned long framesPerBuffer,
                          const PaStreamCallbackTimeInfo* timeInfo,
                          PaStreamCallbackFlags statusFlags,
                          void* userData);

    Mixer m_mixer;
    PaStream* m_stream = nullptr;
    uint32_t m_sampleRate = 48000;
    uint32_t m_bufferSize = 256;
    int m_deviceIndex = -1;
    bool m_initialized = false;

    // Metering thread
    std::thread m_meterThread;
    std::atomic<bool> m_meterRunning{false};
    MeterCallback m_meterCallback;

    // Temp interleaved output buffer (for PortAudio stereo interleaved)
    std::vector<float> m_tempL;
    std::vector<float> m_tempR;
};
