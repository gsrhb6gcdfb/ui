{
  "targets": [
    {
      "target_name": "audio_engine",
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "sources": [
        "src/audio-engine.cpp",
        "src/mixer.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "deps",
        "deps/portaudio/include"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "DR_WAV_IMPLEMENTATION",
        "DR_MP3_IMPLEMENTATION"
      ],
      "conditions": [
        ["OS=='win'", {
          "defines": [
            "PA_USE_WASAPI",
            "PA_USE_ASIO"
          ],
          "libraries": [
            "-l<(module_root_dir)/deps/portaudio/lib/portaudio_x64.lib"
          ],
          "copies": [
            {
              "destination": "<(PRODUCT_DIR)",
              "files": [
                "<(module_root_dir)/deps/portaudio/bin/portaudio_x64.dll"
              ]
            }
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }],
        ["OS=='linux'", {
          "libraries": ["-lportaudio"]
        }],
        ["OS=='mac'", {
          "libraries": ["-lportaudio"],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
          }
        }]
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ]
    }
  ]
}
