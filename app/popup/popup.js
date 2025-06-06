const getEvents = async () => {
    try {
        chrome.runtime.sendMessage({ type: "getToken" }, async (response) => {
            const authToken = response.jwt;
            const events = await fethcEvents(authToken);
            loadingIndicator.style.display = "none";

            if (!events || events.length === 0) {
                displayEvents([]);
                return;
            }
            displayEvents(events);
        });
    } catch (error) {
        throw new Error("Failed to fetch data");
    }
}

const getStartFetchSting = () => {
    const now = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yyyy = yesterdayDate.getFullYear();
    const mm = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterdayDate.getDate()).padStart(2, '0');
    const yesterday = `${yyyy}-${mm}-${dd}`;
    const start = `${yesterday}T22:00:00.000Z`;
    return start;
}

const getEndFetchString = () => {
    const now = new Date();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(now.getDate() + 1);
    const yyyyTomorrow = tomorrowDate.getFullYear();
    const mmTomorrow = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
    const ddTomorrow = String(tomorrowDate.getDate()).padStart(2, '0');
    const tomorrow = `${yyyyTomorrow}-${mmTomorrow}-${ddTomorrow}`;
    const end = `${tomorrow}T22:00:00.000Z`;
    return end;
}

const fethcEvents = async (token) => {
    const start = getStartFetchSting();
    const end = getEndFetchString();

    const res = await fetch(`https://panoramix.epitest.eu/api/events?end=${end}&registrationStatus=true&start=${start}`, {
        "headers": {
            "accept": "*/*",
            "authorization": `Bearer ${token}`,
        },
        "method": "GET",
    });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}, statusText: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
}

const getEventData = (event) => {
    return {
        _id: event._id,
        title: event.title,
        start: event.start,
        end: event.end,
        roomName: event.roomsRef && event.roomsRef.length > 0 ? event.roomsRef[0].name : null,
        isRegistered: event.isRegistered
    };
}

const filterEventOftheDay = (events) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return events.filter(event => {
        const eventStart = new Date(event.start);
        console.log("eventStart", eventStart);
        console.log("startOfDay", startOfDay);
        console.log("endOfDay", endOfDay);
        return eventStart >= startOfDay && eventStart < endOfDay;
    });
}

const sortEventsByStart = (events) => {
    return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

// HTML Element

const eventTable = document.getElementById("event-table");
const loadingIndicator = document.getElementById("loading-indicator");

const formatDate = (dataStr) => {
    const date = new Date(dataStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const displayEvents = (events) => {
    if (events.length === 0) {
        const noEventsItem = document.createElement("li");
        noEventsItem.textContent = "No events for today.";
        eventTable.appendChild(noEventsItem);
    } else {
        eventTable.style.display = "block";
        const formatEvents = events.map(getEventData);
        const eventsOfTheDay = filterEventOftheDay(formatEvents);
        const sortedEvents = sortEventsByStart(eventsOfTheDay);

        sortedEvents.forEach(event => {
            const timestampStrat = formatDate(event.start);
            const timestampEnd = formatDate(event.end);

            const eventLine = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = event.title;
            nameCell.headers = "th-name";

            const startCell = document.createElement("td");
            startCell.textContent = timestampStrat;
            startCell.headers = "th-start";

            const endCell = document.createElement("td");
            endCell.textContent = timestampEnd;
            endCell.headers = "th-end";

            const roomCell = document.createElement("td");
            roomCell.textContent = event.roomName ? event.roomName : "No room";
            roomCell.headers = "th-room";

            const registeredCell = document.createElement("td");
            registeredCell.textContent = event.isRegistered ? '✅' : '❌';
            registeredCell.headers = "th-registered";

            eventLine.appendChild(nameCell);
            eventLine.appendChild(startCell);
            eventLine.appendChild(endCell);
            eventLine.appendChild(roomCell);
            eventLine.appendChild(registeredCell);
            eventTable.appendChild(eventLine);
        });
    }
}

const main = async () => {
    try {
        loadingIndicator.style.display = "block";
        eventTable.style.display = "none";
        await getEvents();
    } catch (error) {
        console.error("Error fetching data");
    }
}

document.addEventListener("DOMContentLoaded", main);