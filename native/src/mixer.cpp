/* ──────────────────────────────────────────────────────
   Mixer DSP Implementation
   8-channel real-time audio mixer with volume, pan,
   mute/solo, constant-power pan law, and RMS metering.
   ────────────────────────────────────────────────────── */

#include "mixer.h"

/* We use dr_wav and dr_mp3 (header-only) for file decoding.
   The IMPLEMENTATION macros are defined in binding.gyp defines. */
#include "dr_wav.h"
#include "dr_mp3.h"

#include <algorithm>
#include <cstring>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* ── Constant-power pan law ──────────────────────────── */
static inline void panLaw(float pan, float& gainL, float& gainR) {
    // pan: -1 (full left) .. 0 (center) .. +1 (full right)
    float angle = (pan + 1.0f) * 0.25f * (float)M_PI; // 0..pi/2
    gainL = cosf(angle);
    gainR = sinf(angle);
}

/* ── RMS helper ──────────────────────────────────────── */
static inline float computeRMS(const float* buf, uint32_t frames) {
    float sum = 0.0f;
    for (uint32_t i = 0; i < frames; ++i) {
        sum += buf[i] * buf[i];
    }
    return sqrtf(sum / (float)std::max(frames, 1u));
}

static inline float computePeak(const float* buf, uint32_t frames) {
    float peak = 0.0f;
    for (uint32_t i = 0; i < frames; ++i) {
        float a = fabsf(buf[i]);
        if (a > peak) peak = a;
    }
    return peak;
}

/* ── Constructor ─────────────────────────────────────── */
Mixer::Mixer() {
    for (int i = 0; i < MAX_CHANNELS; ++i) {
        m_channels[i].volume = 0.75f;
        m_channels[i].pan = 0.0f;
        m_channels[i].muted = false;
        m_channels[i].solo = false;
    }
}

/* ── File loading (WAV + MP3) ────────────────────────── */
bool Mixer::loadFile(int channelId, const std::string& filePath) {
    if (channelId < 0 || channelId >= MAX_CHANNELS) return false;

    std::lock_guard<std::mutex> lock(m_fileMutex);
    auto& ch = m_channels[channelId];
    auto& f = ch.file;

    // Reset
    f.samplesL.clear();
    f.samplesR.clear();
    f.loaded = false;

    // Determine format by extension
    std::string ext;
    auto dot = filePath.rfind('.');
    if (dot != std::string::npos) {
        ext = filePath.substr(dot);
        for (auto& c : ext) c = (char)tolower(c);
    }

    std::vector<float> interleavedSamples;
    uint32_t channels = 0;
    uint32_t sampleRate = 0;
    uint64_t totalFrames = 0;

    if (ext == ".mp3") {
        // Decode MP3
        drmp3_config cfg;
        drmp3_uint64 mp3Frames;
        float* pSamples = drmp3_open_file_and_read_pcm_frames_f32(
            filePath.c_str(), &cfg, &mp3Frames, nullptr);
        if (!pSamples) return false;
        channels = cfg.channels;
        sampleRate = cfg.sampleRate;
        totalFrames = mp3Frames;
        interleavedSamples.assign(pSamples, pSamples + totalFrames * channels);
        drmp3_free(pSamples, nullptr);
    } else {
        // Decode WAV (and other formats supported by dr_wav)
        unsigned int wavChannels, wavSampleRate;
        drwav_uint64 wavFrames;
        float* pSamples = drwav_open_file_and_read_pcm_frames_f32(
            filePath.c_str(), &wavChannels, &wavSampleRate, &wavFrames, nullptr);
        if (!pSamples) return false;
        channels = wavChannels;
        sampleRate = wavSampleRate;
        totalFrames = wavFrames;
        interleavedSamples.assign(pSamples, pSamples + totalFrames * channels);
        drwav_free(pSamples, nullptr);
    }

    // Deinterleave into L/R
    f.samplesL.resize(totalFrames);
    f.samplesR.resize(totalFrames);
    f.sampleRate = sampleRate;
    f.fileChannels = channels;
    f.totalFrames = totalFrames;
    f.filePath = filePath;

    // Extract filename
    auto slash = filePath.find_last_of("/\\");
    f.fileName = (slash != std::string::npos) ? filePath.substr(slash + 1) : filePath;

    if (channels == 1) {
        // Mono -> duplicate to both channels
        for (uint64_t i = 0; i < totalFrames; ++i) {
            f.samplesL[i] = interleavedSamples[i];
            f.samplesR[i] = interleavedSamples[i];
        }
    } else {
        // Stereo (or more -- take first 2 channels)
        for (uint64_t i = 0; i < totalFrames; ++i) {
            f.samplesL[i] = interleavedSamples[i * channels + 0];
            f.samplesR[i] = interleavedSamples[i * channels + 1];
        }
    }

    // TODO: resample if file sampleRate != engine sampleRate
    f.loaded = true;
    return true;
}

void Mixer::unloadFile(int channelId) {
    if (channelId < 0 || channelId >= MAX_CHANNELS) return;
    std::lock_guard<std::mutex> lock(m_fileMutex);
    auto& f = m_channels[channelId].file;
    f.samplesL.clear();
    f.samplesR.clear();
    f.loaded = false;
    f.filePath.clear();
    f.fileName.clear();
    f.totalFrames = 0;
}

