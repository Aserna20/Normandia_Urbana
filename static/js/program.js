document.addEventListener('DOMContentLoaded', (event) => {
    // Constantes para el mapa
    const NORMANDIA_COORDS = [4.6738981, -74.103011];
    const INITIAL_FORM_ZOOM = 16; // Zoom más cercano para el formulario
    const INITIAL_LIST_ZOOM = 15; // Zoom para el listado general si se usara

    // Función para mostrar/ocultar secciones y activar el botón de navegación
    const showSection = (sectionId) => {
        // Oculta todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remueve la clase 'active-nav-btn' de todos los botones de navegación
        document.querySelectorAll('.nav-custom .btn').forEach(btn => {
            btn.classList.remove('active-nav-btn');
        });

        // Muestra la sección deseada
        const targetSection = document.getElementById(sectionId + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Añade la clase 'active-nav-btn' al botón correspondiente
        const buttonToActivate = document.querySelector(`.nav-custom button[data-section="${sectionId}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active-nav-btn');
        }

        // Lógica específica para cada sección
        if (sectionId === 'formularioConstruccion') {
            initializeLeafletMapForForm();
        } else if (sectionId === 'listadoConstrucciones') {
            // El mapa general de listado ha sido reemplazado por mapas individuales,
            // por lo que simplemente llamamos a cargar construcciones.
            // Si el mapa general existiera, se invalidaría el tamaño aquí.
            loadConstrucciones();
        }
    };

    // Asigna la función showSection al objeto window (para compatibilidad si fuera necesario fuera del DOMContentLoaded)
    // Aunque ahora con los event listeners directos no es estrictamente necesario, no hace daño.
    window.showSection = showSection;

    // Inicializa la sección de inicio por defecto al cargar la página
    showSection('home');

    // Asignar event listeners a los botones de navegación
    document.querySelectorAll('.nav-custom .btn').forEach(button => {
        const sectionId = button.getAttribute('data-section');
        if (sectionId) {
            button.addEventListener('click', (e) => {
                e.preventDefault(); // Previene el comportamiento por defecto del botón
                showSection(sectionId);
            });
        }
    });

    // --- Lógica para el mapa Leaflet en el formulario de registro ---
    let formLeafletMap; // Variable global para el mapa Leaflet del formulario
    let formCurrentMarker = null; // Variable para almacenar el marcador actual en el formulario

    function initializeLeafletMapForForm() {
        const mapDiv = document.getElementById('map');
        // Solo inicializa el mapa si el div 'map' está visible
        if (!mapDiv || !mapDiv.offsetParent) {
            return;
        }

        // Elimina el mapa si ya existe para evitar duplicados y errores
        if (formLeafletMap) {
            formLeafletMap.remove();
        }

        // Inicializa el mapa Leaflet centrado en Normandía
        formLeafletMap = L.map('map').setView(NORMANDIA_COORDS, INITIAL_FORM_ZOOM);

        // Añade una capa base de OpenStreetMap
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(formLeafletMap);

        // Si ya hay un marcador de una sesión anterior, añádelo
        const currentLat = document.getElementById('latitud').value;
        const currentLon = document.getElementById('longitud').value;
        if (currentLat && currentLon) {
            const latlng = L.latLng(parseFloat(currentLat), parseFloat(currentLon));
            formCurrentMarker = L.marker(latlng, { draggable: true }).addTo(formLeafletMap);
            formCurrentMarker.bindPopup(`Lat: ${latlng.lat.toFixed(6)}<br>Lon: ${latlng.lng.toFixed(6)}`).openPopup();
            formLeafletMap.setView(latlng, INITIAL_FORM_ZOOM);

            formCurrentMarker.on('dragend', function(e) {
                const markerLatLng = formCurrentMarker.getLatLng();
                document.getElementById('latitud').value = markerLatLng.lat;
                document.getElementById('longitud').value = markerLatLng.lng;
                geocodeLatLng(markerLatLng.lat, markerLatLng.lng, 'direccion'); // Actualizar dirección al mover marcador
            });
        }

        // Manejar el evento de clic en el mapa Leaflet para añadir/mover marcador
        formLeafletMap.on('click', (e) => {
            if (formCurrentMarker) {
                formCurrentMarker.setLatLng(e.latlng);
            } else {
                formCurrentMarker = L.marker(e.latlng, { draggable: true }).addTo(formLeafletMap);
                formCurrentMarker.on('dragend', function(e) {
                    const markerLatLng = formCurrentMarker.getLatLng();
                    document.getElementById('latitud').value = markerLatLng.lat;
                    document.getElementById('longitud').value = markerLatLng.lng;
                    geocodeLatLng(markerLatLng.lat, markerLatLng.lng, 'direccion'); // Actualizar dirección al mover marcador
                });
            }
            formCurrentMarker.bindPopup("Lat: " + e.latlng.lat.toFixed(6) + "<br>Lon: " + e.latlng.lng.toFixed(6)).openPopup();

            // Rellena los campos de latitud y longitud del formulario
            document.getElementById('latitud').value = e.latlng.lat;
            document.getElementById('longitud').value = e.latlng.lng;

            geocodeLatLng(e.latlng.lat, e.latlng.lng, 'direccion'); // Obtener dirección y rellenar campo
        });

        // Asegúrate de que el mapa se renderice correctamente después de ser visible
        formLeafletMap.invalidateSize();
    }

    // Función para geocodificar una dirección (string) a coordenadas
    async function geocodeAddress(address, targetLatId, targetLonId, targetAddressId) {
        if (!address) return;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&limit=1`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                const displayAddress = data[0].display_name;

                document.getElementById(targetLatId).value = lat;
                document.getElementById(targetLonId).value = lon;
                if (targetAddressId) {
                    document.getElementById(targetAddressId).value = displayAddress;
                }

                // Mover el marcador y centrar el mapa
                if (formLeafletMap) {
                    const latlng = L.latLng(lat, lon);
                    if (formCurrentMarker) {
                        formCurrentMarker.setLatLng(latlng);
                    } else {
                        formCurrentMarker = L.marker(latlng, { draggable: true }).addTo(formLeafletMap);
                        formCurrentMarker.on('dragend', function(e) {
                            const markerLatLng = formCurrentMarker.getLatLng();
                            document.getElementById('latitud').value = markerLatLng.lat;
                            document.getElementById('longitud').value = markerLatLng.lng;
                            geocodeLatLng(markerLatLng.lat, markerLatLng.lng, 'direccion');
                        });
                    }
                    formCurrentMarker.bindPopup(`Lat: ${lat.toFixed(6)}<br>Lon: ${lon.toFixed(6)}<br>${displayAddress}`).openPopup();
                    formLeafletMap.setView(latlng, INITIAL_FORM_ZOOM);
                }
            } else {
                alert('Dirección no encontrada. Por favor, sé más específico o utiliza el mapa.');
            }
        } catch (error) {
            console.error('Error en la geocodificación:', error);
            alert('Error al buscar la dirección. Intenta de nuevo más tarde.');
        }
    }

    // Función para geocodificar coordenadas (lat, lon) a una dirección
    async function geocodeLatLng(lat, lon, targetAddressId) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.display_name) {
                document.getElementById(targetAddressId).value = data.display_name;
            } else {
                document.getElementById(targetAddressId).value = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
            }
        } catch (error) {
            console.error('Error en la geocodificación inversa:', error);
            document.getElementById(targetAddressId).value = `Error al obtener dirección para ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }
    }

    // Event listener para el botón de búsqueda de dirección
    const buscarDireccionBtn = document.getElementById('buscarDireccionBtn');
    if (buscarDireccionBtn) {
        buscarDireccionBtn.addEventListener('click', () => {
            const address = document.getElementById('direccion_busqueda').value;
            geocodeAddress(address, 'latitud', 'longitud', 'direccion');
        });
    }

    // Event listener para el formulario de construcción (usando localStorage para simular persistencia)
    const construccionForm = document.querySelector('#formularioConstruccionSection form');
    if (construccionForm) {
        construccionForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Previene el envío tradicional del formulario

            const formData = new FormData(construccionForm);
            const data = Object.fromEntries(formData.entries());

            // Convertir 'pisos' y 'estado' a números
            data.pisos = parseInt(data.pisos);
            data.estado = parseInt(data.estado);
            data.latitud = parseFloat(data.latitud);
            data.longitud = parseFloat(data.longitud);

            console.log('Datos a registrar:', data);

            // --- SIMULACIÓN DE BACKEND CON localStorage ---
            try {
                let construcciones = JSON.parse(localStorage.getItem('construcciones')) || [];
                // Asignar un ID simple para cada construcción
                data.id = construcciones.length ? Math.max(...construcciones.map(c => c.id)) + 1 : 1;
                // Guardar latitud y longitud directamente para consistencia
                data.localizacion = { y: data.latitud, x: data.longitud }; // Formato para PostGIS (lat, lon) -> (y, x)
                data.url_imagen = data.url_imagen || ''; // Asegurarse de que el campo exista

                construcciones.push(data);
                localStorage.setItem('construcciones', JSON.stringify(construcciones));

                alert('¡Construcción registrada con éxito!');
                console.log('Registro exitoso en localStorage:', data);
                construccionForm.reset(); // Limpia el formulario
                if (formCurrentMarker) { // Elimina el marcador temporal del formulario
                    formLeafletMap.removeLayer(formCurrentMarker);
                    formCurrentMarker = null;
                }
                // Si la sección de listado está activa, recargarla
                if (document.getElementById('listadoConstruccionesSection').classList.contains('active')) {
                    loadConstrucciones();
                }

            } catch (error) {
                console.error('Error al registrar en localStorage:', error);
                alert('Hubo un problema al intentar registrar la construcción localmente.');
            }
            // --- FIN SIMULACIÓN ---
        });
    }

    // --- Lógica para la sección de listado de construcciones (usando localStorage) ---
    // NO HAY MAPA GENERAL, CADA TARJETA TIENE SU PROPIO MAPA

    async function loadConstrucciones() {
        const listadoContainer = document.getElementById('construccionesList');
        if (!listadoContainer) return;

        listadoContainer.innerHTML = '<p class="text-center">Cargando construcciones...</p>';

        // --- SIMULACIÓN DE BACKEND CON localStorage ---
        try {
            const construcciones = JSON.parse(localStorage.getItem('construcciones')) || [];

            listadoContainer.innerHTML = ''; // Limpiar mensaje de carga

            if (construcciones.length === 0) {
                listadoContainer.innerHTML = '<p class="text-center text-muted">No hay construcciones registradas aún.</p>';
                return;
            } else {
                construcciones.forEach(construccion => {
                    // Crear un card para cada construcción
                    const card = document.createElement('div');
                    card.classList.add('col-md-6', 'col-lg-4', 'mb-4');
                    card.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${construccion.direccion || 'Dirección no disponible'}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">NUPRE: ${construccion.nupre}</h6>
                                <p class="card-text">
                                    <strong>Tipo:</strong> ${construccion.tipo_construccion}<br>
                                    <strong>Pisos:</strong> ${construccion.pisos}<br>
                                    <strong>Área:</strong> ${construccion.area_predio}<br>
                                    <strong>Estado:</strong> ${getNombreEstado(construccion.estado)}<br>
                                    <strong>Propietario:</strong> ${construccion.propietario} (${construccion.cedula_propietario})
                                </p>
                                <div class="text-center mb-3">
                                    ${construccion.url_imagen ? `<img src="${construccion.url_imagen}" class="img-fluid rounded shadow-sm" alt="Imagen de ${construccion.tipo_construccion}" style="max-height: 150px; object-fit: cover;">` : '<p class="text-muted">No hay imagen disponible.</p>'}
                                </div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <button class="btn btn-sm btn-info btn-upload-image" data-id="${construccion.id}">Subir/Cambiar Imagen</button>
                                    <input type="file" class="d-none upload-input" data-id="${construccion.id}" accept="image/*">
                                </div>
                            </div>
                            <div id="map-card-${construccion.id}" class="card-map-container"></div>
                        </div>
                    `;
                    listadoContainer.appendChild(card);

                    // Inicializar mapa para esta tarjeta
                    if (construccion.localizacion && construccion.localizacion.y && construccion.localizacion.x) {
                        const lat = construccion.localizacion.y; // Latitud (y en PostGIS POINT)
                        const lon = construccion.localizacion.x; // Longitud (x en PostGIS POINT)
                        const cardMap = L.map(`map-card-${construccion.id}`).setView([lat, lon], INITIAL_FORM_ZOOM); // Usar zoom similar al del formulario

                        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            maxZoom: 19,
                            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        }).addTo(cardMap);

                        const marker = L.marker([lat, lon]).addTo(cardMap);
                        marker.bindPopup(`
                            <strong>${construccion.direccion || 'Ubicación registrada'}</strong><br>
                            Tipo: ${construccion.tipo_construccion}<br>
                            Pisos: ${construccion.pisos}<br>
                            ${construccion.url_imagen ? `<img src="${construccion.url_imagen}" style="max-width:100px; height:auto; margin-top:5px;">` : ''}
                        `).openPopup();
                        cardMap.invalidateSize(); // Asegura que el mapa se renderice correctamente
                    }
                });

                // Event listeners para los botones de subir imagen
                document.querySelectorAll('.btn-upload-image').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const id = e.target.dataset.id;
                        const input = document.querySelector(`.upload-input[data-id="${id}"]`);
                        input.click(); // Simula el clic en el input de tipo file
                    });
                });

                document.querySelectorAll('.upload-input').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const id = parseInt(e.target.dataset.id);
                        const file = e.target.files[0];
                        if (!file) return;

                        // Simular subida: convertir imagen a base64 para localStorage
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const imageUrl = reader.result; // Base64 string

                            let construcciones = JSON.parse(localStorage.getItem('construcciones')) || [];
                            const index = construcciones.findIndex(c => c.id === id);
                            if (index !== -1) {
                                construcciones[index].url_imagen = imageUrl;
                                localStorage.setItem('construcciones', JSON.stringify(construcciones));
                                alert('Imagen de la construcción actualizada con éxito.');
                                loadConstrucciones(); // Recarga la lista para mostrar la nueva imagen
                            } else {
                                alert('Construcción no encontrada.');
                            }
                        };
                        reader.readAsDataURL(file); // Lee el archivo como una URL de datos (Base64)
                    });
                });
            }
        } catch (error) {
            console.error('Error al obtener construcciones de localStorage:', error);
            listadoContainer.innerHTML = '<p class="text-danger text-center">Error al cargar los registros locales.</p>';
        }
        // --- FIN SIMULACIÓN ---
    }

    // Helper para obtener el nombre del estado (ya existía, lo mantengo)
    function getNombreEstado(idEstado) {
        const estados = {
            1: 'Construida',
            2: 'En Construcción',
            3: 'Proyecto',
            4: 'Demolida',
            5: 'Otro'
        };
        return estados[idEstado] || 'Desconocido';
    }
});