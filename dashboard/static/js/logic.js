// Initialize the map
const map = L.map('map').setView([39.8283, -98.5795], 5);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Define marker size and color based on hub size
function getMarkerStyle(hubSize) {
    let fillColor;
    switch (hubSize) {
        case "Large":
            fillColor = "rgb(106,81,163)";
            break;
        case "Medium":
            fillColor = "rgb(158,154,200)";
            break;
        case "Small":
            fillColor = "rgb(188,189,220)";
            break;
        default:
            fillColor = "rgb(140,107,177)";
    }
    return {
        radius: hubSize === "Large" ? 15 : hubSize === "Medium" ? 10 : hubSize === "Small" ? 7 : 5,
        fillColor: fillColor,
        fillOpacity: 1,
        color: "white", // White outline
        weight: 1 // Smaller outline thickness
    };
}

// Use D3 to load the GeoJSON data
d3.json('https://raw.githubusercontent.com/Levifahring/flight_delay_final/main/Data/Airport_Hub_List.geojson')
    .then(data => {
        if (!data || !data.features) {
            console.error('Invalid GeoJSON data');
            return;
        }

        // Add GeoJSON layer to the map
        L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, getMarkerStyle(feature.properties.HUB_SIZE));
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <b>${feature.properties.ARPT_NAME}</b><br>
                    City: ${feature.properties.CITY}<br>
                    State: ${feature.properties.STATE_NAME}<br>
                    Hub Size: ${feature.properties.HUB_SIZE}
                `);
            }
        }).addTo(map);
    })
    .catch(error => console.error('Error loading GeoJSON with D3:', error));

// Use CSV file on Github for origin and destination probabilities
const csvUrl = "https://api.allorigins.win/raw?url=https://raw.githubusercontent.com/Levifahring/flight_delay_final/main/Data/average_delay_probabilities_by_origin_dest.csv";

async function getDelayProbability() {
    const originCode = document.getElementById('origin-airport').value.trim().toUpperCase();
    const destinationCode = document.getElementById('destination-airport').value.trim().toUpperCase();

    if (!originCode || !destinationCode) {
        document.getElementById('predictionResult').innerText = 'Please enter valid IATA codes for both origin and destination.';
        return;
    }

    try {
        // Fetch the CSV file
        const response = await d3.csv(csvUrl);

        // Find the row matching both origin and destination
        const matchingRow = response.find(row => row['Origin'] === originCode && row['Dest'] === destinationCode);

        if (!matchingRow) {
            document.getElementById('predictionResult').innerText = `No data found for route from ${originCode} to ${destinationCode}.`;
            return;
        }

        // Parse and display the delay probability
        const delayProbability = (parseFloat(matchingRow['Delay_Probability']) || 0) * 100;
        document.getElementById('predictionResult').innerText = `Delay Probability: ${delayProbability.toFixed(1)}%`;

    } catch (error) {
        console.error('Error fetching delay probabilities:', error);
        document.getElementById('predictionResult').innerText = 'Error calculating delay probability.';
    }
}



// Attach the function to your button's click event
const predictButton = document.querySelector('button');
predictButton.addEventListener('click', getDelayProbability);
