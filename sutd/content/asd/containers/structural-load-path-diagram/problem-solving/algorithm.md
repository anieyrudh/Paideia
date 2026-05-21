# Structural Load Path Diagram Algorithm

1. Isolate the structural bay as a free body.
2. Mark all external actions: sideways load `H`, gravity load `W`, and support reactions.
3. Choose the connected path from load entry to support: roof diaphragm, brace or frame, columns, bases.
4. Resolve the diagonal brace force using `F_b = H / cos(theta)`.
5. Calculate overturning shift with `Delta R = Hh / L`.
6. Calculate support reactions: `R_windward = W/2 - Delta R`, `R_leeward = W/2 + Delta R`.
7. Interpret the result: clear path, brace overstress, or uplift risk.
8. Transfer the same check to another frame before changing member sizes.
