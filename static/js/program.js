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
    };

    // Asigna la función showSection al objeto window para que pueda ser llamada desde el HTML
    window.showSection = showSection;

    // Inicializa la sección de inicio por defecto al cargar la página
    showSection('home');

    // Lógica para el mapa Leaflet y el formulario de registro
    let leafletMap; // Variable global para el mapa Leaflet
    let currentMarker = null; // Variable para almacenar el marcador actual en Leaflet

    function initializeLeafletMap() {
        if (leafletMap) {
            leafletMap.remove(); // Elimina el mapa si ya existe para evitar duplicados
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

        // Opcional: Centrar el mapa al redimensionar la ventana para asegurar que se muestre correctamente
        leafletMap.invalidateSize();
    }

    // Lógica para el envío del formulario de construcción (requiere backend)
    const construccionForm = document.querySelector('#formularioConstruccionSection form');
    if (construccionForm) {
        construccionForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Previene el envío tradicional del formulario

            const formData = new FormData(construccionForm);
            const data = Object.fromEntries(formData.entries());

            // Convertir 'pisos' y 'estado' a números si es necesario
            data.pisos = parseInt(data.pisos);
            data.estado = parseInt(data.estado);
            data.latitud = parseFloat(data.latitud);
            data.longitud = parseFloat(data.longitud);

            console.log('Datos a enviar:', data);

            try {
                // Aquí necesitarás la URL de tu endpoint de backend
                const response = await fetch('/api/construcciones', { // Ejemplo de URL
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
                } else {
                    const errorData = await response.json();
                    alert('Error al registrar la construcción: ' + (errorData.message || 'Error desconocido'));
                    console.error('Error en el registro:', errorData);
                }
            } catch (error) {
                console.error('Error de red o del servidor:', error);
                alert('Hubo un problema de conexión al intentar registrar la construcción.');
            }
        });
    }

    // Lógica para la sección de listado de construcciones (requiere backend)
    const listadoConstruccionesSection = document.getElementById('listadoConstruccionesSection');
    if (listadoConstruccionesSection) {
        // Función para cargar y mostrar las construcciones
        async function loadConstrucciones() {
            const listadoContainer = document.getElementById('construccionesList');
            if (!listadoContainer) return; // Asegúrate de que el contenedor exista

            listadoContainer.innerHTML = 'Cargando construcciones...';
            try {
                const response = await fetch('/api/construcciones/all'); // Endpoint para obtener todas las construcciones
                if (response.ok) {
                    const construcciones = await response.json();
                    listadoContainer.innerHTML = ''; // Limpiar mensaje de carga

                    if (construcciones.length === 0) {
                        listadoContainer.innerHTML = '<p class="text-center text-muted">No hay construcciones registradas aún.</p>';
                    } else {
                        // Inicializa un mapa Leaflet para el listado (si quieres uno separado)
                        // Opcional: Si quieres un mapa que muestre todos los marcadores en esta misma sección
                        let allConstructionsMap = L.map('allConstructionsMap').setView([4.6738981, -74.103011], 13);
                        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            maxZoom: 19,
                            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        }).addTo(allConstructionsMap);

                        // Crear un grupo de marcadores para ajustar la vista automáticamente
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
                                        <button class="btn btn-sm btn-info btn-upload-image" data-id="${construccion.id}">Subir Imagen</button>
                                        <input type="file" class="d-none upload-input" data-id="${construccion.id}" accept="image/*">
                                    </div>
                                </div>
                            `;
                            listadoContainer.appendChild(card);

                            // Añadir marcador al mapa de todas las construcciones
                            if (construccion.localizacion && construccion.localizacion.x && construccion.localizacion.y) {
                                const lat = construccion.localizacion.x; // PostgreSQL POINT almacena (x,y) como (longitude, latitude) por defecto si no se especifica SRID
                                const lon = construccion.localizacion.y; // Pero en tu caso, parece que quieres (lat, lon) -> (y, x)
                                // Asumiendo que tu base de datos POINT almacena (latitud, longitud) como (y, x)
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

                        // Event listeners para los botones de subir imagen
                        document.querySelectorAll('.btn-upload-image').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const id = e.target.dataset.id;
                                const input = document.querySelector(`.upload-input[data-id="${id}"]`);
                                input.click(); // Simula clic en el input de tipo file
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
                    listadoContainer.innerHTML = '<p class="text-danger text-center">Error al cargar los registros.</p>';
                }
            } catch (error) {
                console.error('Error al obtener construcciones:', error);
                listadoContainer.innerHTML = '<p class="text-danger text-center">No se pudo conectar al servidor para obtener los datos.</p>';
            }
        }

        // Cargar construcciones cuando la sección se activa
        listadoConstruccionesSection.addEventListener('DOMNodeInserted', (e) => {
            if (e.target.classList && e.target.classList.contains('active')) {
                loadConstrucciones();
            }
        });
        // También cargar si ya estaba activa al inicio (por si acaso)
        if (listadoConstruccionesSection.classList.contains('active')) {
             loadConstrucciones();
        }
    }

    // Helper para obtener el nombre del estado (si no usas una tabla de estados)
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