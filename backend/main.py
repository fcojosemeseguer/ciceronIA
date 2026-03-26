from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import router as routerv1
from app.api.v2.endpoints import router as routerv2

app = FastAPI(title="CiceronAI")
app.include_router(routerv1, prefix="/api/v1")
app.include_router(routerv2, prefix="/api/v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # <--- Esto permite cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],      # Permite todos los encabezados
)


@app.get("/")
async def root():
    return {"message": "welcome to ciceron AI api"}
