
const pageUrl = window.location.href.replace(/^(https?:\/\/)?/, '').replace(/\/index\.html$/, '').replace(/\/$/, ''); // same page regardless of protocol and remove "/index.html" from the end and remove trailing slashes
var anchorPoints;
var anchorDB = {};
var updateIntervals = {}; // Define a global variable to store interval IDs for each anchor
var observerConfig = { threshold: 0.6 }; // Trigger callback when at least 60% of the anchor point is visible
var heatmapInstance;
var isPageVisible = true
const pageStartTime = Date.now;
var observer = new IntersectionObserver(checkVisibilities, observerConfig);

// fetch page properties from server (IsDataCollectionActive, IsHeatmapShown)
fetch(`https://localhost:5011/api/TrackedPage?queryPageUrl=${encodeURIComponent(pageUrl)}`)
.then(response => response.json())
.then(data => {
    if (data.status == 404) { //Page not yet in DB
        console.log('no data on server for this page, heatmap turned off initially', data);
        startDataCollection();
    } else { //Page already in DB
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
    anchorPoints = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p'); // Initialize variables to track time each anchor point is visible

    anchorPoints.forEach(function (anchorPoint, i) {
        var anchorID = 'anchor-' + i.toString().padStart(3, '0');
        anchorPoint.classList.add(anchorID);
        anchorDB[anchorID] = { visible: false, startTime: 0, totalTime: 0 };
    });
});


// Callback function for Intersection Observer
function checkVisibilities(entries) {
    entries.forEach((entry) => {
        const anchorID = Array.from(entry.target.classList).find(x => x.startsWith("anchor-"));
        if (entry.isIntersecting) { // When anchor point becomes visible
            anchorDB[anchorID].visible = true; //then register it as visible
            anchorDB[anchorID].startTime = performance.now();
            setPeriodicUpdate(anchorID); // Start periodic update timer for this anchor
        } else {// When anchor point becomes invisible
            anchorDB[anchorID].visible = false; //then register it as invisible
            updateTotalTime(anchorID); // Update totalTime that was spent visible
            clearInterval(updateIntervals[anchorID]); // Clear the interval
        }
    });
}


document.addEventListener("visibilitychange", function () {
    isPageVisible = document.visibilityState === "visible";
    if (!isPageVisible) {
        // Pause all timers
        Object.keys(updateIntervals).forEach(id => clearInterval(updateIntervals[id]));
    } else {
        // Resume timers for visible anchors
        Object.keys(anchorDB).forEach(anchorID => {
            if (anchorDB[anchorID].visible) {
                startPeriodicUpdate(anchorID);
                anchorDB[anchorID].startTime = performance.now(); // Reset start time
            }
        });
    }
});


// Function to start periodic updates for a visible anchor
function setPeriodicUpdate(anchorID) {
    updateIntervals[anchorID] = setInterval(function () {
        updateTotalTime(anchorID);
    }, 5000); // Update statistics every 5000 milliseconds
}

// Function to update totalTime for an anchor
function updateTotalTime(anchorID) {
    //if (anchorDB[anchorID].visible) {
    var elapsedTime = performance.now() - anchorDB[anchorID].startTime;
    anchorDB[anchorID].totalTime += Math.floor(elapsedTime/1000);
    anchorDB[anchorID].startTime = performance.now(); // Reset startTime
    //}
}

function startDataCollection() {
    //save the time when user enters the page

    // Initialize Intersection Observer
    for (const anchorPoint of anchorPoints) {
        observer.observe(anchorPoint);
    }

    // Send data to server every 6 seconds
    const sendToServerInterval = setInterval(() => sendToServer, 6000); //end of sendToServerInterval

}
function sendToServer() { 
    console.log("sending to server");

    const anchors = Object.keys(anchorDB)
        .filter(key => anchorDB[key].totalTime > 0) // Don't send anchor points with totalTime = 0, save bandwidth
        .map(key => ({
            anchorName: key,
            totalTime: anchorDB[key].totalTime
        }));
    var viewTime = performance.now();

    // Reset TotalTime to 0 for every entry in anchorDB
    Object.values(anchorDB).forEach(entry => entry.totalTime = 0);
    viewTime = 0; //reset viewTime to 0 after sending to server

    const trackedPageData = [{ // Formatted object we will send to the server
        pageUrl: pageUrl,
        viewTime: viewTime,
        anchors: anchors
    }];

    fetch('https://localhost:5011/api/TrackedPage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
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
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
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
    // Check cache
    const currentTime = Date.now();
    if (heatmapDataCache.pageUrl === pageUrl && 
        heatmapDataCache.data && 
        (currentTime - heatmapDataCache.lastFetch < heatmapDataCache.fetchInterval)) {
        // Use cached data
        renderHeatmap(heatmapDataCache.data);
        return;
    }

    fetch(`https://localhost:5011/api/TrackedPage?queryPageUrl=${encodeURIComponent(pageUrl)}`)
        .then(response => response.json())
        .then(data => {
            // Cache the fetched data
            heatmapDataCache = { pageUrl, data, lastFetch: Date.now(), fetchInterval: heatmapDataCache.fetchInterval };

            console.log('Fetched heatmap data:', data);

            renderHeatmap(data);
        })
        .catch(error => {
            console.error('Error fetching heatmap data:', error);
            // Implement additional error handling as needed
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
                    // Find the corresponding anchor element in the page
                    const anchorElement = document.querySelector('.' + anchorData.anchorName);
                    if (anchorElement) {
                        // Get the anchor element's position relative to the document
                        const anchorPosition = anchorElement.getBoundingClientRect().top + window.scrollY;

                        // Map the anchor's position to the viewport height (heatmap container height)
                        let yPos = (anchorPosition / documentHeight) * viewportHeight;

                        heatmapData.push({
                            x: 10, // Assuming a fixed x position since the heatmap is vertical
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

// Debounce the updateHeatmap function to limit its execution frequency
var fetchAndDrawHeatmapDebounced = debounce(fetchAndDrawHeatmap, 100); // Execute at most every 250ms

function startHeatmap () {
    // Initialize heatmap.js
    console.log("starting heatmap");
    heatmapInstance = h337.create({
        container: document.getElementById('heatmap-container'),
        radius: 30
    }); 

    fetchAndDrawHeatmap(); //execute once on page load

    window.addEventListener('resize', () => { // Update heatmap on window resize
        fetchAndDrawHeatmapDebounced();
    });


    setTimeout(function() {
        document.getElementById('heatmap-container').style.opacity = '1';
    }, 1000);
}