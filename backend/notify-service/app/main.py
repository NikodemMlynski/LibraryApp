from fastapi import FastAPI 

app = FastAPI(root_path="/api/notify") 

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "notify-service"}