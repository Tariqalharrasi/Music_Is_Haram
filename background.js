chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if(request.type === 'PROCESS_AUDIO'){
        sendResponse({success: true});
    }
  });
  