# Eigenvector Transformations Misconception Map

## Every vector is an eigenvector

**Why it appears:** Any matrix can multiply any compatible vector, so learners can confuse "has an output" with "keeps its direction."

**Evidence:** Strang, *Introduction to Linear Algebra*, eigenvalue and eigenvector chapters.

**Surface in predict?** yes

**Correction target:** Compare `Av` with one scalar multiple of `v`; if the residual is not zero, the direction did not survive.

## Eigenvalues are rotation angles

**Why it appears:** Transformations can rotate, shear, and scale, and the single eigenvalue number can be misread as the whole transformation action.

**Evidence:** Lay, Lay, and McDonald, *Linear Algebra and Its Applications*, eigenvalue interpretation sections.

**Surface in predict?** yes

**Correction target:** Treat the eigenvalue as the stretch factor along an eigendirection, not as a general rotation description.
