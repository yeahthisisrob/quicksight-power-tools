chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ["content.bundle.js"],
    },
    () => {
      chrome.tabs.sendMessage(
        tab.id,
        { action: "toggleSidebar" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Background script error:",
              chrome.runtime.lastError.message,
            );
          } else if (!response) {
            console.error("No response from content script.");
          } else {
            console.log("Sidebar toggled:", response);
          }
        },
      );
    },
  );
});
