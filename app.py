from flask import Flask, request, jsonify, send_from_directory, render_template # <-- Añade render_template
import psycopg2
from psycopg2 import extras
import os

app = Flask(__name__)

# --- Configuración de la base de datos y UPLOAD_FOLDER (esto ya lo tienes) ---
DB_HOST = "localhost"
DB_NAME = "Normandia"
DB_USER = "postgres"
DB_PASS = "tu_contraseña_de_postgres" # <--- ¡CAMBIA ESTO!
DB_PORT = "5432"

UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )
    return conn

# --- NUEVA RUTA: Para servir la página principal (index.html) ---
@app.route('/')
def index():
    return render_template('index.html')

# --- Rutas existentes para servir archivos estáticos (CSS, JS, imágenes) ---
# Esta es opcional si el HTML ya usa las rutas /static/, Flask lo maneja por defecto.
# Pero no hace daño dejarla si ya la tienes.
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# --- API para el registro de construcciones (esto ya lo tienes) ---
@app.route('/api/construcciones', methods=['POST'])
def registrar_construccion():
    # ... tu código existente para registrar ...
    pass # Reemplaza con tu lógica

# --- API para obtener todas las construcciones (esto ya lo tienes) ---
@app.route('/api/construcciones/all', methods=['GET'])
def get_all_construcciones():
    # ... tu código existente para obtener ...
    pass # Reemplaza con tu lógica

# --- API para subir imagen (esto ya lo tienes) ---
@app.route('/api/construcciones/<int:construccion_id>/upload_image', methods=['POST'])
def upload_image(construccion_id):
    # ... tu código existente para subir imagen ...
    pass # Reemplaza con tu lógica

if __name__ == '__main__':
    app.run(debug=True, port=5000)