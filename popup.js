document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('toggleProcessing');
    const status = document.getElementById('status');
    
    button.addEventListener('click', async () => {
        status.textContent = 'Processing...';
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('youtube.com')) {
                status.textContent = 'Please navigate to a YouTube video page';
                return;
            }
            
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PROCESSING' });
            
            if (response.success) {
                button.textContent = response.isEnabled ? 'Disable Voice Isolation' : 'Enable Voice Isolation';
                button.classList.toggle('enabled', response.isEnabled);
                status.textContent = response.isEnabled ? 'Voice isolation active' : '';
            } else {
                status.textContent = response.error || 'Error: Please refresh and try again';
            }
        } catch (error) {
            console.error('Popup error:', error);
            status.textContent = 'Error: Make sure you are on a YouTube video page and refresh';
        }
    });
});
document.getElementById('alphaSlider').addEventListener('input', (event) => {
    const alpha = parseFloat(event.target.value);
    chrome.runtime.sendMessage({ type: 'SET_ALPHA', alpha });
});

