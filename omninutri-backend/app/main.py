from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.chat import router as chat_router  # ✅ import router

app = FastAPI(title="OmniNutri Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://omninutrihealth.netlify.app",  # ✅ your real Netlify domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)  # ✅ this makes POST /chat show in Swagger

@app.get("/")
def root():
    return {
        "status": "working",
        "name": "OmniNutri Backend",
        "docs": "/docs",
        "health": "/health",
    }

@app.get("/health")
def health():
    return {"status": "ok"}