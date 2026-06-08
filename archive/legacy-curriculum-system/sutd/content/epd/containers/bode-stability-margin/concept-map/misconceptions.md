# Misconception Map

## Higher gain always improves stability

Evidence: Astrom and Murray, *Feedback Systems*, frequency-response and robustness chapters.

Surface in predict? Yes.

Higher gain can make the response faster, but it can also move gain crossover to a frequency where the plant has accumulated more phase lag. The prediction asks what happens to phase margin when gain doubles, so the wrong "stronger is safer" choice surfaces this misconception.

## Magnitude alone decides closed-loop stability

Evidence: Nise, *Control Systems Engineering*, Bode stability margin treatment.

Surface in predict? Yes.

The 0 dB crossing is only half of the margin readout. The learner must also read phase at gain crossover and magnitude at phase crossover to decide how close the loop is to the oscillation boundary.
