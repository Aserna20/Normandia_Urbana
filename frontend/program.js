var map = L.map('map').setView([4.628201072429681, -74.06592966123681], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

//manejar el evento de hacer click en el mapa 

function  onMapClick(e) {
    var marker = L.marker(e.latlng).addTo(map);
}

map.on('click', onMapClick);

