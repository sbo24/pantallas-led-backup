from fastapi import FastAPI

app = FastAPI(
    title="ShowsTrack API",
    version="1.0.0"
)

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "ShowsTrack API funcionando"}
