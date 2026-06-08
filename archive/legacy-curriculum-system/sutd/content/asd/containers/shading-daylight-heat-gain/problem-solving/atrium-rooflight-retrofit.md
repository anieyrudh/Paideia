# Transfer Problem: Atrium Rooflight Retrofit

An atrium rooflight overheats at noon. The current design uses 55 percent roof glazing and shallow horizontal fins. The design team wants to keep the atrium bright enough for studio review sessions while reducing direct solar heat gain.

## Given

- Rooflight bay area: 18 m2
- Effective glazed height for the shading section: 2.4 m
- Existing glazing ratio: 0.55
- Existing fin depth: 0.3 m
- Solar altitude to test: 70 degrees
- Solar irradiance proxy: 0.78 kW/m2
- Solar heat gain coefficient: 0.42

## Worked Comparison

Existing fins:

`shaded fraction = min(1, 0.3 x tan(70 deg) / 2.4) = 0.34`

`glass area = 18 x 0.55 = 9.9 m2`

Compare two proposals:

1. Increase fin depth to 0.8 m and keep glazing at 0.55.
2. Use a 0.6 m fin and reduce rooflight glazing to 0.45.

## Expected Reasoning

Deeper fins change the shaded fraction: they reduce the sunlit part of the rooflight and therefore cut direct heat gain, but they can also reduce useful daylight. Reducing rooflight glazing changes exposed glass area: it lowers heat gain by shrinking the aperture, but it also lowers the maximum daylight admitted. A defensible retrofit identifies which output is limiting first, then chooses the smallest move that reduces heat gain while keeping daylight usable.

## Rubric

- Correctly separates glass area from shaded fraction.
- Computes shaded fraction with the tangent relationship and caps it at 1.
- Uses the shaded fraction in both daylight and heat-gain reasoning.
- Rejects the misconception that more glass automatically improves daylight quality.
- Rejects the misconception that shading is only a daylight penalty.
- Transfers the facade idea to a rooflight case without treating it as a new concept.
