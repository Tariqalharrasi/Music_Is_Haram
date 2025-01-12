class CustomProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.alpha = 0.95; // Default alpha value for high-pass
        this.lastOutput = new Float32Array(2); // Maintain state for each channel
        this.lowFreqCutoff = 100; // Lower cutoff frequency for voice (in Hz)
        this.highFreqCutoff = 3000; // Upper cutoff frequency for voice (in Hz)

        // Listen for messages from the main thread to adjust parameters dynamically
        this.port.onmessage = (event) => {
            if (event.data.type === 'SET_PARAMETERS' && typeof event.data.alpha === 'number') {
                this.alpha = event.data.alpha;
                console.log(`Alpha value updated to: ${this.alpha}`);
            }
        };
    }

    // Simple bandpass filter to isolate voice frequencies
    applyBandpassFilter(audioData, sampleRate) {
        const filtered = new Float32Array(audioData.length);

        // Example implementation using a basic bandpass filter
        // Apply low-pass filter
        const lowPassAlpha = Math.exp(-2 * Math.PI * this.lowFreqCutoff / sampleRate);
        // Apply high-pass filter
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
