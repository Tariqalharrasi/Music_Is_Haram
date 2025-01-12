
console.log('Content script loaded');

const state = {
    audioContext: null,
    source: null,
    audioProcessor: null,
    isProcessingEnabled: false
};


function processAudioChannel(audioData) {
    // Improved audio processing with better voice isolation
    const filtered = new Float32Array(audioData.length);
    let lastOutput = 0;
    const alpha = 0.95; // Filter coefficient
    const beta = 0.05;  // Voice enhancement coefficient
    
    for (let i = 0; i < audioData.length; i++) {
      // Apply more aggressive filtering for music frequencies
      const highPass = alpha * (lastOutput + audioData[i] - audioData[i]);
      // Enhance voice frequencies
      filtered[i] = highPass + (beta * audioData[i]);
      lastOutput = filtered[i];
    }
    
    return filtered;
}
/*
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
}*/

function waitForYouTubePlayer() {
    return new Promise((resolve) => {
        const checkVideo = () => {
            const video = document.querySelector('video');
            if (video) {
                console.log('YouTube video element found');
                resolve(video);
            } else {
                console.log('Waiting for video element...');
                setTimeout(checkVideo, 1000);
            }
        };
        checkVideo();
    });
}

async function initializeAudioProcessor() {
    try {
        console.log('Initializing audio processing...');
        
        const video = await waitForYouTubePlayer();
        
        if (state.audioContext) {
            console.log('Audio context already exists');
            return true;
        }

    audioContext = new AudioContext();
    state.source = audioContext.createMediaElementSource(video);

    state.audioProcessor = audioContext.createScriptProcessor(4096, 2, 2);

    state.audioProcessor.onaudioprocess = async (event) => {

        if (!state.isProcessingEnabled) {
        return;
        }

        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        /*
        const leftChannel = inputBuffer.getChannelData(0);
        const rightChannel = inputBuffer.getChannelData(1);

        const filteredLeft = highPassFilter(leftChannel);
        const filteredRight = highPassFilter(rightChannel);

        const leftOutput = outputBuffer.getChannelData(0);
        const rightOutput = outputBuffer.getChannelData(1);

        leftOutput.set(filteredLeft);
        rightOutput.set(filteredRight);*/

        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel);
            const outputData = outputBuffer.getChannelData(channel);
            
            // Apply processing when enabled
            if (state.isProcessingEnabled) {
                const processed = processAudioChannel(inputData);
                outputData.set(processed);
            } else {
                outputData.set(inputData);
            }
        }

  };

    state.source.connect(state.audioProcessor);
    state.audioProcessor.connect(state.audioContext.destination); 
    console.log('Audio processing initialized successfully');
    return true;
    }
    catch (error) {
        console.error('Failed to initialize audio processor:', error);
        return false;
    }
}


chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log('Received message:', request);
    if (request.type === 'TOGGLE_PROCESSING') {
      if (!state.audioContext) {
        const initialized = initializeAudioProcessing();
        if (!initialized) {
          sendResponse({ success: false, error: 'Failed to initialize audio processing' });
          return true;
        }
      }
      
      state.isProcessingEnabled = !state.isProcessingEnabled;
      
      /// Resume audio context if it was suspended
      if (state.audioContext.state === 'suspended') {
            await state.audioContext.resume();
        }
    
        // Visual feedback
        const video = document.querySelector('video');
        if (video) {
            video.style.border = state.isProcessingEnabled ? '2px solid green' : 'none';
        }
        
        sendResponse({ 
            success: true, 
            isEnabled: state.isProcessingEnabled 
        });
    }
    return true;
  });
  
  if (document.readyState === 'complete') {
    initializeAudioProcessing();
} else {
    window.addEventListener('load', () => {
        initializeAudioProcessing();
    });
}

// Also try to initialize when page content changes
const observer = new MutationObserver(() => {
    if (document.querySelector('video') && !state.audioContext) {
        initializeAudioProcessing();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

  