# Problem-Solving Algorithm

1. Identify the cell's current phase (G0, G1, S, G2, or M) and its current ploidy and DNA-content multiplier.
2. List the active checkpoint conditions: DNA damaged? Replication complete? Chromosomes aligned? Nutrients sufficient?
3. Decide which checkpoint gates the current phase:
   - G1 → S uses G1/S (needs no damage and nutrients)
   - S → G2 uses replication completion (no formal checkpoint, but a precondition)
   - G2 → M uses G2/M (needs no damage and replication complete)
   - M → division uses Spindle (needs chromosome alignment)
   - G0 → G1 needs nutrients
4. Evaluate the relevant checkpoint. If it fails, the cell stays in the current phase and you list the failing conditions.
5. If the checkpoint passes, advance the phase. Update DNA-content (S → G2 sets DNA content to 2; division resets it to 1).
6. If you have reached M phase with replicated DNA and the spindle checkpoint passes, the caller chooses **mitosis** (two daughters, ploidy preserved) or **meiosis** (four daughters, ploidy halved; rejects odd-ploidy parent).
7. Interpret the daughter cells in plain language and compare with the parent.
