/*
MP3 audio decoder. Choice of public domain or MIT-0. See license at the bottom of this file.
dr_mp3 - v0.6.39 - 2024-02-27

David Reid - mackron@gmail.com

IMPORTANT: This is a STUB file for the project repository.
For a real build, download the full header from:
https://raw.githubusercontent.com/mackron/dr_libs/master/dr_mp3.h

The full header (~5000 lines) provides:
  - drmp3_open_file_and_read_pcm_frames_f32()
  - drmp3_free()
  - Full MPEG Layer 3 decoding support
  - All bitrates and sample rates

BUILD INSTRUCTIONS:
  1. Download the real dr_mp3.h from the URL above
  2. Replace this stub file with the downloaded file
  3. The DR_MP3_IMPLEMENTATION macro is defined in binding.gyp
*/

#ifndef dr_mp3_h
#define dr_mp3_h

#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdint.h>

typedef uint64_t drmp3_uint64;

typedef struct {
    uint32_t channels;
    uint32_t sampleRate;
} drmp3_config;

/*
Opens an MP3 file and reads all PCM frames as 32-bit floats.
Returns a heap-allocated buffer (use drmp3_free to release).
*/
float* drmp3_open_file_and_read_pcm_frames_f32(
    const char* filePath,
    drmp3_config* pConfig,
    drmp3_uint64* pTotalFrameCount,
    const void* pAllocationCallbacks);

void drmp3_free(void* p, const void* pAllocationCallbacks);

#ifdef __cplusplus
}
#endif

/* When DR_MP3_IMPLEMENTATION is defined (in binding.gyp),
   the full implementation code would be included here.
   Download the complete file from the URL above. */

#endif /* dr_mp3_h */
