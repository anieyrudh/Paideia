# Algorithm

1. Write the system as an augmented matrix `[A|b]`.
2. Choose a nonzero pivot in the first column, swapping rows if needed.
3. Use a row operation to clear the entry below the pivot.
4. If the second row has a pivot, back-substitute for a unique solution.
5. If the second row is zero on the left, inspect the right side to distinguish dependent rows from contradiction.
