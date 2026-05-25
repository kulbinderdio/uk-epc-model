export const PROPERTY_TYPES = ["House", "Flat", "Bungalow", "Maisonette", "Park home"];

export const BUILT_FORMS = [
  "Detached",
  "Semi-Detached",
  "Mid-Terrace",
  "End-Terrace",
  "Enclosed Mid-Terrace",
  "Enclosed End-Terrace",
];

export const AGE_BANDS = [
  "before 1900",
  "1900-1929",
  "1930-1949",
  "1950-1966",
  "1967-1975",
  "1976-1982",
  "1983-1990",
  "1991-1995",
  "1996-2002",
  "2003-2006",
  "2007-2011",
  "2012 onwards",
];

export const ENERGY_EFF_OPTIONS = ["Very Good", "Good", "Average", "Poor", "Very Poor"];

export const MAIN_FUEL_OPTIONS = [
  "mains gas (not community)",
  "electricity",
  "oil",
  "LPG",
  "coal",
  "wood",
  "anthracite",
  "smokeless solid fuel",
  "biomass",
  "community heating",
  "heat pump",
  "other",
];

export const TENURE_OPTIONS = [
  "owner-occupied",
  "rented (private)",
  "rented (social)",
  "unknown",
];

export const REGION_OPTIONS = [
  "East Midlands",
  "East of England",
  "London",
  "North East",
  "North West",
  "South East",
  "South West",
  "Wales",
  "West Midlands",
  "Yorkshire and The Humber",
  "Scotland",
  "Northern Ireland",
];

export const GLAZED_TYPE_OPTIONS = ["double glazing", "triple glazing", "single glazing", "secondary glazing"];

export const VENTILATION_OPTIONS = ["natural", "mechanical - extract only", "mechanical - supply and extract"];

export const ENERGY_TARIFF_OPTIONS = [
  { value: "Single",           label: "Standard single-rate" },
  { value: "standard tariff",  label: "Standard tariff" },
  { value: "dual",             label: "Economy 7 (dual-rate)" },
  { value: "dual (24 hour)",   label: "Economy 7 – 24-hour" },
  { value: "off-peak 7 hour",  label: "Off-peak 7-hour" },
  { value: "off-peak 10 hour", label: "Off-peak 10-hour" },
  { value: "off-peak 18 hour", label: "Off-peak 18-hour" },
  { value: "24 hour",          label: "24-hour tariff" },
  { value: "Unknown",          label: "Unknown" },
];

export const HEAT_LOSS_CORRIDOR_OPTIONS = ["no corridor", "heated corridor", "unheated corridor"];

export const WALL_DESCRIPTIONS = [
  "Cavity wall, as built, no insulation (assumed)",
  "Cavity wall, as built, partial insulation (assumed)",
  "Cavity wall, filled cavity",
  "Cavity wall, with internal insulation",
  "Solid brick, as built, no insulation (assumed)",
  "Solid brick, with internal insulation",
  "Solid brick, with external insulation",
  "Timber frame, as built, no insulation (assumed)",
  "Timber frame, with insulation",
  "Cob, as built, no insulation",
  "System built, as built, no insulation (assumed)",
  "Stone, granite or whinstone, as built, no insulation (assumed)",
  "Stone, sandstone, as built, no insulation (assumed)",
];

export const ROOF_DESCRIPTIONS = [
  "Pitched, 200mm loft insulation",
  "Pitched, 270mm loft insulation",
  "Pitched, 100mm loft insulation",
  "Pitched, no insulation (assumed)",
  "Pitched, insulated at rafters",
  "Flat, limited insulation (assumed)",
  "Flat, insulated",
  "Another dwelling above",
];

export const FLOOR_DESCRIPTIONS = [
  "Suspended, no insulation (assumed)",
  "Suspended, with insulation",
  "Solid, no insulation (assumed)",
  "Solid, insulated",
  "Another dwelling below",
  "To external air",
];

export const WINDOWS_DESCRIPTIONS = [
  "Fully double glazed",
  "Fully double glazed, glazing date unknown",
  "Full triple glazing",
  "Single glazed",
  "Mostly double glazed",
  "Partial double glazing",
];

export const MAINHEAT_DESCRIPTIONS = [
  "Boiler and radiators, mains gas",
  "Boiler and radiators, oil",
  "Boiler and radiators, LPG",
  "Boiler and radiators, coal",
  "Electric storage heaters",
  "Air source heat pump, radiators",
  "Ground source heat pump, underfloor heating",
  "Warm air system, mains gas",
  "Room heaters, mains gas",
  "Room heaters, electric",
  "Community scheme",
];

export const HOTWATER_DESCRIPTIONS = [
  "From main system",
  "From main system, no cylinder thermostat",
  "Electric immersion, standard tariff",
  "Electric immersion, off-peak tariff",
  "From heat pump",
  "Community scheme",
];

export const LIGHTING_DESCRIPTIONS = [
  "Low energy lighting in all fixed outlets",
  "Low energy lighting in 75% of fixed outlets",
  "Low energy lighting in 50% of fixed outlets",
  "No low energy lighting",
];
