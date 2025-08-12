const pageUrl = window.location.href
    .replace(/^(https?:\/\/)?/, '')
    .replace(/\/index\.html$/, '')
    .replace(/\/$/, '');

let anchorPoints = [];
let heatmapInstance;
let isPageVisible = true;
let updateCounter = 0;
let globalTimer = null;
const pageStartTime = Date.now();
const observerConfig = { threshold: 0.6 };

// Intersection Observer to track visibility
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        const anchorPoint = entry.target;
        const anchorID = Array.from(entry.target.classList).find(x => x.startsWith("anchor-"));
        anchorPoint.dataset.visible = entry.isIntersecting ? "true" : "false";
    });
}, observerConfig);

// fetch page properties from server (IsDataCollectionActive, IsHeatmapShown)
fetch(`https://localhost:5011/api/TrackedPage?queryPageUrl=${encodeURIComponent(pageUrl)}`)
    .then(response => response.json())
    .then(data => {
        if (data.status == 404) {
            console.log('no data on server for this page, heatmap turned off initially', data);
            startDataCollection();
        } else {
            if (data[0].isDataCollectionActive) startDataCollection();
            if (data[0].isHeatmapShown) startHeatmap();
            console.log(data);
        }
    })
    .catch(error => {
        console.error('Error fetching initial data:', error);
    });

// INIT
window.addEventListener('load', function () {
    anchorPoints = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p'));
    anchorPoints.forEach(function (anchorPoint, i) {
        const anchorID = 'anchor-' + i.toString().padStart(3, '0');
        anchorPoint.classList.add(anchorID);
        anchorPoint.dataset.visible = "false";
        anchorPoint.dataset.totalTime = "0";
    });
});

function startDataCollection() {
    anchorPoints.forEach(anchorPoint => observer.observe(anchorPoint));
    if (globalTimer) clearInterval(globalTimer);
    globalTimer = setInterval(() => {
        updateCounter++;
        updateTotalTimes();
        if (updateCounter % 5 === 0) {
            sendToServer();
        }
    }, 1000);
}

function updateTotalTimes() {
    anchorPoints.forEach(anchorPoint => {
        if (anchorPoint.dataset.visible === "true") {
            anchorPoint.dataset.totalTime = (
                parseInt(anchorPoint.dataset.totalTime) + 1
            ).toString();
        }
    });
}

// Handle page visibility changes
document.addEventListener("visibilitychange", function () {
    isPageVisible = document.visibilityState === "visible";
    if (!isPageVisible && globalTimer) {
        clearInterval(globalTimer);
        globalTimer = null;
    } else if (isPageVisible && !globalTimer) {
        startDataCollection();
    }
});

function sendToServer() {
    console.log("sending to server");
    const anchors = anchorPoints
        .map(anchorPoint => {
            const anchorID = Array.from(anchorPoint.classList).find(x => x.startsWith("anchor-"));
            const totalTime = parseInt(anchorPoint.dataset.totalTime);
            return { anchorName: anchorID, totalTime: totalTime };
        })
        .filter(anchor => anchor.totalTime > 0);

    anchorPoints.forEach(anchorPoint => anchorPoint.dataset.totalTime = "0");

    const trackedPageData = [{
        pageUrl: pageUrl,
        viewTime: 0,
        anchors: anchors
    }];

    fetch('https://localhost:5011/api/TrackedPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackedPageData),
    })
        .then(response => response.text())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

/*HEATMAP RENDERING*/

// Debounce function to limit execution frequency
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// cache for fetched data
let heatmapDataCache = {
    pageUrl: '',
    data: null,
    lastFetch: 0,
    fetchInterval: 30000 // 30 seconds
};

// Optimized updateHeatmap function with error handling and requestAnimationFrame
function fetchAndDrawHeatmap() {
    const currentTime = Date.now();
    if (heatmapDataCache.pageUrl === pageUrl &&
        heatmapDataCache.data &&
        (currentTime - heatmapDataCache.lastFetch < heatmapDataCache.fetchInterval)) {
        renderHeatmap(heatmapDataCache.data);
        return;
    }

    fetch(`https://localhost:5011/api/TrackedPage?queryPageUrl=${encodeURIComponent(pageUrl)}`)
        .then(response => response.json())
        .then(data => {
            heatmapDataCache = { pageUrl, data, lastFetch: Date.now(), fetchInterval: heatmapDataCache.fetchInterval };
            console.log('Fetched heatmap data:', data);
            renderHeatmap(data);
        })
        .catch(error => {
            console.error('Error fetching heatmap data:', error);
        });
}

// Render heatmap data
function renderHeatmap(data) {
    if (data.length > 0) {
        const trackedPage = data[0];
        const anchorsData = trackedPage.anchors;
        let maxTime = Math.max(...anchorsData.map(anchor => anchor.totalTime));
        if (maxTime > 0) {
            requestAnimationFrame(() => {
                let heatmapData = [];
                const documentHeight = document.documentElement.scrollHeight;
                const viewportHeight = window.innerHeight;
                anchorsData.forEach(anchorData => {
                    const anchorElement = document.querySelector('.' + anchorData.anchorName);
                    if (anchorElement) {
                        const anchorPosition = anchorElement.getBoundingClientRect().top + window.scrollY;
                        let yPos = (anchorPosition / documentHeight) * viewportHeight;
                        heatmapData.push({
                            x: 10,
                            y: yPos,
                            value: anchorData.totalTime
                        });
                    }
                });
                heatmapInstance.setData({
                    max: maxTime,
                    data: heatmapData
                });
            });
        }
    }
}

var fetchAndDrawHeatmapDebounced = debounce(fetchAndDrawHeatmap, 100);

function startHeatmap() {
    console.log("starting heatmap");
    heatmapInstance = h337.create({
        container: document.getElementById('heatmap-container'),
        radius: 30
    });

    fetchAndDrawHeatmap();

    window.addEventListener('resize', () => {
        fetchAndDrawHeatmapDebounced();
    });

    setTimeout(function () {
        document.getElementById('heatmap-container').style.opacity = '1';
    }, 1000);
}