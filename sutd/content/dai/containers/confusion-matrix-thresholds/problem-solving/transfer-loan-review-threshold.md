# Transfer Problem: Loan Review Threshold

A lender uses a model score to flag applications for manual review. A positive
prediction means "review this application." The actual positive class means the
application is genuinely risky.

Given a threshold, count TP, FP, TN, and FN. Then compute:

- Precision: TP / (TP + FP)
- Recall: TP / (TP + FN)
- Total cost: FP x false-positive cost + FN x false-negative cost

An excellent answer names the stakeholder affected by each error. False
positives delay eligible applicants. False negatives approve risky applications.
The final threshold must be justified with both the counts and the cost units.
