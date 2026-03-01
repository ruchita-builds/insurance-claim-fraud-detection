
from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SecureClaim AI")

# Enable CORS so frontend can call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model and expected columnsmodel = 
try:
    model = joblib.load("backend/models/final_fraud_model.pkl")
    columns = joblib.load("backend/models/model_columns.pkl")
    print("✅ Model and columns loaded successfully")
except Exception as e:
    print("❌ Error loading model or columns:", e)
    model = None
    columns = []

# Corrected FraudInput to match frontend JSON keys
class FraudInput(BaseModel):
    age_of_driver: float
    annual_income: float
    vehicle_price: float
    total_claim: float
    injury_claim: float
    policy_deductible: float
    past_num_of_claims: float
    days_open: float

@app.post("/predict")
def predict(data: FraudInput):

    input_dict = data.dict()

    input_df = pd.DataFrame([input_dict])

    # Add missing columns
    for col in columns:
        if col not in input_df.columns:
            input_df[col] = 0

    input_df = input_df[columns]

    prediction = model.predict_proba(input_df)[0][1]

    return {
        "fraud_probability": round(float(prediction * 100), 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)