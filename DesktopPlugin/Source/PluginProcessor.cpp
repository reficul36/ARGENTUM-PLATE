#include "PluginProcessor.h"

//==============================================================================
// Constructor: Setup default parameter links and state trees
ArgentumPlateAudioProcessor::ArgentumPlateAudioProcessor()
    : AudioProcessor(BusesProperties()
        .withInput("Input", juce::AudioChannelSet::stereo(), true)
        .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
    apvts(*this, nullptr, "Parameters", createParameterLayout())
{
    // Check if the host CPU supports your AVX2 vector optimizations
    useAVX2 = juce::SystemStats::hasAVX2();
}

ArgentumPlateAudioProcessor::~ArgentumPlateAudioProcessor() {}

//==============================================================================
// Parameter Layout: Defines the knobs your DAW (like FL Studio) will see and automate
juce::AudioProcessorValueTreeState::ParameterLayout ArgentumPlateAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    // These IDs ("predelay", "decay", "size") match the parameters visible in your screenshots
    params.push_back(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{ "predelay", 1 }, "Pre-Delay", 0.0f, 250.0f, 20.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{ "decay",    1 }, "Decay Time", 0.1f, 30.0f, 2.5f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{ "size",     1 }, "Room Size", 0.1f, 2.0f, 1.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{ "mix",      1 }, "Mix", 0.0f, 1.0f, 0.5f));

    return { params.begin(), params.end() };
}

//==============================================================================
void ArgentumPlateAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    // Initialize parameter smoothers to avoid audio clicks when turning knobs
    decaySm.reset(sampleRate, 0.05);
    dampSm.reset(sampleRate, 0.05);
    mixSm.reset(sampleRate, 0.05);

    // Initial calculation of reverb coefficients based on sample rate
    updateCoefficients(sampleRate);
}

void ArgentumPlateAudioProcessor::releaseResources() {}

bool ArgentumPlateAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    // Ensure the DAW uses stereo inputs and stereo outputs
    if (layouts.getMainOutput() != juce::AudioChannelSet::stereo())
        return false;
    if (layouts.getMainInput() != juce::AudioChannelSet::stereo())
        return false;
    return true;
}

//==============================================================================
// Parameter Smoothing calculations
void ArgentumPlateAudioProcessor::updateCoefficients(double sampleRate) noexcept
{
    // Grab raw values directly from the DAW UI parameters
    float targetDecay = *apvts.getRawParameterValue("decay");
    float targetMix = *apvts.getRawParameterValue("mix");

    // Set targets for the smoothers (Matches code seen in your calculation panel screenshot)
    decaySm.setTargetValue(targetDecay);
    mixSm.setTargetValue(targetMix);
}

//==============================================================================
// The Audio Core Processing Loop
void ArgentumPlateAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    // Prevents floating-point subnormal performance issues on modern CPUs (Critical optimization!)
    juce::ScopedNoDenormals noDenormals;

    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear extra dangling output channels if present
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    // Update real-time target values before running the main loop block
    updateCoefficients(getSampleRate());

    // --- PASTE THE COMPACT DSP & VECTOR LOOP HERE ---
    // This is the specific block you will provide to a text AI along with your processBlock 
    // screenshot to fill out the matrix, delay lines, and sample reading loop.
}

//==============================================================================
// AVX2 Assembly / Vectorization Implementation Stub
inline void ArgentumPlateAudioProcessor::tapSum8(const float* __restrict base,
    const __m256i idx, const __m256 frac,
    const __m256 sgn, float& aout) noexcept
{
    // This handles the specialized multi-tap reading code from your vectorized screenshot
}

//==============================================================================
// UI Window Setup Interface Stub
juce::AudioProcessorEditor* ArgentumPlateAudioProcessor::createEditor()
{
    return new juce::GenericAudioProcessorEditor(*this); // Renders automatic generic slider controls
}

//==============================================================================
// State Saving/Loading: Allows the DAW to save user project presets
void ArgentumPlateAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void ArgentumPlateAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState.get() != nullptr)
        if (xmlState->hasTagName(apvts.state.getType()))
            apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

//==============================================================================
// Framework Entry Hook
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new ArgentumPlateAudioProcessor();
}
