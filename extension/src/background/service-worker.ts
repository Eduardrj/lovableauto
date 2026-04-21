/// <reference types="chrome" />

// ──────────────────────────────────────────
// Service Worker — Background script
// Manages auth callbacks, side panel, and messaging
// ──────────────────────────────────────────

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Enable side panel on Lovable tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.includes('lovable.dev')) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true,
    });
  }
});

// Handle auth callback — capture JWT from the backend callback page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url?.includes('/auth/github/callback')
  ) {
    // Execute script to extract token from the page
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        try {
          const body = document.body.innerText;
          const data = JSON.parse(body);
          if (data.token) {
            chrome.runtime.sendMessage({
              type: 'AUTH_CALLBACK',
              token: data.token,
              user: data.user,
            });
          }
        } catch {
          // Not a JSON page, ignore
        }
      },
    });
  }
});

// Listen for auth callback messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_CALLBACK' && message.token) {
    // Store token
    chrome.storage.local.set({
      authToken: message.token,
      user: message.user,
    });

    // Close the callback tab
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {});
    }

    // Notify side panel (ignore error if side panel is closed)
    chrome.runtime.sendMessage({
      type: 'AUTH_SUCCESS',
      user: message.user,
    }).catch(() => {});
  }

  // Forward Lovable project detection to side panel
  if (message.type === 'LOVABLE_PROJECT_DETECTED') {
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  return true;
});

console.log('[LovableAuto] Service worker initialized');
