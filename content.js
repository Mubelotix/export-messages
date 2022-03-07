if (typeof browser === "undefined") {
    var browser = chrome;
}

console.log("content.js loaded");

var url = window.location.href;
var button = undefined;
var adding_button = false;
var is_discord = url.startsWith("https://discord.com/");
var token, ig_claim, ig_app_id, ig_asbd_id = undefined;
const TOOLBAR_SELECTOR = is_discord ? ".toolbar-3_r2xA" : ".AjEzM.Ljd8Q>._2NzhO.EQ1Mr";
const BUTTON_CLASSES = is_discord ? "icon-1ELUnB iconWrapper-2awDjA clickable-ZD7xvu" : "wpO6b";
const SVG_CLASSES = is_discord ? "icon-2xnN2Y" : "_8-yf5";

// Background script will send token
browser.runtime.onMessage.addListener(function (msg, sendResponse) {
    if (is_discord) {
        token = msg;
    } else {
        ig_claim = msg.ig_claim;
        ig_app_id = msg.ig_app_id;
        ig_asbd_id = msg.ig_asbd_id;
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const IDLE_SVG = '<svg class="' + SVG_CLASSES + '" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="none"><g><rect fill="none" height="24" width="24"/></g><g><path fill="currentColor" d="M18,15v3H6v-3H4v3c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-3H18z M17,11l-1.41-1.41L13,12.17V4h-2v8.17L8.41,9.59L7,11l5,5 L17,11z"/></g></svg>';
const LOADING_SVG = '<svg class="' + SVG_CLASSES + '" width="24px" height="24px" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg"> <defs> <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a"> <stop stop-color="currentColor" stop-opacity="0" offset="0%"/> <stop stop-color="currentColor" stop-opacity=".631" offset="63.146%"/> <stop stop-color="currentColor" offset="100%"/> </linearGradient> </defs> <g fill="none" fill-rule="evenodd"> <g transform="translate(1 1)"> <path d="M36 18c0-9.94-8.06-18-18-18" id="Oval-2" stroke="url(#a)" stroke-width="2"> <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.9s" repeatCount="indefinite" /> </path> <circle fill="currentColor" cx="36" cy="18" r="1"> <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.9s" repeatCount="indefinite" /> </circle> </g> </g></svg>';

async function addButton() {
    // Prevent dupes
    if (button != undefined) {
        button.remove();
    }

    // Find toolbar
    adding_button = true;
    let toolbar = document.querySelector(TOOLBAR_SELECTOR);
    while (toolbar == undefined) {
        await sleep(100);
        toolbar = document.querySelector(TOOLBAR_SELECTOR);
    }
    adding_button = false;

    // Create button
    button = document.createElement("div");
    button.setAttribute("id", "export-button");
    button.setAttribute("class", BUTTON_CLASSES);
    button.setAttribute("role", "button");
    button.setAttribute("type", "button");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-label", "Export Chat");
    button.setAttribute("title", "Export Chat");
    button.innerHTML = IDLE_SVG;

    // Push button
    toolbar.insertBefore(button, toolbar.firstChild);
    if (is_discord) {
        button.addEventListener("click", exportDiscordChat)
    } else {
        button.addEventListener("click", exportInstagramChat)
    }
}

addButton();
window.addEventListener("click", function() {
    if (window.location.href != url && !adding_button) {
        url = window.location.href;
        addButton();
    }
});

async function exportDiscordChat() {
    button.innerHTML = LOADING_SVG;

    let url = window.location.href;
    let channel = undefined;
    if (url.startsWith("https://discord.com/channels/@me/")) {
        channel = url.slice(33);
    } else if (url.startsWith("https://discord.com/channels/")) {
        channel = url.slice(30 + url.slice(29).search("/"));
    } else {
        alert("Failed to export messages: unrecognized channel. Please report issue at mubelotix@gmail.com.");
        return;
    }

    console.log("exporting channel ", channel);

    let response = await fetch("https://discord.com/api/v9/channels/" + channel + "/messages?limit=100", {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Authorization': token
        },
    });
    let messages = await response.json();

    while (true) {
        let response = await fetch("https://discord.com/api/v9/channels/" + channel + "/messages?limit=100&before=" + messages[messages.length - 1].id, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Authorization': token
            },
        });
        try {
            let new_messages = await response.json();
            if (new_messages.length == 0) {
                break;
            }
            messages = messages.concat(new_messages);
        } catch (e) {
            alert("Failed to export all messages. Error: " + e);
        }
        await sleep(700);
    }

    browser.runtime.sendMessage({
        messages: messages,
        filename: "Discord messages - channel " + channel + ".json"
    });
    button.innerHTML = IDLE_SVG;
    button.firstChild.style.color = "rgb(59, 165, 93)";
}

async function exportInstagramChat() {
    button.innerHTML = LOADING_SVG;

    let url = window.location.href;
    let channel = undefined;
    if (url.startsWith("https://www.instagram.com/direct/t/")) {
        channel = url.slice(35);
    } else {
        console.log(url);
        alert("Failed to export messages: unrecognized channel. Please report issue at mubelotix@gmail.com.");
        return;
    }

    console.log("exporting channel ", channel);

    let init_response = await (await fetch("https://i.instagram.com/api/v1/direct_v2/threads/" + channel + "/", {
        "referrer": "https://www.instagram.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "mode": "cors",
        "credentials": "include",
        "headers": {
            "x-asbd-id": ig_asbd_id,
            "x-ig-app-id": ig_app_id,
            "x-ig-www-claim": ig_claim,
        }
    })).json();

    let prev_cursor = init_response.thread.prev_cursor;
    let messages = init_response.thread.items;

    while (prev_cursor != "MINCURSOR") {
        let response = await (await fetch("https://i.instagram.com/api/v1/direct_v2/threads/" + channel + "/?cursor=" + prev_cursor, {
            "referrer": "https://www.instagram.com/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "mode": "cors",
            "credentials": "include",
            "headers": {
                "x-asbd-id": ig_asbd_id,
                "x-ig-app-id": ig_app_id,
                "x-ig-www-claim": ig_claim,
            }
        })).json();

        prev_cursor = response.thread.prev_cursor;
        messages = messages.concat(response.thread.items);
        await sleep(700);
    }

    browser.runtime.sendMessage({
        messages: messages,
        filename: "Instagram messages - channel " + init_response.thread.thread_title + ".json"
    });

    button.innerHTML = IDLE_SVG;
    button.firstChild.style.color = "rgb(59, 165, 93)";
}
