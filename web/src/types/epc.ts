export type PropertyType = "House" | "Flat" | "Bungalow" | "Maisonette" | "Park home";
export type BuiltForm =
  | "Detached"
  | "Semi-Detached"
  | "Mid-Terrace"
  | "End-Terrace"
  | "Enclosed Mid-Terrace"
  | "Enclosed End-Terrace";
export type EnergyEff = "Very Good" | "Good" | "Average" | "Poor" | "Very Poor";
export type YesNo = "Y" | "N";

export interface PropertyInput {
  // Property basics
  property_type: PropertyType;
  built_form: BuiltForm;
  construction_age_band?: string;
  total_floor_area: number;
  number_habitable_rooms?: number;
  number_heated_rooms?: number;
  tenure?: string;

  // Building envelope
  walls_description?: string;
  walls_energy_eff?: EnergyEff;
  roof_description?: string;
  roof_energy_eff?: EnergyEff;
  floor_description?: string;
  floor_energy_eff?: EnergyEff;
  windows_description?: string;
  windows_energy_eff?: EnergyEff;
  multi_glaze_proportion?: number;
  glazed_type?: string;
  extension_count?: number;
  number_open_fireplaces?: number;

  // Heating & energy
  main_fuel?: string;
  mainheat_description?: string;
  mainheat_energy_eff?: EnergyEff;
  mainheatcont_description?: string;
  mainheatc_energy_eff?: EnergyEff;
  secondheat_description?: string;
  sheating_energy_eff?: EnergyEff;
  hotwater_description?: string;
  hot_water_energy_eff?: EnergyEff;
  lighting_energy_eff?: EnergyEff;
  energy_tariff?: string;
  mains_gas_flag?: YesNo;
  solar_water_heating_flag?: YesNo;
  photo_supply?: YesNo;
  wind_turbine_count?: number;
  low_energy_lighting?: YesNo;
  mechanical_ventilation?: string;

  // Flat-specific
  floor_level?: number;
  flat_storey_count?: number;
  flat_top_storey?: YesNo;
  heat_loss_corridor?: string;
}

export interface PredictionResponse {
  efficiency_score: number;
  letter_grade: string;
  score_low: number;
  score_high: number;
  grade_low: string;
  grade_high: string;
}

export interface RecommendationItem {
  improvement_id?: string;
  improvement_summary?: string;
  frequency?: number;
  median_cost_estimate?: number;
  property_type?: string;
  built_form?: string;
  current_energy_rating?: string;
}

export interface RecommendationsResponse {
  current_grade: string;
  recommendations: RecommendationItem[];
}
