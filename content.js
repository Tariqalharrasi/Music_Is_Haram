
let audioContext;
let source;
let audioProcessor;

async function initializeAudioProcessor() {
    const video = document.querySelector('video');
    if (!video) {
      return;
    }

  audioContext = new AudioContext();
  source = audioContext.createMediaElementSource(video);

  audioProcessor = audioContext.createScriptProcessor(4096, 2, 2);

  audioProcessor.onaudioprocess = async (event) => {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;

    const leftChannel = inputBuffer.getChannelData(0);
    const rightChannel = inputBuffer.getChannelData(1);

    const filteredLeft = highPassFilter(leftChannel);
    const filteredRight = highPassFilter(rightChannel);

    const leftOutput = outputBuffer.getChannelData(0);
    const rightOutput = outputBuffer.getChannelData(1);

    leftOutput.set(filteredLeft);
    rightOutput.set(filteredRight);

  };

  source.connect(audioProcessor);
  audioProcessor.connect(audioContext.destination); 
}

function highPassFilter(audioData) {
  // Simple high-pass filter implementation
  // This is a basic example - real voice isolation would need more sophisticated algorithms
  const filtered = new Float32Array(audioData.length);
  let lastOutput = 0;
  const alpha = 0.95; // Filter coefficient
  
  for (let i = 0; i < audioData.length; i++) {
    filtered[i] = alpha * (lastOutput + audioData[i] - audioData[i]);
    lastOutput = filtered[i];
  }
  
  return filtered;
}

const observer = new MutationObserver(() => {
    if (document.querySelector('video') && !audioContext) {
      initializeAudioProcessing();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  