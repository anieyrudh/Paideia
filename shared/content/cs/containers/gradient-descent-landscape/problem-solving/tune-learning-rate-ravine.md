# Transfer Problem: Tune a Learning Rate Before Training

A student is tuning gradient descent for a one-parameter calibration model before running a longer training pass. The current parameter is theta = 4 and the first gradient is 12 loss units per parameter unit. Compare eta = 0.04 and eta = 0.22.

## Task

1. Write the update rule.
2. Substitute each learning rate into the first update.
3. Explain which first move is safer.
4. State why this is the same concept as the two-parameter landscape simulation.

## Expected Reasoning

The update is theta_next = theta - eta times gradient. With eta = 0.04, the first move is 4 - 0.04(12) = 3.52. With eta = 0.22, the first move is 4 - 0.22(12) = 1.36. The larger learning rate makes a much larger move from the same local information, so it is riskier before checking the next loss value. This transfers the same concept because the learner still has to connect the local gradient, the learning rate, and the resulting update size.
