cmake_minimum_required(VERSION 3.22)

# 1. Define your plugin project name and target language
project(ArgentumPlate VERSION 1.0.0 LANGUAGES CXX)

# 2. Automatically download the JUCE framework from GitHub during compilation
include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/reficul36/ARGENTUM-PLATE
     GIT_TAG master
)
FetchContent_MakeAvailable(JUCE)

# 3. Create the Audio Plugin target configuration
juce_add_plugin(ArgentumPlate
    COMPANY_NAME "ArenaAI"
    PLUGIN_NAME "ArgentumPlate"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    FORMATS VST3                  # Tells the compiler to output a .vst3 file
    PRODUCT_NAME "ArgentumPlate"
)

# 4. Map the C++ code files located inside your Source folder
target_sources(ArgentumPlate PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginProcessor.h
    Source/PluginEditor.cpp
    Source/PluginEditor.h
)


# 5. Link the plugin to the mandatory JUCE audio processing libraries
target_link_libraries(ArgentumPlate PRIVATE
    juce::juce_audio_utils
    juce::juce_dsp
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
)

# 6. Enable the AVX2 Vector Optimization requested by your code screenshots
if(MSVC)
    target_compile_options(ArgentumPlate PRIVATE /arch:AVX2)
else()
    target_compile_options(ArgentumPlate PRIVATE -mavx2)
endif()
