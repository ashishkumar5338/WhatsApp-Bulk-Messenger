// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendMessages") {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, request, function(response) {
        sendResponse(response);
      });
    });
    return true; // Keep the messaging channel open for sendResponse
  }
});
