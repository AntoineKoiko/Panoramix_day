chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getToken") {
        fetch("https://panoramix.epitest.eu/api/users/token", {
            "headers": {
                // "accept": "*/*",
                "Content-Type": "application/json",
            },
            "referrer": "https://panoramix.epitest.eu/calendar",
            "method": "GET",
        })
            .then(response => response.json())
            .then(data => sendResponse(data))
            .catch(error => sendResponse({ error: error.toString() }));

        // IMPORTANT: return true to indicate async response
        return true;
    }
});
