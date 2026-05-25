import logging

from fastapi import APIRouter, HTTPException
from api.schemas import PropertyInput, PredictionResponse
from src.model.predict import predict

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
async def predict_epc(body: PropertyInput) -> PredictionResponse:
    try:
        result = predict(body.model_dump())
        return PredictionResponse(**result)
    except Exception as e:
        log.error("Prediction failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.") from e
