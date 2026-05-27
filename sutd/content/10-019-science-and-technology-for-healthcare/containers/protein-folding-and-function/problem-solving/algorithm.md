# Problem-Solving Algorithm

1. Write the protein sequence in one-letter code (20 standard amino acids).
2. Pick a window width `W` (commonly 9 or 19 residues).
3. Look up each residue's Kyte-Doolittle hydropathy value.
4. Slide the window across the sequence. At each centre residue `i`, compute the mean hydropathy across the W residues.
5. Apply thresholds: `>= +1.6` is a candidate hydrophobic stretch; `<= -0.5` is hydrophilic; otherwise neutral.
6. Identify the longest contiguous hydrophobic run. Lengths of 17-25 residues are consistent with transmembrane alpha helices.
7. Cross-check the result against the protein's expected environment: a hydrophobic plateau in a known cytosolic protein likely buries a hydrophobic core; the same plateau in a membrane protein likely sits in the bilayer.
8. Interpret. State whether the chain has a candidate transmembrane segment, an obvious hydrophobic core, or no clear bias. Always note the dependence on chain length, environment, and chaperones.
