document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('toggleProcessing');
    const status = document.getElementById('status');
    
    button.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PROCESSING' });
        
        if (response.success) {
          button.textContent = response.isEnabled ? 'Disable Voice Isolation' : 'Enable Voice Isolation';
          button.classList.toggle('enabled', response.isEnabled);
          status.textContent = response.isEnabled ? 'Voice isolation active' : '';
        } else {
          status.textContent = 'Error: ' + (response.error || 'Failed to toggle processing');
        }
      } catch (error) {
        status.textContent = 'Error: Please refresh the YouTube page and try again';
      }
    });
  });