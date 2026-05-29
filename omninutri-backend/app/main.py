from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="OmniNutri Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ❌ TEMP DISABLED (this is crashing your deploy)
# from app.routes.chat import router as chat_router
# app.include_router(chat_router)

@app.get("/")
def root():
    return {"status": "working"}

@app.get("/health")
def health():
    return {"ok": True}