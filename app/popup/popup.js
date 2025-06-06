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

const eventGrid = document.getElementById("event-grid");
const loadingIndicator = document.getElementById("loading-indicator");

const formatDate = (dataStr) => {
    const date = new Date(dataStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const getTimeDistanceLabel = (targetDate, now) => {
    const diffMs = targetDate - now;
    const isFuture = diffMs > 0;
    const absMs = Math.abs(diffMs);

    const totalMinutes = Math.round(absMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const label = hours > 0
        ? `${hours}h${minutes > 0 ? ` et ${minutes} minute${minutes > 1 ? "s" : ""}` : ""}`
        : `${minutes} minute${minutes !== 1 ? "s" : ""}`;

    return isFuture ? `Dans ${label}` : `Il y a ${label}`;
};

const buildEventDetailUrl = (event) => {
    const eventId = event._id;
    const eventStart = new Date(event.start);

    // Début semaine : dimanche 22h UTC avant la date de l'event
    const weekStart = new Date(eventStart);
    weekStart.setUTCDate(eventStart.getUTCDate() - eventStart.getUTCDay()); // dimanche
    weekStart.setUTCHours(22, 0, 0, 0); // 22:00:00.000Z

    // Fin semaine : dimanche suivant 21:59:59.999 UTC
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    weekEnd.setUTCHours(21, 59, 59, 999);

    const startISO = encodeURIComponent(weekStart.toISOString());
    const endISO = encodeURIComponent(weekEnd.toISOString());

    return `https://panoramix.epitest.eu/calendar/events/${eventId}/details?view=timeGridWeek&start=${startISO}&end=${endISO}&visible=true`;
};

const displayEvents = (events) => {
    eventGrid.innerHTML = "";
    if (events.length === 0) {
        const noEventsItem = document.createElement("p");
        noEventsItem.textContent = "No events for today.";
        noEventsItem.style.textAlign = "center";
        eventGrid.appendChild(noEventsItem);
        // Bouton même si pas d'événement
        const moreBtnContainer = document.createElement("div");
        moreBtnContainer.className = "more-button";

        const moreBtn = document.createElement("a");
        moreBtn.href = "https://panoramix.epitest.eu/calendar";
        moreBtn.target = "_blank";
        moreBtn.rel = "noopener noreferrer";
        moreBtn.textContent = "Voir plus sur Panoramix";

        moreBtnContainer.appendChild(moreBtn);
        eventGrid.appendChild(moreBtnContainer);
    } else {
        const formatEvents = events.map(getEventData);
        const eventsOfTheDay = filterEventOftheDay(formatEvents);
        const sortedEvents = sortEventsByStart(eventsOfTheDay);

        sortedEvents.forEach(event => {
            const now = new Date();
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);

            const isOngoing = now >= startDate && now <= endDate;
            const start = formatDate(event.start);
            const end = formatDate(event.end);

            // Création de la card
            const card = document.createElement("div");
            card.className = `event-card ${event.isRegistered ? "inscrit" : "pas-inscrit"}`;
            if (isOngoing) {
                card.classList.add("en-cours");
            }

            // Titre
            const title = document.createElement("div");
            title.className = "title";
            title.textContent = event.title;
            card.appendChild(title);

            // Délai avant ou après début
            const timeInfo = document.createElement("div");
            timeInfo.className = "time-until";
            if (isOngoing) {
                timeInfo.textContent = "En cours";
            } else {
                timeInfo.textContent = getTimeDistanceLabel(startDate, now);
            }
            card.appendChild(timeInfo);

            // 🕒 Horaires
            const timeRow = document.createElement("div");
            timeRow.className = "info-row";
            timeRow.textContent = `🕒 ${start} - ${end}`;
            card.appendChild(timeRow);

            // 🏠 Salle
            const roomRow = document.createElement("div");
            roomRow.className = "info-row";
            roomRow.textContent = `🏠 ${event.roomName || "No room"}`;
            card.appendChild(roomRow);

            // Bouton de statut cliquable
            const statusLink = document.createElement("a");
            statusLink.className = "status";
            statusLink.href = buildEventDetailUrl(event);
            statusLink.target = "_blank";
            statusLink.rel = "noopener noreferrer";
            statusLink.textContent = event.isRegistered ? "Inscrit·e" : "Pas inscrit·e";
            card.appendChild(statusLink);

            eventGrid.appendChild(card);
            eventGrid.style.display = "block"
        });

        // Bouton "Voir plus sur Panoramix"
        const moreBtnContainer = document.createElement("div");
        moreBtnContainer.className = "more-button";

        const moreBtn = document.createElement("a");
        moreBtn.href = "https://panoramix.epitest.eu/calendar";
        moreBtn.target = "_blank";
        moreBtn.rel = "noopener noreferrer";
        moreBtn.textContent = "Voir plus sur Panoramix";

        moreBtnContainer.appendChild(moreBtn);
        eventGrid.appendChild(moreBtnContainer);

    }
};

const main = async () => {
    try {
        loadingIndicator.style.display = "block";
        eventGrid.style.display = "none";
        await getEvents();
    } catch (error) {
        console.error("Error fetching data");
    }
}

document.addEventListener("DOMContentLoaded", main);