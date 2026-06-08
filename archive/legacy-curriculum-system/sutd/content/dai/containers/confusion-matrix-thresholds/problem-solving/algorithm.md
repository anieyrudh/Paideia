# Problem-Solving Algorithm

1. Set the decision threshold.
2. For each case, compare the score with the threshold to assign predicted positive or predicted negative.
3. Compare each prediction with the actual class and count TP, FP, TN, and FN.
4. Compute precision, recall, and accuracy from the counts.
5. Compute stakeholder cost:

   `total cost = FP x false-positive cost + FN x false-negative cost`

6. Interpret which stakeholder is harmed by the larger error cell and justify whether the threshold is appropriate.
