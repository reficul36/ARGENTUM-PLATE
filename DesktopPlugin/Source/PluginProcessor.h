#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <immintrin.h> // Required for the AVX2 vector functions found in your screenshots
#include <vector>

//==============================================================================
// The lattice all-pass delay line structure from the Arena AI framework
struct DelayLine
{
    std::vector<float> buf; // Power-of-two length buffer
    uint32_t mask = 0;
    uint32_t w = 0;

    inline void write(float v) noexcept
    {
        buf[w] = v;
        w = (w + 1) & mask;
    }

    inline float read(float d) const noexcept
    {
        const float p = float(w) - d;
        const int32_t i = (int32_t)std::floor(p);
        const float f = p - float(i);
        const float a = buf[uint32_t(i) & mask];
        const float b = buf[uint32_t(i + 1) & mask];
        return a + (b - a) * f; // Linear interpolation block
    }
};

//==============================================================================
class ArgentumPlateAudioProcessor : public juce::AudioProcessor
{
public:
    //==============================================================================
    ArgentumPlateAudioProcessor();
    ~ArgentumPlateAudioProcessor() override;

    //==============================================================================
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==============================================================================
    const juce::String getName() const override { return JucePlugin_Name; }

    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    //==============================================================================
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int index) override {}
    const juce::String getProgramName(int index) override { return {}; }
    void changeProgramName(int index, const juce::String& newName) override {}

    //==============================================================================
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // Static layout helper function required for your FL Studio automation mapping
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

private:
    //==============================================================================
    // Smoothers declaration block from your coefficient calculation window
    juce::LinearSmoothedValue<float> decaySm;
    juce::LinearSmoothedValue<float> bassSm;
    juce::LinearSmoothedValue<float> dampSm;
    juce::LinearSmoothedValue<float> mixSm;
    juce::LinearSmoothedValue<float> widthSm;

    // System architecture checking
    bool useAVX2 = false;

    // Parameter tree to sync the UI knobs with the processing block
    juce::AudioProcessorValueTreeState apvts;

    // AVX2 inline function for vectorizing processing across taps
    inline void tapSum8(const float* __restrict base,
        const __m256i idx, const __m256 frac,
        const __m256 sgn, float& aout) noexcept;

    // Core loop configuration parameters
    void updateCoefficients(double sampleRate) noexcept;
    void renderSlice(int startSample, int numSamples);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ArgentumPlateAudioProcessor)
};
