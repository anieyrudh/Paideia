# Misconceptions

## Longest activity controls the project

The controlling path is the longest predecessor chain, not necessarily the
single longest node.

## Every delay moves launch

Only delays that exceed available slack move the project completion time.

## Parallel work should be summed

Parallel branches compete through the `max` in the forward pass; they are not
added unless they occur on the same path.
