
# CICERON API

Esta es una API desarrollada con **Python** y **FastAPI**. Sigue los pasos a continuación para configurar tu entorno local y poner en marcha el servidor de desarrollo.

## Requisitos Previos

* **Python 3.8+** instalado.
* Pip (gestor de paquetes de Python).

## Configuración e Instalación

Sigue estos pasos en tu terminal:

### 1. Crear el entorno virtual

Es recomendable usar un entorno virtual para mantener las dependencias aisladas.

```bash
python -m venv venv

```

### 2. Activar el entorno virtual

* **En Windows:**
```bash
.\venv\Scripts\activate

```


* **En macOS/Linux:**
```bash
source venv/bin/activate

```



### 3. Instalar dependencias

Una vez activado el entorno, instala todas las librerías necesarias:

```bash
pip install -r requirements.txt

```

---

## 🏃 Ejecución de la API

Para iniciar el servidor de desarrollo con recarga automática (hot-reload), utiliza el siguiente comando:

```bash
uvicorn main:app --reload

```

> [!TIP]
> El flag `--reload` hará que el servidor se reinicie automáticamente cada vez que guardes un cambio en el código.

### Acceso a la Documentación

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva en:

* **Swagger UI:** [http://127.0.0.1:8000/docs](https://www.google.com/search?q=http://127.0.0.1:8000/docs)
* **Redoc:** [http://127.0.0.1:8000/redoc](https://www.google.com/search?q=http://127.0.0.1:8000/redoc)

---

## Estructura del Proyecto

```text
.
├── main.py              # Punto de entrada de la aplicación
├── requirements.txt     # Archivo de dependencias
├── venv/                # Entorno virtual (ignorado por Git)
└── README.md            # Instrucciones del proyecto

```