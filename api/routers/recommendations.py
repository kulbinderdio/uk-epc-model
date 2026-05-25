import logging

from fastapi import APIRouter, HTTPException
from api.schemas import PropertyInput, RecommendationItem, RecommendationsResponse
from src.model.predict import predict
from src.recommendations.lookup import get_recommendations

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/recommendations", response_model=RecommendationsResponse)
async def get_recs(body: PropertyInput) -> RecommendationsResponse:
    try:
        result = predict(body.model_dump())
        current_grade = result["letter_grade"]

        recs = get_recommendations(
            property_type=body.property_type,
            built_form=body.built_form,
            current_grade=current_grade,
        )
        items = [RecommendationItem(**r) for r in recs]
        return RecommendationsResponse(current_grade=current_grade, recommendations=items)
    except Exception as e:
        log.error("Recommendations failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate recommendations. Please try again.") from e
