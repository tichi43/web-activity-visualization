//Load external libraries
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/heatmap.js/build/heatmap.min.js';
script.async = true;
document.head.appendChild(script);

//Get pageUrl and normalize it
const pageUrl = window.location.href
    .replace(/^(https?:\/\/)?/, '')                // Remove protocol
    .replace(/\?.*$/, '')                          // Remove query string and question mark
    //.replace(/\/index\.(html?|php|aspx?|jsp|cfm)$/i, '')    // Remove /index.html, /index.htm, /index.php, /index.aspx
    .replace(/\/$/, '');                           // Remove trailing slash

//Global variables 
let anchorDB = [];
let heatmapInstance;
let isPageVisible = true;
let updateCounter = 0;
let globalTimer = null;
let isInit = true;  //this is 
const observerConfig = { threshold: 0.6 };  //a paragraph is considered "visible" if at least 60% of it is visible
const adminView = decodeURIComponent(new URLSearchParams(window.location.search).get('adminView') || '').toLowerCase() === 'true'; //if adminView is set, data collection is disabled and only heatmap is shown

// Define Intersection Observer to track visibility
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.target.dataset.visible = entry.isIntersecting);
}, observerConfig);
function startDataCollection() {
    if (globalTimer) clearInterval(globalTimer);
    globalTimer = setInterval(() => {
        updateCounter++;
        anchorDB.forEach(anchorPoint => {
            if (anchorPoint.dataset.visible == "true") {
                anchorPoint.dataset.totalTime = (parseInt(anchorPoint.dataset.totalTime) + 1).toString();
            }
        });
        if (updateCounter % 5 === 0) {
            sendToServer();
        }
    }, 1000);
}
function stopDataCollection() {
    clearInterval(globalTimer);
    globalTimer = null;
}
function initializeDataCollection() {
    anchorDB.forEach(anchorPoint => observer.observe(anchorPoint));
    document.addEventListener("visibilitychange", function () {
        isPageVisible = document.visibilityState === "visible";
        if (!isPageVisible && globalTimer) {
            clearInterval(globalTimer);
            globalTimer = null;
        } else if (isPageVisible && !globalTimer) {
            startDataCollection();
        }
    });
    startDataCollection();
}

//MAIN()
window.addEventListener('load', function () {
    //Select and tag anchor points
    //anchorDB = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p'));
    anchorDB = Array.from(document.querySelectorAll('code, p'));
    anchorDB.forEach(function (anchorPoint, i) {
        anchorPoint.dataset.anchorID = ('anchor-' + i.toString().padStart(3, '0'));
        anchorPoint.dataset.visible = "false";
        anchorPoint.dataset.totalTime = "0";
    });


    // fetch page properties from server (IsDataCollectionActive, IsHeatmapShown)
    fetch(`https://localhost:5011/api/TrackedPage?queryPageUrl=${encodeURIComponent(pageUrl)}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 404) {
                console.log('no data on server for this page, heatmap turned off initially', data);
                initializeDataCollection();
            } else {
                if (data[0].isDataCollectionActive && !adminView) {
                    initializeDataCollection();
                }

                if (data[0].isHeatmapShown || adminView) {
                    startHeatmap();
                }

                console.log("fetched initial data from server:", data);
            }
        })
        .catch(error => {
            console.error('Error fetching initial data:', error);
        });

    //Create heatmap container and style it
    const heatmapDiv = document.createElement('div');
    heatmapDiv.id = 'heatmap-container';
    document.body.appendChild(heatmapDiv);
    const style = document.createElement('style');
    style.textContent = `
    #heatmap-container {
        opacity: 0;
        position: fixed !important;
        top: 0;
        right: 0;
        width: 10px;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        transition: opacity 1000ms;
    }`;
    document.head.appendChild(style);

    window.parent.postMessage(document.body.scrollHeight, '*');
}); //End of MAIN()


function sendToServer() {
    let dataToSend;
    console.log("sending to server");
    let anchorsDataObj = anchorDB
        .map(a => ({
            anchorName: a.dataset.anchorID,
            totalTime: parseInt(a.dataset.totalTime)
        }));
    anchorDB.forEach(anchorPoint => anchorPoint.dataset.totalTime = "0");

    if (isInit) {
        isInit = false;
        dataToSend = [{
            pageUrl: pageUrl,
            newVisit: true,
            anchorsData: anchorsDataObj
        }];
    }
    else
    {
        anchorsDataObj = anchorsDataObj.filter(a => a.totalTime > 0);
        dataToSend = [{
            pageUrl: pageUrl,
            anchorsData: anchorsDataObj
        }];
    }

    console.log(dataToSend);
    fetch('https://localhost:5011/api/TrackedPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
    })
        .then(response => response.text())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });

    updateCounter = 0;
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


function fetchAndRenderHeatmap() {
    if (
        heatmapDataCache.pageUrl !== pageUrl ||
        !heatmapDataCache.data ||
        (Date.now() - heatmapDataCache.lastFetch > heatmapDataCache.fetchInterval)
    ) {
        fetch(`https://localhost:5011/api/TrackedPage?queryPageUrl=${encodeURIComponent(pageUrl)}`)
            .then(response => response.json())
            .then(data => {
                heatmapDataCache = { pageUrl, data, lastFetch: Date.now(), fetchInterval: heatmapDataCache.fetchInterval };
                renderHeatmap(data);
                console.log('Fetched heatmap data:', data);
            })
            .catch(error => {
                console.error('Error fetching heatmap data:', error);
            });
    } else {
        renderHeatmap(heatmapDataCache.data);
    }
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
                    const anchorElement = document.querySelector('[data-anchor-i-d="'+anchorData.anchorName+'"]');
                    if (anchorElement) {
                        const anchorPosition = anchorElement.getBoundingClientRect().top + anchorElement.getBoundingClientRect().height/2 + window.scrollY;
                        let yPos = (anchorPosition / documentHeight) * viewportHeight;
                        heatmapData.push({
                            x: 5,
                            y: yPos,
                            value: anchorData.totalTime,
                            radius: 30 //anchorElement.getBoundingClientRect().height/2
                        });
                    }
                });
                heatmapInstance.setData({
                    max: maxTime,
                    data: heatmapData
                });
            });
        }
        setTimeout(function () {    //fade in heatmap with a 1 second delay
            document.getElementById('heatmap-container').style.opacity = '1';
        }, 1000);
    }
}

var fetchAndDrawHeatmapDebounced = debounce(fetchAndRenderHeatmap, 100);

function startHeatmap() {
    var blurratio = 1-window.innerHeight / document.documentElement.scrollHeight;

    console.log("starting heatmap");
    heatmapInstance = h337.create({
        container: document.getElementById('heatmap-container'),
        blur: 0.85 //Math.max(0.1, blurratio)
    });

    fetchAndRenderHeatmap();

    window.addEventListener('resize', () => {
        fetchAndDrawHeatmapDebounced();
    });
}