/* ── Channel control ─────────────────────────────────── */
void Mixer::setVolume(int id, float v) {
    if (id >= 0 && id < MAX_CHANNELS)
        m_channels[id].volume = std::clamp(v, 0.0f, 1.0f);
}
void Mixer::setPan(int id, float p) {
    if (id >= 0 && id < MAX_CHANNELS)
        m_channels[id].pan = std::clamp(p, -1.0f, 1.0f);
}
void Mixer::setMute(int id, bool m) {
    if (id >= 0 && id < MAX_CHANNELS) m_channels[id].muted = m;
}
void Mixer::setSolo(int id, bool s) {
    if (id >= 0 && id < MAX_CHANNELS) m_channels[id].solo = s;
}
void Mixer::setMasterVolume(float v) {
    m_master.volume = std::clamp(v, 0.0f, 1.0f);
}

/* ── Transport ───────────────────────────────────────── */
void Mixer::play() {
    m_playing.store(true);
    m_paused.store(false);
}
void Mixer::pause() {
    m_paused.store(true);
}
void Mixer::stop() {
    m_playing.store(false);
    m_paused.store(false);
    m_playhead.store(0);
}
void Mixer::seek(double timeSeconds) {
    uint64_t frame = (uint64_t)(timeSeconds * m_sampleRate);
    m_playhead.store(frame);
}

double Mixer::getCurrentTime() const {
    return (double)m_playhead.load() / (double)m_sampleRate;
}

double Mixer::getMaxDuration() const {
    double maxDur = 0.0;
    for (int i = 0; i < MAX_CHANNELS; ++i) {
        if (m_channels[i].file.loaded) {
            double dur = (double)m_channels[i].file.totalFrames / (double)m_channels[i].file.sampleRate;
            if (dur > maxDur) maxDur = dur;
        }
    }
    return maxDur;
}

/* ── Audio processing callback ───────────────────────── */
void Mixer::processBlock(float* outputL, float* outputR, uint32_t framesPerBuffer) {
    // Clear output
    memset(outputL, 0, framesPerBuffer * sizeof(float));
    memset(outputR, 0, framesPerBuffer * sizeof(float));

    if (!m_playing.load() || m_paused.load()) {
        // Zero all meters when not playing
        for (int i = 0; i < MAX_CHANNELS; ++i) {
            m_channels[i].rmsL.store(0.0f);
            m_channels[i].rmsR.store(0.0f);
            m_channels[i].peakL.store(0.0f);
            m_channels[i].peakR.store(0.0f);
        }
        m_master.rmsL.store(0.0f);
        m_master.rmsR.store(0.0f);
        m_master.peakL.store(0.0f);
        m_master.peakR.store(0.0f);
        return;
    }

    uint64_t pos = m_playhead.load();

    // Check if any channel has solo enabled
    bool hasSolo = false;
    for (int i = 0; i < MAX_CHANNELS; ++i) {
        if (m_channels[i].solo && m_channels[i].file.loaded) {
            hasSolo = true;
            break;
        }
    }

    // Temp buffers per channel for metering
    std::vector<float> chBufL(framesPerBuffer, 0.0f);
    std::vector<float> chBufR(framesPerBuffer, 0.0f);

    for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
        auto& c = m_channels[ch];
        if (!c.file.loaded) {
            c.rmsL.store(0.0f); c.rmsR.store(0.0f);
            c.peakL.store(0.0f); c.peakR.store(0.0f);
            continue;
        }

        // Solo logic: if any channel is solo'd, mute non-solo channels
        bool audible = !c.muted;
        if (hasSolo) audible = c.solo && !c.muted;

        // Pan law
        float panL, panR;
        panLaw(c.pan, panL, panR);

        float vol = c.volume;

        for (uint32_t f = 0; f < framesPerBuffer; ++f) {
            uint64_t samplePos = pos + f;
            float sL = 0.0f, sR = 0.0f;

            if (samplePos < c.file.totalFrames) {
                sL = c.file.samplesL[samplePos];
                sR = c.file.samplesR[samplePos];
            }

            float outL = sL * vol * panL;
            float outR = sR * vol * panR;

            chBufL[f] = outL;
            chBufR[f] = outR;

            if (audible) {
                outputL[f] += outL;
                outputR[f] += outR;
            }
        }

        // Update per-channel meters (always, even if muted -- for visual feedback)
        c.rmsL.store(computeRMS(chBufL.data(), framesPerBuffer));
        c.rmsR.store(computeRMS(chBufR.data(), framesPerBuffer));
        c.peakL.store(computePeak(chBufL.data(), framesPerBuffer));
        c.peakR.store(computePeak(chBufR.data(), framesPerBuffer));
    }

    // Apply master volume
    float mv = m_master.volume;
    for (uint32_t f = 0; f < framesPerBuffer; ++f) {
        outputL[f] *= mv;
        outputR[f] *= mv;
    }

    // Master metering
    m_master.rmsL.store(computeRMS(outputL, framesPerBuffer));
    m_master.rmsR.store(computeRMS(outputR, framesPerBuffer));
    m_master.peakL.store(computePeak(outputL, framesPerBuffer));
    m_master.peakR.store(computePeak(outputR, framesPerBuffer));

    // Advance playhead
    uint64_t newPos = pos + framesPerBuffer;
    m_playhead.store(newPos);

    // Auto-stop when all files have finished
    bool allDone = true;
    for (int i = 0; i < MAX_CHANNELS; ++i) {
        if (m_channels[i].file.loaded && newPos < m_channels[i].file.totalFrames) {
            allDone = false;
            break;
        }
    }
    bool anyLoaded = false;
    for (int i = 0; i < MAX_CHANNELS; ++i) {
        if (m_channels[i].file.loaded) { anyLoaded = true; break; }
    }
    if (anyLoaded && allDone) {
        m_playing.store(false);
        m_paused.store(false);
        m_playhead.store(0);
    }
}
