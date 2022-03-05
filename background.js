if (typeof browser === "undefined") {
    var browser = chrome;
}

var token = window.localStorage.getItem("token");

var listener = browser.webRequest.onSendHeaders.addListener(
    function(object) {
        object.requestHeaders.forEach(function(header) {
            if (header.name == "Authorization") {
                token = header.value;
                browser.webRequest.onSendHeaders.removeListener(listener);
                window.localStorage.setItem("token", token);
                chrome.tabs.sendMessage(object.tabId, token);
            }
        });
    },
    { urls: ["https://discord.com/api/v9/*"] },
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
