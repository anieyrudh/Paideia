# Problem-Solving Algorithm

Use this procedure when a surface \(f(x,y)\), a point, and a direction are
given.

1. Check that the input point and direction are in the stated domain.
2. Differentiate with respect to \(x\) while holding \(y\) fixed to obtain
   \(f_x\).
3. Differentiate with respect to \(y\) while holding \(x\) fixed to obtain
   \(f_y\).
4. Evaluate both partial derivatives at the point and assemble
   \(\nabla f=\langle f_x,f_y\rangle\).
5. Normalize the requested direction if it is not already a unit vector.
6. Compute \(D_{\mathbf u}f=\nabla f\cdot\mathbf u\).
7. Interpret the sign and magnitude: positive means uphill, negative means
   downhill, and near zero means the move is tangent to a level curve to first
   order.
