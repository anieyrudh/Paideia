# Robot Work Budget

A robot moves a tool from `(0,0)` to `(1.5,1)` through a planar force field. Before replacing a full route integral with endpoint potential change, test whether the field is conservative.

For `F = <x,1>`, use `phi(x,y)=0.5x^2+y`, so the work is `phi(1.5,1)-phi(0,0)=2.125` for any route. For `F=<-y,x>`, no single potential is available on the plane, so the planned route must be integrated.
