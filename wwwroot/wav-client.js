//mongo passwd: AWH0UIANt1NAnfAV
// Initialize heatmap.js
console.log("fasz");
var heatmapInstance = h337.create({
    container: document.getElementById('heatmap-container'),
    radius: 30
});

// Initialize variables to track time each anchor point is visible
var anchorPoints = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
var anchorDB = {};
// Define a global variable to store interval IDs for each anchor
var updateIntervals = {};

// Assign unique classes to each anchor point and initialize anchorDB
anchorPoints.forEach(function (anchorPoint, i) {
    var anchorID = 'anchor-' + i;
    anchorPoint.classList.add(anchorID);
    anchorDB[anchorID] = { visible: false, startTime: 0, totalTime: 0 };
});

// Intersection Observer configuration
var observerConfig = {
    threshold: 0.6 // Trigger callback when at least 60% of the anchor point is visible
};


// Callback function for Intersection Observer
function intersectionCallback(entries) {
    for (const entry of entries) {
        const anchorID = Array.from(entry.target.classList).find(x => x.startsWith("anchor-"));

        if (entry.isIntersecting) { // When anchor point becomes visible
            if (!anchorDB[anchorID].visible) { //if it was invisible before visibility state change
                anchorDB[anchorID].visible = true; //then register it as visible
                anchorDB[anchorID].startTime = performance.now();
                startPeriodicUpdate(anchorID); // Start periodic update timer for this anchor
            }
        } else { // When anchor point becomes invisible
            if (anchorDB[anchorID].visible) { //if it was visible before visibility state change
                anchorDB[anchorID].visible = false; //then register it as invisible
                updateTotalTime(anchorID); // Update totalTime that was spent visible
                clearInterval(updateIntervals[anchorID]); // Clear the interval
            }
        }
    }
    updateHeatmap();
}

// Function to start periodic updates for a visible anchor
function startPeriodicUpdate(anchorID) {
    updateIntervals[anchorID] = setInterval(function () {
        updateTotalTime(anchorID);
        //updateHeatmap(); // Optionally update the heatmap with each periodic update
        //sendToServer(anchorID);
    }, 5000); // Update every 5000 milliseconds (5 seconds)
}

// Function to update totalTime for an anchor
function updateTotalTime(anchorID) {
    //if (anchorDB[anchorID].visible) {
    var elapsedTime = performance.now() - anchorDB[anchorID].startTime;
    anchorDB[anchorID].totalTime += Math.floor(elapsedTime/1000);
    anchorDB[anchorID].startTime = performance.now(); // Reset startTime
    //}
}

// Initialize Intersection Observer
var observer = new IntersectionObserver(intersectionCallback, observerConfig);
for (const anchorPoint of anchorPoints) {
    observer.observe(anchorPoint);
}

const senderToServerInterval = setInterval(() => {
    console.log("sending to server");

    const pageUrl = window.location.href;
    const anchors = Object.keys(anchorDB).map(key => ({
        anchorName: key,
        totalTime: anchorDB[key].totalTime
    }));

    // Reset TotalTime to 0 for every entry in anchorDB
    Object.values(anchorDB).forEach(entry => entry.totalTime = 0);

    const trackedPageData = [{ // Formatted data we will send to the server
        pageUrl: pageUrl,
        anchors: anchors
    }];

    fetch('http://localhost:5011/api/TrackedPage', {
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



}, 5000); //end of senderToServerInterval



// Function to update the heatmap with the anchor point data
function updateHeatmap() {

    let maxTime = Math.max(...Object.values(anchorDB).map(anchor => anchor.totalTime)); // Find max totalTime in anchorDB

    if (maxTime > 0) {
        let heatmapData = [];
        const containerHeight = document.getElementById('heatmap-container').clientHeight;
        const anchorCount = Object.keys(anchorDB).length;
        const spacing = containerHeight / anchorCount; // Calculate spacing to distribute anchors vertically

        Object.values(anchorDB).forEach((anchor, i) => {
            // Calculate the y position based on i
            let yPos = i * spacing + (spacing / 2); // Center the point in its "slot". Smart!
            heatmapData.push({
                x: 10, // Assuming a fixed x position since the heatmap is vertical
                y: yPos,
                value: anchor.totalTime
            });
        });

        // Update the heatmap with new data
        heatmapInstance.setData({
            max: maxTime,
            data: heatmapData
        });
    }
}