/*
 * PortAudio Portable Real-Time Audio Library
 * PortAudio API Header File
 * Latest version available at: http://www.portaudio.com
 *
 * IMPORTANT: This is a PLACEHOLDER file.
 * Replace with the real portaudio.h from:
 *   http://www.portaudio.com/download.html
 *
 * To build with ASIO support on Windows:
 *   1. Download PortAudio source
 *   2. Download Steinberg ASIO SDK
 *   3. Build with CMake: cmake .. -DPA_USE_ASIO=ON
 *   4. Copy portaudio.h, .lib, and .dll to this deps folder
 */

#ifndef PORTAUDIO_H
#define PORTAUDIO_H

#ifdef __cplusplus
extern "C" {
#endif

typedef int PaError;
typedef int PaDeviceIndex;
typedef int PaHostApiIndex;
typedef double PaTime;
typedef unsigned long PaStreamCallbackFlags;

#define paNoError 0
#define paNoDevice (-1)
#define paContinue 0
#define paFloat32 0x00000001
#define paClipOff 0x00000001

typedef void PaStream;

typedef struct {
    int structVersion;
    const char *name;
    PaHostApiIndex hostApiIndex;
    int maxInputChannels;
    int maxOutputChannels;
    PaTime defaultLowInputLatency;
    PaTime defaultHighInputLatency;
    PaTime defaultLowOutputLatency;
    PaTime defaultHighOutputLatency;
    double defaultSampleRate;
} PaDeviceInfo;

typedef struct {
    int structVersion;
    int type;
    const char *name;
    int deviceCount;
    PaDeviceIndex defaultInputDevice;
    PaDeviceIndex defaultOutputDevice;
} PaHostApiInfo;

typedef struct {
    PaDeviceIndex device;
    int channelCount;
    unsigned long sampleFormat;
    PaTime suggestedLatency;
    void *hostApiSpecificStreamInfo;
} PaStreamParameters;

typedef struct {
    PaTime inputBufferAdcTime;
    PaTime currentTime;
    PaTime outputBufferDacTime;
} PaStreamCallbackTimeInfo;

typedef int (*PaStreamCallback)(
    const void *input, void *output,
    unsigned long frameCount,
    const PaStreamCallbackTimeInfo *timeInfo,
    PaStreamCallbackFlags statusFlags,
    void *userData);

PaError Pa_Initialize(void);
PaError Pa_Terminate(void);
int Pa_GetDeviceCount(void);
PaDeviceIndex Pa_GetDefaultOutputDevice(void);
const PaDeviceInfo* Pa_GetDeviceInfo(PaDeviceIndex device);
const PaHostApiInfo* Pa_GetHostApiInfo(PaHostApiIndex hostApi);
const char* Pa_GetErrorText(PaError errorCode);

PaError Pa_OpenStream(
    PaStream **stream,
    const PaStreamParameters *inputParameters,
    const PaStreamParameters *outputParameters,
    double sampleRate,
    unsigned long framesPerBuffer,
    PaStreamCallbackFlags streamFlags,
    PaStreamCallback streamCallback,
    void *userData);

PaError Pa_StartStream(PaStream *stream);
PaError Pa_StopStream(PaStream *stream);
PaError Pa_CloseStream(PaStream *stream);
double Pa_GetStreamCpuLoad(PaStream *stream);

#ifdef __cplusplus
}
#endif

#endif /* PORTAUDIO_H */
