# Misconceptions

## Recursive Code Always Has Exponential Cost

The call tree may expand, but each deeper call may be cheaper. The correction is to compute total work per level, not just the number of nodes.

## Base Cases Do Not Affect Total Work

Base cases determine the tree height and the number of leaves. That height decides whether a constant, logarithmic, or polynomial factor remains in the total.
