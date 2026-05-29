from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="OmniNutri Backend",
    version="0.1.0"
)

# ---------------------------
# CORS CONFIG (LOCAL + PROD)
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://YOUR-NETLIFY-SITE.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# ROUTES
# ---------------------------
@app.get("/")
def root():
    return {
        "status": "working",
        "name": "OmniNutri Backend",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
def health():
    return {
        "status": "ok"
    }