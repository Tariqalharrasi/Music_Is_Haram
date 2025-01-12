class CustomProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.alpha = 0.95;  // Default alpha value
        this.lowFreqCutoff = 150; // Lower cutoff frequency for voice (in Hz)
        this.highFreqCutoff = 2500; // Upper cutoff frequency for voice (in Hz)
    }

    // Simple bandpass filter to isolate voice frequencies
    applyBandpassFilter(audioData, sampleRate) {
        const filtered = new Float32Array(audioData.length);

        // Apply low-pass and high-pass filters
        const lowPassAlpha = Math.exp(-2 * Math.PI * this.lowFreqCutoff / sampleRate);
        const highPassAlpha = Math.exp(-2 * Math.PI * this.highFreqCutoff / sampleRate);

        let lastLowPassOutput = 0;
        let lastHighPassOutput = 0;

        for (let i = 0; i < audioData.length; i++) {
            // Apply low-pass filter
            lastLowPassOutput = (1 - lowPassAlpha) * audioData[i] + lowPassAlpha * lastLowPassOutput;
            // Apply high-pass filter
            lastHighPassOutput = (1 - highPassAlpha) * (audioData[i] - lastLowPassOutput) + highPassAlpha * lastHighPassOutput;

            // Store the filtered value
            filtered[i] = lastHighPassOutput;
        }

        return filtered;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || !input.length) return true;

        const sampleRate = this.contextInfo.sampleRate; // Sample rate (e.g., 44100 Hz)

        for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            // Apply bandpass filter to isolate voice frequencies
            const bandpassFiltered = this.applyBandpassFilter(inputChannel, sampleRate);

            // Output the filtered audio
            outputChannel.set(bandpassFiltered);
        }

        return true;
    }
}

registerProcessor('custom-processor', CustomProcessor);
