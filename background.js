// background.js

// Initialize extension state
let extensionState = {
  sendOne: true,
  stage: "initial",
  contacts: [],
  message: "",
  caption: 0
};

// Load extension state from storage
chrome.storage.local.get(null, function (data) {
  if (data && Object.keys(data).length > 0) {
    extensionState = data;
  }
});

// Listen for changes in the extension state
chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let key in changes) {
    extensionState[key] = changes[key].newValue;
  }
});

// Function to get the current extension state
function getExtensionState() {
  return extensionState;
}

// Function to update the extension state
function updateExtensionState(newState) {
  chrome.storage.local.set(newState);
}

// Handle messages from popup or other scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendMessages") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, request, function (response) {
        sendResponse(response);
      });
    });
    return true; // Keep the messaging channel open for sendResponse
  } else if (request.action === "getState") {
    sendResponse(extensionState); // Return extension state to caller
  } else if (request.action === "stopMessages") {

    // Update extension state to stop the process
    updateExtensionState({
      sendOne: false,
      stage: "ready",
      contacts: [],
      message: "",
      caption: 0
    });

    // Inform content script to stop
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stopMessages" }, function (response) {
        sendResponse(response);
      });
    });
  }
});
