document.addEventListener('DOMContentLoaded', (event) => {
    // Función para mostrar/ocultar secciones y activar el botón de navegación
    const showSection = (sectionId, event) => {
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

        // Añade la clase 'active-nav-btn' al botón que se ha clickeado
        if (event && event.target) {
            event.target.classList.add('active-nav-btn');
        } else {
            // Si la función es llamada sin un evento (ej. en DOMContentLoaded),
            // busca el botón por el sectionId y actívalo.
            const buttonToActivate = document.querySelector(`.nav-custom button[onclick*="${sectionId}"]`);
            if (buttonToActivate) {
                buttonToActivate.classList.add('active-nav-btn');
            }
        }

        // Si la sección de registro de construcción se activa, inicializa o actualiza el mapa Leaflet
        if (sectionId === 'formularioConstruccion') {
            initializeLeafletMap();
        }
        // Si la sección de listado de construcciones se activa, carga las construcciones
        if (sectionId === 'listadoConstrucciones') {
            loadConstrucciones();
        }
    };

    // Asigna la función showSection al objeto window para que pueda ser llamada desde el HTML
    window.showSection = showSection;

    // Inicializa la sección de inicio por defecto al cargar la página
    showSection('home');

    // Lógica para el mapa Leaflet y el formulario de registro
    let leafletMap; // Variable global para el mapa Leaflet
    let currentMarker = null; // Variable para almacenar el marcador actual en Leaflet

    function initializeLeafletMap() {
        // Solo inicializa el mapa si el div 'map' está visible
        const mapDiv = document.getElementById('map');
        if (!mapDiv || !mapDiv.offsetParent) { // offsetParent verifica si el elemento es visible
            return;
        }

        if (leafletMap) {
            leafletMap.remove(); // Elimina el mapa si ya existe para evitar duplicados y errores
        }

        // Coordenadas para centrar el mapa en el barrio Normandía, Bogotá
        const normandiaCoords = [4.6738981, -74.103011];
        const initialZoom = 15; // Un buen nivel de zoom para ver el barrio

        // Inicializa el mapa Leaflet
        leafletMap = L.map('map').setView(normandiaCoords, initialZoom);

        // Añade una capa base de OpenStreetMap
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(leafletMap);

        // Manejar el evento de clic en el mapa Leaflet
        leafletMap.on('click', (e) => {
            // Elimina el marcador anterior si existe
            if (currentMarker) {
                leafletMap.removeLayer(currentMarker);
            }

            // Crea y añade el nuevo marcador
            currentMarker = L.marker(e.latlng).addTo(leafletMap);

            // Muestra una ventana emergente con las coordenadas
            currentMarker.bindPopup("Lat: " + e.latlng.lat.toFixed(6) + "<br>Lon: " + e.latlng.lng.toFixed(6)).openPopup();

            // Rellena los campos de latitud y longitud del formulario
            document.getElementById('latitud').value = e.latlng.lat;
            document.getElementById('longitud').value = e.latlng.lng;
        });

        // Asegúrate de que el mapa se renderice correctamente después de ser visible
        leafletMap.invalidateSize();
    }

    // Lógica para el envío del formulario de construcción (usando localStorage para simular persistencia)
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
                
                construcciones.push(data);
                localStorage.setItem('construcciones', JSON.stringify(construcciones));

                alert('¡Construcción registrada con éxito!');
                console.log('Registro exitoso en localStorage:', data);
                construccionForm.reset(); // Limpia el formulario
                if (currentMarker) { // Elimina el marcador temporal del formulario
                    leafletMap.removeLayer(currentMarker);
                    currentMarker = null;
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

            /*
            // --- CÓDIGO PARA USAR UN BACKEND REAL (descomenta y configura cuando tengas uno) ---
            try {
                const response = await fetch('/api/construcciones', { // Asegúrate que esta es la URL correcta de tu backend
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (response.ok) {
                    const result = await response.json();
                    alert('¡Construcción registrada con éxito!');
                    console.log('Registro exitoso:', result);
                    construccionForm.reset(); // Limpia el formulario
                    if (currentMarker) { // Elimina el marcador temporal del formulario
                        leafletMap.removeLayer(currentMarker);
                        currentMarker = null;
                    }
                    // Opcional: Recargar o actualizar la lista de construcciones si estás en esa página
                    if (document.getElementById('listadoConstruccionesSection').classList.contains('active')) {
                        loadConstrucciones();
                    }
                } else {
                    const errorData = await response.json();
                    alert('Error al registrar la construcción: ' + (errorData.message || 'Error desconocido'));
                    console.error('Error en el registro:', errorData);
                }
            } catch (error) {
                console.error('Error de red o del servidor:', error);
                alert('Hubo un problema de conexión al intentar registrar la construcción.');
            }
            // --- FIN CÓDIGO BACKEND REAL ---
            */
        });
    }

    // Lógica para la sección de listado de construcciones (usando localStorage)
    let allConstructionsMap = null; // Variable global para el mapa del listado

    async function loadConstrucciones() {
        const listadoContainer = document.getElementById('construccionesList');
        const mapContainer = document.getElementById('allConstructionsMap');
        if (!listadoContainer || !mapContainer) return;

        listadoContainer.innerHTML = '<p class="text-center">Cargando construcciones...</p>';

        // Elimina el mapa anterior si existe para evitar duplicados al recargar la sección
        if (allConstructionsMap) {
            allConstructionsMap.remove();
            allConstructionsMap = null;
        }

        // --- SIMULACIÓN DE BACKEND CON localStorage ---
        try {
            const construcciones = JSON.parse(localStorage.getItem('construcciones')) || [];

            listadoContainer.innerHTML = ''; // Limpiar mensaje de carga

            if (construcciones.length === 0) {
                listadoContainer.innerHTML = '<p class="text-center text-muted">No hay construcciones registradas aún.</p>';
                // No inicializar el mapa si no hay datos para mostrar
                return;
            } else {
                // Inicializa el mapa Leaflet para el listado
                allConstructionsMap = L.map('allConstructionsMap').setView([4.6738981, -74.103011], 13); // Centrar en Normandía
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }).addTo(allConstructionsMap);

                const markersGroup = L.featureGroup().addTo(allConstructionsMap);

                construcciones.forEach(construccion => {
                    // Crear un card para cada construcción
                    const card = document.createElement('div');
                    card.classList.add('col-md-6', 'col-lg-4', 'mb-4');
                    card.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${construccion.direccion}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">NUPRE: ${construccion.nupre}</h6>
                                <p class="card-text">
                                    <strong>Tipo:</strong> ${construccion.tipo_construccion}<br>
                                    <strong>Pisos:</strong> ${construccion.pisos}<br>
                                    <strong>Área:</strong> ${construccion.area_predio}<br>
                                    <strong>Estado:</strong> ${getNombreEstado(construccion.estado)}<br>
                                    <strong>Propietario:</strong> ${construccion.propietario} (${construccion.cedula_propietario})
                                </p>
                                ${construccion.url_imagen ? `<img src="${construccion.url_imagen}" class="img-fluid rounded mb-3" alt="Imagen de ${construccion.tipo_construccion}">` : '<p class="text-muted">No hay imagen disponible.</p>'}
                                </div>
                        </div>
                    `;
                    listadoContainer.appendChild(card);

                    // Añadir marcador al mapa de todas las construcciones
                    if (construccion.localizacion && construccion.localizacion.y && construccion.localizacion.x) {
                        const lat = construccion.localizacion.y; // Latitud (y en PostGIS POINT)
                        const lon = construccion.localizacion.x; // Longitud (x en PostGIS POINT)
                        const marker = L.marker([lat, lon]).addTo(allConstructionsMap);

                        marker.bindPopup(`
                            <strong>${construccion.direccion}</strong><br>
                            NUPRE: ${construccion.nupre}<br>
                            Tipo: ${construccion.tipo_construccion}<br>
                            ${construccion.url_imagen ? `<img src="${construccion.url_imagen}" style="max-width:100px; height:auto; margin-top:5px;">` : ''}
                        `);
                        markersGroup.addLayer(marker);
                    }
                });

                // Ajustar el mapa para que muestre todos los marcadores
                if (markersGroup.getLayers().length > 0) {
                    allConstructionsMap.fitBounds(markersGroup.getBounds());
                }
                // Asegúrate de que el mapa se renderice correctamente después de ser visible
                allConstructionsMap.invalidateSize();
            }
        } catch (error) {
            console.error('Error al obtener construcciones de localStorage:', error);
            listadoContainer.innerHTML = '<p class="text-danger text-center">Error al cargar los registros locales.</p>';
        }
        // --- FIN SIMULACIÓN ---

        /*
        // --- CÓDIGO PARA USAR UN BACKEND REAL (descomenta y configura cuando tengas uno) ---
        try {
            const response = await fetch('/api/construcciones/all'); // Asegúrate que esta es la URL correcta de tu backend
            if (response.ok) {
                const construcciones = await response.json();
                listadoContainer.innerHTML = ''; // Limpiar mensaje de carga

                if (construcciones.length === 0) {
                    listadoContainer.innerHTML = '<p class="text-center text-muted">No hay construcciones registradas aún.</p>';
                    return; // No inicializar el mapa si no hay datos
                } else {
                    if (allConstructionsMap) {
                        allConstructionsMap.remove(); // Elimina el mapa anterior si existe
                    }
                    allConstructionsMap = L.map('allConstructionsMap').setView([4.6738981, -74.103011], 13);
                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 19,
                        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    }).addTo(allConstructionsMap);

                    const markersGroup = L.featureGroup().addTo(allConstructionsMap);

                    construcciones.forEach(construccion => {
                        const card = document.createElement('div');
                        card.classList.add('col-md-6', 'col-lg-4', 'mb-4');
                        card.innerHTML = `
                            <div class="card h-100">
                                <div class="card-body">
                                    <h5 class="card-title">${construccion.direccion}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">NUPRE: ${construccion.nupre}</h6>
                                    <p class="card-text">
                                        <strong>Tipo:</strong> ${construccion.tipo_construccion}<br>
                                        <strong>Pisos:</strong> ${construccion.pisos}<br>
                                        <strong>Área:</strong> ${construccion.area_predio}<br>
                                        <strong>Estado:</strong> ${getNombreEstado(construccion.estado)}<br>
                                        <strong>Propietario:</strong> ${construccion.propietario} (${construccion.cedula_propietario})
                                    </p>
                                    ${construccion.url_imagen ? `<img src="${construccion.url_imagen}" class="img-fluid rounded mb-3" alt="Imagen de ${construccion.tipo_construccion}">` : '<p class="text-muted">No hay imagen disponible.</p>'}
                                    <button class="btn btn-sm btn-info btn-upload-image" data-id="${construccion.id}">Subir Imagen</button>
                                    <input type="file" class="d-none upload-input" data-id="${construccion.id}" accept="image/*">
                                </div>
                            </div>
                        `;
                        listadoContainer.appendChild(card);

                        if (construccion.localizacion && construccion.localizacion.y && construccion.localizacion.x) {
                            const lat = construccion.localizacion.y;
                            const lon = construccion.localizacion.x;
                            const marker = L.marker([lat, lon]).addTo(allConstructionsMap);
                            marker.bindPopup(`
                                <strong>${construccion.direccion}</strong><br>
                                NUPRE: ${construccion.nupre}<br>
                                Tipo: ${construccion.tipo_construccion}<br>
                                ${construccion.url_imagen ? `<img src="${construccion.url_imagen}" style="max-width:100px; height:auto; margin-top:5px;">` : ''}
                            `);
                            markersGroup.addLayer(marker);
                        }
                    });

                    if (markersGroup.getLayers().length > 0) {
                        allConstructionsMap.fitBounds(markersGroup.getBounds());
                    }
                    allConstructionsMap.invalidateSize();

                    // Event listeners para los botones de subir imagen (requiere backend)
                    document.querySelectorAll('.btn-upload-image').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const id = e.target.dataset.id;
                            const input = document.querySelector(`.upload-input[data-id="${id}"]`);
                            input.click();
                        });
                    });

                    document.querySelectorAll('.upload-input').forEach(input => {
                        input.addEventListener('change', async (e) => {
                            const id = e.target.dataset.id;
                            const file = e.target.files[0];
                            if (!file) return;

                            const formData = new FormData();
                            formData.append('image', file);

                            try {
                                const response = await fetch(`/api/construcciones/${id}/upload_image`, {
                                    method: 'POST',
                                    body: formData,
                                });

                                if (response.ok) {
                                    alert('Imagen subida con éxito!');
                                    loadConstrucciones(); // Recarga la lista para mostrar la nueva imagen
                                } else {
                                    const errorData = await response.json();
                                    alert('Error al subir imagen: ' + (errorData.message || 'Error desconocido'));
                                }
                            } catch (error) {
                                console.error('Error de red al subir imagen:', error);
                                alert('Problema de conexión al subir la imagen.');
                            }
                        });
                    });
                }
            } else {
                listadoContainer.innerHTML = '<p class="text-danger text-center">Error al cargar los registros del servidor.</p>';
            }
        } catch (error) {
            console.error('Error al obtener construcciones:', error);
            listadoContainer.innerHTML = '<p class="text-danger text-center">No se pudo conectar al servidor para obtener los datos.</p>';
        }
        // --- FIN CÓDIGO BACKEND REAL ---
        */
    }

    // Helper para obtener el nombre del estado
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