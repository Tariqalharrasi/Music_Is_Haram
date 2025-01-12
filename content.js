console.log('Content script loaded');

// Immediately-invoked function expression (IIFE) to create proper scope
(function () {
    // Global state variables
    const state = {
        audioContext: null,
        source: null,
        audioProcessor: null,
        isProcessingEnabled: false,
        alpha: 0.95,  // Default alpha value
    };

    // Function to wait for the YouTube player (video element)
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


      
    // Initialize Audio Processing
    async function initializeAudioProcessing() {
        try {
            console.log('Initializing audio processing...');
            const video = await waitForYouTubePlayer();

            if (state.audioContext) {
                console.log('Audio context already exists');
                return true;
            }

            // Create new audio context
            state.audioContext = new AudioContext();
            console.log('Created audio context');
            // Create Biquad Filter for Bandpass
            state.bandpassFilter = state.audioContext.createBiquadFilter();
            state.bandpassFilter.type = 'bandpass';
            state.bandpassFilter.frequency.value = 1500; // Center frequency of the bandpass filter
            state.bandpassFilter.Q.value = 1.5;
            // Load AudioWorkletProcessor
            await state.audioContext.audioWorklet
                .addModule(chrome.runtime.getURL('processor.js'))
                .catch((err) => {
                    throw new Error('AudioWorklet module failed to load: ' + err.message);
                });

            // Create and connect nodes
            state.source = state.audioContext.createMediaElementSource(video);
            state.audioProcessor = new AudioWorkletNode(
                state.audioContext,
                'custom-processor'
            );

            // Send initial parameters to the processor
            state.audioProcessor.port.postMessage({
                type: 'SET_PARAMETERS',
                alpha: state.alpha,  // Pass the dynamic alpha value
            });
            state.audioProcessor.port.postMessage({
                isEnabled: state.isProcessingEnabled,
            });
            // Connect the audio processing chain
            state.source
                .connect(state.bandpassFilter)  // First pass through the bandpass filter
                .connect(state.audioProcessor)
                .connect(state.audioContext.destination);

            console.log('Audio processing initialized successfully');
            return true;
        } catch (error) {
            console.error('Error in initializeAudioProcessing:', error);
            return false;
        }
    }

    // Message handler
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        console.log('Received message:', request);

        if (request.type === 'TOGGLE_PROCESSING') {
            try {
                if (!state.audioContext) {
                    const initialized = await initializeAudioProcessing();
                    if (!initialized) {
                        console.error('Failed to initialize audio processing');
                        sendResponse({
                            success: false,
                            error: 'Failed to initialize audio. Please ensure you are on a YouTube video page.',
                        });
                        return true;
                    }
                }

                state.isProcessingEnabled = !state.isProcessingEnabled;
                console.log('Processing enabled:', state.isProcessingEnabled);

                // Resume audio context if it was suspended
                if (state.audioContext.state === 'suspended') {
                    await state.audioContext.resume();
                }

                // Visual feedback
                const video = document.querySelector('video');
                if (video) {
                    video.style.border = state.isProcessingEnabled
                        ? '2px solid green'
                        : 'none';
                }

                sendResponse({
                    success: true,
                    isEnabled: state.isProcessingEnabled,
                });
            } catch (error) {
                console.error('Error in message handler:', error);
                sendResponse({
                    success: false,
                    error: 'An error occurred while processing audio',
                });
            }
        }

        if (request.type === 'SET_ALPHA') {
            state.alpha = request.alpha;
            if (state.audioProcessor) {
                state.audioProcessor.port.postMessage({
                    type: 'SET_PARAMETERS',
                    alpha: state.alpha,
                });
                console.log('Alpha updated to:', state.alpha);
            }
            sendResponse({ success: true });
        }

        return true;
    });

    // Debounce function to limit calls
    function debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    const debouncedInitialize = debounce(() => {
        if (!state.audioContext) {
            initializeAudioProcessing();
        }
    }, 500);

    // Set up mutation observer to watch for video element
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const videoNode = addedNodes.find((node) => node.tagName === 'VIDEO');

                if (videoNode && !state.audioContext) {
                    console.log('New video element detected');
                    debouncedInitialize();
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Initialize when navigation completes
    if (document.readyState === 'complete') {
        initializeAudioProcessing();
    } else {
        window.addEventListener('load', () => {
            initializeAudioProcessing();
        });
    }
})(); // End of IIFE
