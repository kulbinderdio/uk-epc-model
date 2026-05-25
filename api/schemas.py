"""Pydantic schemas for API request/response."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Input schema — mirrors full assessor-level form
# ---------------------------------------------------------------------------

PropertyType = Literal["House", "Flat", "Bungalow", "Maisonette", "Park home"]
BuiltForm = Literal[
    "Detached", "Semi-Detached", "Mid-Terrace", "End-Terrace",
    "Enclosed Mid-Terrace", "Enclosed End-Terrace",
]
EnergyEff = Literal["Very Good", "Good", "Average", "Poor", "Very Poor"]
YesNo = Literal["Y", "N"]


class PropertyInput(BaseModel):
    # --- Property basics ---
    property_type: PropertyType
    built_form: BuiltForm
    construction_age_band: Optional[str] = None
    total_floor_area: float = Field(..., gt=0, le=2000, description="Floor area in m²")
    number_habitable_rooms: Optional[int] = Field(None, ge=1, le=30)
    number_heated_rooms: Optional[int] = Field(None, ge=0, le=30)
    tenure: Optional[str] = None

    # --- Building envelope ---
    walls_description: Optional[str] = None
    walls_energy_eff: Optional[EnergyEff] = None
    roof_description: Optional[str] = None
    roof_energy_eff: Optional[EnergyEff] = None
    floor_description: Optional[str] = None
    floor_energy_eff: Optional[EnergyEff] = None
    windows_description: Optional[str] = None
    windows_energy_eff: Optional[EnergyEff] = None
    multi_glaze_proportion: Optional[float] = Field(None, ge=0, le=100)
    glazed_type: Optional[str] = None
    extension_count: Optional[int] = Field(None, ge=0, le=20)
    number_open_fireplaces: Optional[int] = Field(None, ge=0, le=20)

    # --- Heating & energy ---
    main_fuel: Optional[str] = None
    mainheat_description: Optional[str] = None
    mainheat_energy_eff: Optional[EnergyEff] = None
    mainheatcont_description: Optional[str] = None
    mainheatc_energy_eff: Optional[EnergyEff] = None
    secondheat_description: Optional[str] = None
    sheating_energy_eff: Optional[EnergyEff] = None
    hotwater_description: Optional[str] = None
    hot_water_energy_eff: Optional[EnergyEff] = None
    lighting_energy_eff: Optional[EnergyEff] = None
    energy_tariff: Optional[str] = None
    mains_gas_flag: Optional[YesNo] = None
    solar_water_heating_flag: Optional[YesNo] = None
    photo_supply: Optional[YesNo] = None
    wind_turbine_count: Optional[int] = Field(None, ge=0, le=10)
    low_energy_lighting: Optional[YesNo] = None
    mechanical_ventilation: Optional[str] = None

    # --- Flat-specific ---
    floor_level: Optional[int] = Field(None, ge=-1, le=99)
    flat_storey_count: Optional[int] = Field(None, ge=1, le=100)
    flat_top_storey: Optional[YesNo] = None
    heat_loss_corridor: Optional[str] = None


class PredictionResponse(BaseModel):
    efficiency_score: float
    letter_grade: str
    score_low: float
    score_high: float
    grade_low: str
    grade_high: str


class RecommendationItem(BaseModel):
    model_config = {"coerce_numbers_to_str": True}

    improvement_id: Optional[str]
    improvement_summary: Optional[str]
    frequency: Optional[int]
    median_cost_estimate: Optional[float]
    property_type: Optional[str]
    built_form: Optional[str]
    current_energy_rating: Optional[str]


class RecommendationsResponse(BaseModel):
    current_grade: str
    recommendations: list[RecommendationItem]
