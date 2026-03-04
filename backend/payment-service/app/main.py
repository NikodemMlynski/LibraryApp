from fastapi import FastAPI 

app = FastAPI(root_path="/api/payments") 

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "payment-service"}