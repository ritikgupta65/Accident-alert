var map = L.map('map').setView([28.6139, 77.2090], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
var redIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    iconSize: [15, 15],
    iconAnchor: [5, 5]
});

var greenIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    iconSize: [15, 15],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

var permanentLayerGroup = L.layerGroup().addTo(map);
var temporaryLayerGroup = L.layerGroup().addTo(map);

function getRandomItems(arr, num) {
    var result = [];
    while (result.length < num) {
        var randIndex = Math.floor(Math.random() * arr.length);
        if (!result.includes(arr[randIndex])) {
            result.push(arr[randIndex]);
        }
    }
    return result;
}
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon1 - lon2) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // in meters
    return distance;
}
function isWithinRadius(lat1, lon1, lat2, lon2, radius) {
    return calculateDistance(lat1, lon1, lat2, lon2) <= radius;
}
function detectAccidentProneAreas(data) {
    const accidentThreshold = 5; 
    const radius = 500;

    const accidentsByMonth = {};
    data.forEach(function (row) {
        var lat = parseFloat(row.latitude);
        var lon = parseFloat(row.longitude);
        var date = row.Date;
        var dateParts = date.split('-');
        var monthYear = dateParts[0] + '-' + dateParts[1]; 

        if (!accidentsByMonth[monthYear]) {
            accidentsByMonth[monthYear] = [];
        }

        accidentsByMonth[monthYear].push({ lat, lon, date });
    });

    Object.keys(accidentsByMonth).forEach(function (monthYear) {
        const accidents = accidentsByMonth[monthYear];

        for (let i = 0; i < accidents.length; i++) {
            const accident = accidents[i];
            let nearbyAccidents = [accident];

            // Check for nearby accidents within the radius
            for (let j = i + 1; j < accidents.length; j++) {
                const otherAccident = accidents[j];
                if (isWithinRadius(accident.lat, accident.lon, otherAccident.lat, otherAccident.lon, radius)) {
                    nearbyAccidents.push(otherAccident);
                }
            }

            // If there are enough accidents in close proximity, mark the area
            if (nearbyAccidents.length >= accidentThreshold) {
                let avgLat = 0, avgLon = 0;
                nearbyAccidents.forEach(acc => {
                    avgLat += acc.lat;
                    avgLon += acc.lon;
                });
                avgLat /= nearbyAccidents.length;
                avgLon /= nearbyAccidents.length;

                let maxDistance = 0;
                nearbyAccidents.forEach(acc => {
                    const distance = calculateDistance(avgLat, avgLon, acc.lat, acc.lon);
                    maxDistance = Math.max(maxDistance, distance);
                });

                L.circle([avgLat, avgLon], {
                    radius: maxDistance,
                    color: 'black',
                    fillColor: 'red',
                    fillOpacity: 0.5
                }).addTo(map)
                    .bindPopup('<b>Accident Prone Area</b>');
            }
        }
    });
}
function loadPermanentData(fileName) {
    Papa.parse(fileName, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            if (results.data && results.data.length > 0) {
                results.data.forEach(function (row) {
                    var lat = parseFloat(row.latitude);
                    var lon = parseFloat(row.longitude);
                    var date = row.date || 'Unknown Date';
                    var time = row.Time || 'Unknown Time';

                    if (!isNaN(lat) && !isNaN(lon)) {
                        L.marker([lat, lon], { icon: greenIcon })
                            .addTo(permanentLayerGroup)
                            .bindPopup(`<b>Permanent Accident Location</b><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}<br>Date: ${date} ,Time: ${time}`);
                    }
                });
            } else {
                console.error("No data found in the CSV file.");
            }
        },
        error: function (error) {
            console.error("Error parsing CSV: ", error);
        }
    });
}

function loadCsvData(fileName) {
    Papa.parse(fileName, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            if (results.data && results.data.length > 0) {
                var randomData = getRandomItems(results.data, 500);
                detectAccidentProneAreas(results.data);

                // Clear only the temporary layer group
                temporaryLayerGroup.clearLayers();

                randomData.forEach(function (row) {
                    var lat = parseFloat(row.latitude);
                    var lon = parseFloat(row.longitude);
                    var date = row.Date || 'Unknown Date';  
                    var time = row.Time || 'Unknown Time';

                    if (!isNaN(lat) && !isNaN(lon)) {
                        L.marker([lat, lon], { icon: redIcon })
                            .addTo(temporaryLayerGroup)
                            .bindPopup(`<b>Accident Location</b><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}<br>Date: ${date} ,Time: ${time}`);
                    }
                });
            } else {
                console.error("No data found in the CSV file.");
            }
        },
        error: function (error) {
            console.error("Error parsing CSV: ", error);
        }
    });
}
function handleDataSelection() {
    const dataSelect = document.getElementById("dataSelect");
    dataSelect.addEventListener("change", function () {
        const selectedValue = dataSelect.value;
        let fileName;

        switch (selectedValue) {
            case "1":
                fileName = "static/data/df_18.csv";
                break;
            case "2":
                fileName = "static/data/df_22.csv";
                break;
            case "3":
                fileName = "static/data/df_21.csv";
                break;
            case "4":
                fileName = "static/data/df_23.csv";
                break;
            case "5":
                fileName = "static/data/df_24.csv";
                break;
            default:
                fileName = "static/data/df_18.csv";
        }

        loadCsvData(fileName);
    });
}
handleDataSelection();
loadPermanentData("static/data/live_accident_data.csv");
loadCsvData("static/data/df_18.csv");

