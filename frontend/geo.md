# San Francisco Geospatial Agent — Feature Reference (feature.md)

This document explains each numerical feature produced by the SF geospatial pipeline.
For every feature, it describes:
- what the feature represents
- how it is derived
- typical value ranges in San Francisco
- interpretation thresholds
- how an LLM should reason about and verbalize the feature

---

## ndvi — Normalized Difference Vegetation Index

What it measures:
Relative amount of live vegetation using near-infrared and red reflectance.

Formula:
(B8 − B4) / (B8 + B4)

Typical range:
-1.0 to 1.0  
Practical SF range: 0.0 to 0.6

Interpretation:
ndvi < 0.1  
→ No vegetation (buildings, roads, water)

ndvi 0.1 – 0.3  
→ Sparse vegetation

ndvi 0.3 – 0.5  
→ Moderate vegetation

ndvi > 0.5  
→ Dense vegetation / parks / tree cover

LLM guidance:
Use ndvi to describe how green or natural an area feels.
Low ndvi usually correlates with higher heat and urban density.

Example language:
“This area has limited greenery.”  
“This neighborhood is noticeably green with tree cover.”

---

## evi — Enhanced Vegetation Index

What it measures:
Vegetation density with better sensitivity in dense urban greenery than NDVI.

Formula:
2.5 * (B8 − B4) / (B8 + 6*B4 − 7.5*B2 + 1)

Typical range:
-1.0 to 1.0  
Practical SF range: 0.0 to 0.4

Interpretation:
evi < 0.1  
→ Little or no vegetation

evi 0.1 – 0.25  
→ Grass and sparse trees

evi > 0.25  
→ Dense tree canopy / mature parks

LLM guidance:
Use evi to distinguish tree-heavy areas from grass or low vegetation.
High evi often indicates cooling benefits.

Example language:
“This area has mature tree canopy.”  
“Greenery here is mostly sparse or low-lying.”

---

## ndbi — Normalized Difference Built-up Index

What it measures:
Intensity of built-up or impervious urban surfaces.

Formula:
(B11 − B8) / (B11 + B8)

Typical range:
-1.0 to 1.0  
Practical SF range: -0.2 to 0.4

Interpretation:
ndbi < 0.0  
→ Vegetation-dominated

ndbi 0.0 – 0.2  
→ Mixed residential / low density

ndbi > 0.2  
→ Dense urban / commercial / industrial

LLM guidance:
Use ndbi to describe urban density and intensity.
High ndbi often implies heat retention and reduced greenery.

Example language:
“This area is highly built-up.”  
“This neighborhood has a mix of buildings and open space.”

---

## bsi — Bare Soil Index

What it measures:
Presence of bare ground, construction, or industrial surfaces.

Formula:
((B11 + B4) − (B8 + B2)) / ((B11 + B4) + (B8 + B2))

Typical range:
-1.0 to 1.0  
Practical SF range: -0.3 to 0.5

Interpretation:
bsi < 0.0  
→ Vegetation or developed surfaces

bsi 0.0 – 0.3  
→ Exposed soil / mixed surfaces

bsi > 0.3  
→ Industrial zones / construction areas

LLM guidance:
Use bsi to highlight industrial or transitional landscapes.
High bsi often indicates less livability.

Example language:
“This area includes exposed or industrial surfaces.”  
“Minimal bare ground is present.”

---

## lst — Land Surface Temperature (°C)

What it measures:
Actual surface temperature derived from Landsat thermal data.

Units:
Degrees Celsius (°C)

Typical SF summer range:
15°C – 35°C

Interpretation:
lst < 20  
→ Cool surface (coastal, foggy, green areas)

lst 20 – 27  
→ Moderate temperature

lst > 27  
→ Heat-stressed surface

LLM guidance:
Use lst to explain why areas feel hot or cool.
This is stronger evidence than vegetation proxies alone.

Example language:
“This area experiences higher surface temperatures in summer.”  
“This location remains relatively cool.”

---

## elevation — Elevation Above Sea Level

What it measures:
Height above mean sea level.

Units:
Meters

Typical SF range:
0 – 280 m

Interpretation:
elevation < 30  
→ Low-lying / coastal

elevation 30 – 100  
→ Moderate elevation

elevation > 100  
→ Hills / ridgelines

LLM guidance:
Use elevation to explain wind, fog, views, and microclimate differences.

Example language:
“This neighborhood sits on higher ground.”  
“This area is low-lying and coastal.”

---

## slope — Terrain Slope

What it measures:
Steepness of terrain.

Units:
Degrees

Typical SF range:
0° – 35°

Interpretation:
slope < 5  
→ Flat and walkable

slope 5 – 15  
→ Moderately hilly

slope > 15  
→ Steep terrain

LLM guidance:
Use slope to describe walkability, accessibility, and physical effort.

Example language:
“This area is mostly flat and easy to walk.”  
“The terrain here is steep and hilly.”

---

## nightLights — Nighttime Light Intensity

What it measures:
Human activity and economic vibrancy using nighttime light emissions.

Units:
Radiance (unitless proxy)

Typical SF range:
0 – 50+

Interpretation:
nightLights < 5  
→ Quiet / residential / low activity

nightLights 5 – 20  
→ Mixed residential and commercial

nightLights > 20  
→ High activity / nightlife / commercial hubs

LLM guidance:
Use nightLights to describe how busy or quiet an area feels at night.

Example language:
“This area is quiet after dark.”  
“This neighborhood stays active at night.”

---

## fogScore — Fog Exposure Score

What it measures:
Likelihood of frequent fog based on coastal proximity and elevation.

Derived from:
Distance to coast and elevation

Normalized range:
0.0 – 1.0

Interpretation:
fogScore < 0.3  
→ Rare fog

fogScore 0.3 – 0.6  
→ Occasional fog

fogScore > 0.6  
→ Frequent fog

LLM guidance:
Use fogScore to explain cool, overcast microclimates.
Especially relevant for western and coastal SF.

Example language:
“This area frequently experiences fog.”  
“This neighborhood is usually sunnier.”

---

## greenScore — Composite Greenery Score

What it measures:
Overall greenery and ecological presence.

Derived from:
Weighted NDVI and EVI

Normalized range:
0.0 – 1.0

Interpretation:
greenScore < 0.3  
→ Low greenery

greenScore 0.3 – 0.6  
→ Moderate greenery

greenScore > 0.6  
→ Highly green / park-rich

LLM guidance:
Use greenScore as the primary “how green is this place?” signal.

Example language:
“This area scores high on greenery.”  
“Green space is limited here.”

---

## heatScore — Composite Heat Stress Score

What it measures:
Relative heat stress based on land surface temperature.

Derived from:
Normalized LST

Normalized range:
0.0 – 1.0

Interpretation:
heatScore < 0.3  
→ Cool and comfortable

heatScore 0.3 – 0.6  
→ Moderate heat exposure

heatScore > 0.6  
→ Heat-vulnerable

LLM guidance:
Use heatScore to summarize thermal comfort and climate risk.

Example language:
“This area is relatively cool even in summer.”  
“This neighborhood is vulnerable during heat waves.”

---

## Recommended Reasoning Patterns for LLMs

- Always explain *why* (e.g. heat due to low greenery and high urban density)
- Prefer composite scores for summaries
- Use raw indices for comparisons and explanations
- Avoid exact numbers in user-facing text unless requested

Example synthesis:
“This neighborhood is dense and active at night, with limited greenery and higher summer heat, but remains cooler due to frequent fog.”

