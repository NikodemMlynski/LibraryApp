from fastapi import FastAPI 

app = FastAPI(root_path="/api/analytics") 

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "analytics-service"}