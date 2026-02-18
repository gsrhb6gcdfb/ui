/* ──────────────────────────────────────────────────────
   Mixer DSP  --  8-channel real-time audio mixer
   ────────────────────────────────────────────────────── */

#pragma once

#include <cstdint>
#include <cmath>
#include <string>
#include <vector>
#include <mutex>
#include <atomic>

static constexpr int MAX_CHANNELS = 8;

/* ── Per-channel audio data + state ──────────────────── */

struct AudioFile {
    std::vector<float> samplesL;   // left channel (interleaved -> deinterleaved)
    std::vector<float> samplesR;   // right channel
    uint32_t sampleRate = 48000;
    uint32_t fileChannels = 2;
    uint64_t totalFrames = 0;
    std::string filePath;
    std::string fileName;
    bool loaded = false;
};

struct ChannelState {
    AudioFile file;
    float volume = 0.75f;         // 0..1
    float pan = 0.0f;             // -1..+1
    bool muted = false;
    bool solo = false;
    // Metering (written by audio thread, read by main)
    std::atomic<float> rmsL{0.0f};
    std::atomic<float> rmsR{0.0f};
    std::atomic<float> peakL{0.0f};
    std::atomic<float> peakR{0.0f};
};

struct MasterState {
    float volume = 0.80f;
    std::atomic<float> rmsL{0.0f};
    std::atomic<float> rmsR{0.0f};
    std::atomic<float> peakL{0.0f};
    std::atomic<float> peakR{0.0f};
};

/* ── Mixer engine ────────────────────────────────────── */

class Mixer {
public:
    Mixer();
    ~Mixer() = default;

    // File loading (call from main thread)
    bool loadFile(int channelId, const std::string& filePath);
    void unloadFile(int channelId);

    // Channel control (thread-safe)
    void setVolume(int channelId, float volume);
    void setPan(int channelId, float pan);
    void setMute(int channelId, bool muted);
    void setSolo(int channelId, bool solo);
    void setMasterVolume(float volume);

    // Transport
    void play();
    void pause();
    void stop();
    void seek(double timeSeconds);

    // Audio callback (called from PortAudio audio thread)
    void processBlock(float* outputL, float* outputR, uint32_t framesPerBuffer);

    // Getters
    bool isPlaying() const { return m_playing.load(); }
    bool isPaused() const { return m_paused.load(); }
    double getCurrentTime() const;
    double getMaxDuration() const;

    ChannelState& getChannel(int id) { return m_channels[id]; }
    MasterState& getMaster() { return m_master; }

    void setSampleRate(uint32_t sr) { m_sampleRate = sr; }

private:
    ChannelState m_channels[MAX_CHANNELS];
    MasterState m_master;
    std::atomic<bool> m_playing{false};
    std::atomic<bool> m_paused{false};
    std::atomic<uint64_t> m_playhead{0}; // in frames
    uint32_t m_sampleRate = 48000;
    std::mutex m_fileMutex; // protects file loading
};
