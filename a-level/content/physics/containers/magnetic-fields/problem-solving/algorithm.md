# Magnetic Fields Problem-Solving Algorithm

## Goal

Turn a magnetic-field question into a magnitude calculation, a direction decision, and a units check.

## Algorithm

1. **Classify the object.** Use \(F = BIL\sin\theta\) for a current-carrying conductor and \(F = |q|vB\sin\theta\) for a moving charged particle.
2. **Convert every quantity to SI.** Use tesla, ampere, metre, coulomb, kilogram, and metre per second before substitution.
3. **Find the perpendicular component.** The angle \(\theta\) is between current or velocity and the magnetic field. Parallel gives zero force; perpendicular gives the maximum force.
4. **Calculate magnitude.** Substitute values with units and keep the force in newtons.
5. **Determine direction.** Use Fleming's left-hand rule for conventional current or positive charge velocity. Reverse the result for a negative charge.
6. **For circular motion, equate forces.** If velocity is perpendicular to the field, use \(B|q|v = mv^2/r\) and hence \(r = mv/(B|q|)\).
7. **Interpret the answer.** State whether increasing \(B\), current, length, charge, or speed would increase the force, and name any zero-force condition.

## Checks

- Force direction is perpendicular to the field, not along it.
- A stationary charge has \(v = 0\), so the magnetic force is zero.
- A wire or particle moving parallel to the field has \(\sin 0^\circ = 0\).
- The force on a negative charge is opposite to the positive-charge rule.
