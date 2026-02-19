/*
WAV audio decoder. Choice of public domain or MIT-0. See license at the bottom of this file.
dr_wav - v0.13.16 - 2024-02-27

David Reid - mackron@gmail.com

IMPORTANT: This is a STUB file for the project repository.
For a real build, download the full header from:
https://raw.githubusercontent.com/mackron/dr_libs/master/dr_wav.h

The full header (~7000 lines) provides:
  - drwav_open_file_and_read_pcm_frames_f32()
  - drwav_free()
  - Full WAV/AIFF/RF64 decoding support
  - 8/16/24/32-bit PCM, IEEE float, A-law, mu-law

BUILD INSTRUCTIONS:
  1. Download the real dr_wav.h from the URL above
  2. Replace this stub file with the downloaded file
  3. The DR_WAV_IMPLEMENTATION macro is defined in binding.gyp
*/

#ifndef dr_wav_h
#define dr_wav_h

#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdint.h>

typedef uint64_t drwav_uint64;

/*
Opens a WAV file and reads all PCM frames as 32-bit floats.
Returns a heap-allocated buffer (use drwav_free to release).
*/
float* drwav_open_file_and_read_pcm_frames_f32(
    const char* filename,
    unsigned int* channelsOut,
    unsigned int* sampleRateOut,
    drwav_uint64* totalFrameCountOut,
    const void* pAllocationCallbacks);

void drwav_free(void* p, const void* pAllocationCallbacks);

#ifdef __cplusplus
}
#endif

/* When DR_WAV_IMPLEMENTATION is defined (in binding.gyp), 
   the full implementation code would be included here.
   Download the complete file from the URL above. */

#endif /* dr_wav_h */
