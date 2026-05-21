# Problem-Solving Algorithm

Use this when a facade decision must balance useful daylight with direct solar heat gain.

1. Name the facade condition. Record orientation, glazing ratio, overhang depth, and the solar altitude to test.
2. Estimate exposed glass area. Use `glass area = facade area x glazing ratio`.
3. Estimate shadow reach. Use `shadow reach = overhang depth x tan(solar altitude)`.
4. Convert shadow reach to shaded fraction. Use `shaded fraction = min(1, shadow reach / window height)`.
5. Estimate daylight. Use `daylight score = 100 x glazing ratio x orientation daylight bias x (1 - 0.38 x shaded fraction)`.
6. Estimate direct heat gain. Use `heat gain = glass area x solar irradiance x SHGC x exposure factor x (1 - 0.82 x shaded fraction)`.
7. Interpret both outputs together. A useful proposal reduces heat gain without driving the daylight score below the studio target.
8. Transfer the result. Decide whether the next design move should deepen shade, reduce glazing, change orientation exposure, or combine moves.

This is a teaching model for early facade reasoning. It is not a substitute for climate-based daylight simulation or code compliance modelling.
