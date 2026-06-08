---
concept: linear-programming-feasible-region
branch: sutd
subject: esd
level: Freshmore
syllabus_ref: SUTD ESD / Optimization foundations / linear programming and feasible regions
prerequisites:
  - linear-inequalities
  - cartesian-plotting
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: draft
title: Linear Programming Feasible Region
---

# Linear Programming Feasible Region

A two-variable linear program looks for the largest (or smallest) value of a linear objective \(z = c_1 x_1 + c_2 x_2\) subject to a finite list of linear inequality constraints \(a_{i1} x_1 + a_{i2} x_2 \le b_i\) and the non-negativity constraints \(x_1, x_2 \ge 0\). The **feasible region** is the set of \((x_1, x_2)\) that satisfy every constraint simultaneously. Geometrically it is the intersection of a finite collection of closed half-planes — a convex polygon (or, if the constraints leave it unbounded, a convex region with edges going to infinity).

## First-Principles Explanation

Each inequality \(a_{i1} x_1 + a_{i2} x_2 \le b_i\) divides the plane into two closed half-planes; the inequality picks one of them. The feasible region is the intersection of all chosen half-planes, including the non-negativity quadrant \(x_1 \ge 0,\ x_2 \ge 0\). Three structural facts follow directly:

1. **Convexity.** Each half-plane is convex; the intersection of convex sets is convex. So the feasible region is convex — any line segment between two feasible points stays inside.
2. **Polyhedral structure.** Because each boundary is a straight line, the feasible region's boundary is a union of line segments meeting at corners ("vertices"). With \(n\) inequalities and 2 non-negativity constraints, the feasible region has at most \(\binom{n+2}{2}\) candidate vertices, found by solving each pair of boundary equalities and discarding solutions that violate any other constraint.
3. **Optimality at a vertex.** The level sets of the linear objective \(c_1 x_1 + c_2 x_2 = z\) are parallel straight lines. Sliding this line in the direction of \(\mathbf{c}\) until it last touches the feasible region, the last point of contact is either a single vertex (unique optimum) or an entire edge (a tie between two vertices). Either way, at least one vertex is optimal. This is the **fundamental theorem of linear programming** and the reason corner-point enumeration solves the 2-variable case exactly.

When the constraints overdetermine the system, the feasible region can be **empty** (infeasible). When the objective can grow without bound inside an unbounded region, the LP is **unbounded**. Otherwise the optimum is attained at a vertex.

## Canonical Example

Maximize \(z = 3x_1 + 2x_2\) subject to \(x_1 + x_2 \le 4\), \(x_1 + 3x_2 \le 6\), and \(x_1, x_2 \ge 0\). The feasible region is the quadrilateral with vertices \((0,0)\), \((4,0)\), \((3,1)\), \((0,2)\). Evaluating \(z\) at each: \(0,\ 12,\ 11,\ 4\). The optimum is \(z^\star = 12\) at \((4,0)\) — a vertex, as the fundamental theorem promises.

Now flip the objective sign and minimize \(z = 3x_1 + 2x_2\) over the same region. The optimum collapses to \((0,0)\) with \(z^\star = 0\). The feasible region did not change; only the slide direction of the level sets did.

## Common Misconceptions

- **"Single-constraint satisfaction implies feasibility."** Satisfying one inequality picks one half-plane. The feasible region is the intersection of **all** half-planes; satisfying any proper subset is not enough.
- **"The optimum is always at the geometric centre."** The optimum is at the vertex furthest along the direction \(\mathbf{c}\). The centre is generally not a vertex and is generally not optimal.
- **"Adding a constraint must move the optimum."** Adding a redundant constraint (one already implied by the others) does not change the feasible region or the optimum. Adding a binding constraint can shrink the region and either move the optimum or leave it unchanged.
- **"Unbounded feasible region means unbounded optimum."** Only if the objective can grow inside the unbounded direction. If the objective decreases in every unbounded direction, the optimum is still finite and at a vertex.
- **"Corner enumeration scales."** It works for two variables; in \(n\) variables the number of vertex candidates grows combinatorially, which is why production solvers use the simplex method or interior-point methods rather than naive enumeration.

## Transfer

The corner-check transfer problem (`lp-transfer-corner-check`) takes a fresh constraint set and asks the learner to identify the binding vertex without first plotting the region — exercising the algebraic side of the fundamental theorem. Downstream this view of feasibility carries directly into **network flow** (vertices of a polytope describe basic feasible flows), **portfolio optimisation** (efficient-frontier corners), and the **simplex method** itself, which is corner-to-corner descent dressed up as pivot operations on a tableau.
