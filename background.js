if (typeof browser === "undefined") {
    var browser = chrome;
}

// Listen for Discord data
var token = undefined;
var listener = browser.webRequest.onSendHeaders.addListener(
    function(object) {
        object.requestHeaders.forEach(function(header) {
            if (header.name == "Authorization") {
                token = header.value;
                browser.webRequest.onSendHeaders.removeListener(listener);
                chrome.tabs.sendMessage(object.tabId, token);
            }
        });
    },
    { urls: ["https://discord.com/api/v9/*"] },
    ["requestHeaders"]
);

// Listen for Instagram data
var ig_claim, ig_app_id, ig_asbd_id = undefined;
var listener = browser.webRequest.onSendHeaders.addListener(
    function(object) {
        object.requestHeaders.forEach(function(header) {
            if (header.name == "X-IG-WWW-Claim") {
                ig_claim = header.value;
                chrome.tabs.sendMessage(object.tabId, { ig_claim: ig_claim, ig_app_id: ig_app_id, ig_asbd_id: ig_asbd_id });
            } else if (header.name == "X-IG-App-ID") {
                ig_app_id = header.value;
                chrome.tabs.sendMessage(object.tabId, { ig_claim: ig_claim, ig_app_id: ig_app_id, ig_asbd_id: ig_asbd_id });
            } else if (header.name == "X-ASBD-ID") {
                ig_asbd_id = header.value;
                chrome.tabs.sendMessage(object.tabId, { ig_claim: ig_claim, ig_app_id: ig_app_id, ig_asbd_id: ig_asbd_id });
            }
        });
    },
    { urls: ["https://*.instagram.com/*"] },
    ["requestHeaders"]
);

// Content script will send messages to be downloaded
browser.runtime.onMessage.addListener(
    function(message, sendResponse) {
        browser.downloads.download({
            url: "data:application/json," + encodeURIComponent(JSON.stringify(message.messages)),
            filename: message.filename
        });
    }
);
