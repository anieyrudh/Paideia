# Problem-Solving Algorithm

Use this when a bay, facade, or room must balance daylight with a lateral load path.

1. Name the demand. Separate gravity load from lateral load.
2. Draw the intended path. Mark columns, frame action, braces, walls, and foundations.
3. Choose the opening ratio. Estimate how much of the bay face is open.
4. Choose the resisting system. Decide whether the bay relies on frame action, a diagonal brace, or an X-brace.
5. Estimate daylight. Use `daylight proxy = opening ratio × clear area after obstruction × 100`.
6. Estimate lateral resistance. Use `capacity proxy = base system capacity × opening factor`.
7. Check residual force. Use `residual = lateral demand - lateral capacity`.
8. Interpret the tradeoff. A good proposal keeps residual demand near zero while preserving the daylight target.

This is a teaching model, not a structural design code. It makes the coupling visible before detailed engineering.
