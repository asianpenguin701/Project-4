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
            fillColor = "rgb(188,189,220)";
            break;
        case "Medium":
            fillColor = "rgb(140,107,177)";
            break;
        case "Small":
            fillColor = "rgb(140,150,198)";
            break;
        default:
            fillColor = "rgb(189,189,189)";
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


// Fetch real-time weather data using coordinates from GeoJSON and predict delays
async function getWeatherData() {
    const airport = document.getElementById('airport').value.trim();
    const geoJsonUrl = 'https://raw.githubusercontent.com/Levifahring/flight_delay_final/main/Data/Airport_Hub_List.geojson';

    try {
        // Fetch airport coordinates from the GeoJSON
        const geoJsonResponse = await fetch(geoJsonUrl);
        const geoJsonData = await geoJsonResponse.json();

        // Match airport code (ARPT_NAME or IATA_CODE)
        const airportFeature = geoJsonData.features.find(feature =>
            feature.properties.ARPT_NAME.toUpperCase().includes(airport.toUpperCase()) ||
            feature.properties.IATA_CODE.toUpperCase() === airport.toUpperCase()
        );

        if (!airportFeature) {
            document.getElementById('coordinates').innerText = 'Airport not found.';
            document.getElementById('weatherData').innerText = '';
            document.getElementById('predictionResult').innerText = '';
            return;
        }

        // Extract coordinates
        const [lon, lat] = airportFeature.geometry.coordinates;

        // Display coordinates
        document.getElementById('coordinates').innerText = `Latitude: ${lat}, Longitude: ${lon}`;

        // Fetch real-time weather data using coordinates
        const apiKey = 'fee834a770c7f5b2c7a3912288b1d388';
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const weatherData = await weatherResponse.json();

        if (!weatherData.main) {
            document.getElementById('weatherData').innerText = 'No weather data available.';
            return;
        }

        // Display weather data
        document.getElementById('weatherData').innerText = JSON.stringify(weatherData, null, 2);

        // Extract relevant weather features
        const weatherFeatures = {
            Temperature: weatherData.main.temp,
            Precipitation: weatherData.rain ? weatherData.rain['1h'] : 0,
            WindSpeed: weatherData.wind.speed,
            Visibility: weatherData.visibility / 1000,
            StormEvents: weatherData.weather[0].description.toLowerCase().includes('storm') ? 1 : 0
        };

        // Send weather features to the backend for prediction
        const predictionResponse = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(weatherFeatures)
        });

        const predictionResult = await predictionResponse.json();
        document.getElementById('predictionResult').innerText = `Delay Probability: ${(predictionResult.probability * 100).toFixed(2)}%`;
    } catch (error) {
        console.error('Error fetching weather data or making prediction:', error);
        document.getElementById('coordinates').innerText = '';
        document.getElementById('weatherData').innerText = 'Error fetching weather data.';
        document.getElementById('predictionResult').innerText = '';
    }
}
