/** Syllabus-aligned curriculum catalogue (topics mirror common exam specs / textbooks). */

export const TECHNIQUES = [
  { id: "worked_example", name: "Worked example", blurb: "Full solution first, then a similar problem" },
  { id: "socratic", name: "Socratic questions", blurb: "Guided questions that lead you there" },
  { id: "drills", name: "Rapid drills", blurb: "Short practice with instant feedback" },
  { id: "analogy", name: "Analogy & story", blurb: "Real-world comparison first" },
  { id: "diagram", name: "Diagram-first", blurb: "Visual structure, then details" },
  { id: "exam_style", name: "Exam-style", blurb: "Mark-scheme style answers & command words" },
];

function t(id, name, subskills) {
  return {
    id,
    name,
    subskills: subskills.map((s, i) =>
      typeof s === "string" ? { id: `${id}_${i + 1}`, name: s } : s
    ),
  };
}

// ─── Physics ─────────────────────────────────────────────────────────────────

const PHYSICS_EDEXCEL = [
  t("phys_mech_motion", "Mechanics: Motion", [
    "SUVAT equations", "Velocity-time graphs", "Displacement-time graphs",
    "Projectile motion", "Stopping distances", "Free fall & g",
  ]),
  t("phys_mech_forces", "Mechanics: Forces", [
    "Newton's laws", "Free-body diagrams", "Resolving forces",
    "Moments & torque", "Centre of gravity", "Conditions for equilibrium",
  ]),
  t("phys_mech_energy", "Mechanics: Energy & power", [
    "Work done", "Kinetic energy", "Gravitational potential energy",
    "Conservation of energy", "Power", "Efficiency",
  ]),
  t("phys_mech_momentum", "Mechanics: Momentum", [
    "Momentum definition", "Impulse", "Conservation of momentum",
    "Elastic collisions", "Inelastic collisions", "Explosions",
  ]),
  t("phys_mat_props", "Materials", [
    "Density", "Hooke's law", "Elastic & plastic behaviour",
    "Stress and strain", "Young modulus", "Strain energy",
  ]),
  t("phys_waves", "Waves", [
    "Wave properties (f, λ, v)", "Transverse & longitudinal", "Phase & path difference",
    "Superposition", "Standing waves", "Refraction & TIR",
  ]),
  t("phys_waves_light", "Wave behaviour of light", [
    "Interference (Young's slits)", "Diffraction grating", "Polarisation",
    "Intensity", "Pulse-echo techniques", "EM spectrum applications",
  ]),
  t("phys_quantum", "Quantum physics / particle nature of light", [
    "Photons & E = hf", "Photoelectric effect", "Work function & threshold",
    "Electron diffraction", "de Broglie wavelength", "Atomic line spectra",
  ]),
  t("phys_electric", "Electric circuits", [
    "Current, charge, mean drift velocity", "Ohm's law & I–V characteristics",
    "Resistivity", "Series & parallel circuits", "EMF and internal resistance", "Potential dividers",
  ]),
  t("phys_further_mech", "Further mechanics", [
    "Circular motion (ω, a = v²/r)", "Centripetal force", "Simple harmonic motion definition",
    "SHM graphs", "SHM energy interchange", "Resonance & damping",
  ]),
  t("phys_fields_grav", "Gravitational fields", [
    "Newton's law of gravitation", "Gravitational field strength g",
    "Gravitational potential", "Orbits & Kepler", "Escape velocity", "Satellites",
  ]),
  t("phys_fields_elec", "Electric fields", [
    "Coulomb's law", "Electric field strength", "Electric potential",
    "Uniform fields (parallel plates)", "Capacitance", "RC charging & discharging",
  ]),
  t("phys_fields_mag", "Magnetic fields", [
    "Force on a current-carrying wire", "Force on a moving charge", "Fleming's left-hand rule",
    "Magnetic flux & flux linkage", "Faraday & Lenz", "Transformers",
  ]),
  t("phys_nuclear", "Nuclear & particle physics", [
    "Atomic structure", "Radioactive decay modes", "Half-life & activity",
    "Nuclear binding energy", "Fission & fusion", "Quarks, leptons & antiparticles",
  ]),
  t("phys_thermo", "Thermodynamics", [
    "Internal energy", "Specific heat capacity", "Specific latent heat",
    "Ideal gas equation", "Kinetic theory molecular model", "First law of thermodynamics",
  ]),
  t("phys_space", "Astrophysics (option)", [
    "Stellar classification (OBAFGKM)", "Hertzsprung–Russell diagram",
    "Stellar evolution", "Doppler shift & redshift", "Hubble's law", "Cosmology basics",
  ]),
];

const PHYSICS_AQA = [
  t("aqa_p_meas", "Measurements & errors", [
    "SI base & derived units", "Prefixes & standard form", "Random & systematic error",
    "Absolute & percentage uncertainty", "Combining uncertainties", "Graph gradients & intercepts",
  ]),
  t("aqa_p_particles", "Particles & radiation", [
    "Atom, nucleus & isotopes", "Specific charge", "Particle & antiparticle pairs",
    "Quarks and leptons", "Exchange particles & Feynman diagrams", "Classification of interactions",
  ]),
  t("aqa_p_em_rad", "Electromagnetic radiation & quantum", [
    "Photoelectric effect", "Photon model", "Energy levels & line spectra",
    "Electron collision excitation", "Wave-particle duality", "de Broglie",
  ]),
  t("aqa_p_waves", "Waves", [
    "Progressive waves", "Longitudinal & transverse", "Polarisation",
    "Superposition & interference", "Stationary waves", "Diffraction",
  ]),
  t("aqa_p_optics", "Optics", [
    "Refraction & refractive index", "Total internal reflection", "Critical angle",
    "Young's double slit", "Diffraction grating equation", "Path difference",
  ]),
  t("aqa_p_mech", "Mechanics", [
    "Scalars & vectors", "Resolving forces", "Moments",
    "Projectile motion", "Newton's laws", "Momentum & impulse",
  ]),
  t("aqa_p_energy", "Work, energy & materials", [
    "Work done & energy transfer", "Conservation of energy", "Power & efficiency",
    "Density", "Hooke's law", "Stress, strain & Young modulus",
  ]),
  t("aqa_p_electric", "Electricity", [
    "Current & potential difference", "Resistance & resistivity", "I–V characteristics",
    "Circuits series/parallel", "EMF & internal resistance", "Potential divider & sensors",
  ]),
  t("aqa_p_circ", "Circular motion & SHM", [
    "Angular speed", "Centripetal acceleration & force", "SHM defining equation",
    "SHM graphs", "Mass-spring & pendulum", "Forced vibrations & resonance",
  ]),
  t("aqa_p_thermal", "Thermal physics", [
    "Internal energy & temperature", "Specific heat capacity", "Latent heat",
    "Ideal gas laws", "Molecular kinetic theory", "Absolute zero",
  ]),
  t("aqa_p_grav", "Gravitational fields", [
    "Newton's law of gravitation", "Gravitational field strength", "Gravitational potential",
    "Orbits of planets & satellites", "Escape velocity", "Energy in a gravitational field",
  ]),
  t("aqa_p_elec_fields", "Electric fields", [
    "Coulomb's law", "Electric field strength", "Electric potential",
    "Comparison with gravitation", "Capacitance", "Exponential discharge of capacitor",
  ]),
  t("aqa_p_mag", "Magnetic fields", [
    "Force on a wire & moving charge", "Magnetic flux density", "Moving-coil instruments",
    "Electromagnetic induction", "Faraday's and Lenz's laws", "Alternators & transformers",
  ]),
  t("aqa_p_nuclear", "Nuclear physics", [
    "Rutherford scattering", "α, β, γ radiation properties", "Exponential decay & half-life",
    "Nuclear radius", "Mass defect & binding energy", "Fission, fusion & nuclear reactors",
  ]),
  t("aqa_p_option", "Option: Astrophysics / Turning points / Engineering", [
    "Lenses & telescopes", "Star classification & HR diagram", "Cosmology",
    "Black-body radiation", "Discovery of electron", "Wave-particle duality tradition",
  ]),
];

const PHYSICS_OCR_A = [
  t("ocr_p_prac", "Development of practical skills", [
    "Planning investigations", "Implementing procedures", "Analysis of data",
    "Evaluation of results", "Uncertainties in measurement", "Graphical techniques",
  ]),
  t("ocr_p_found", "Foundations of physics", [
    "Physical quantities & units", "Scalars and vectors", "Making measurements",
    "Estimations", "Systematic & random errors", "Derived units",
  ]),
  t("ocr_p_motion", "Forces & motion: kinematics", [
    "Displacement, velocity, acceleration", "SUVAT equations", "Graphs of motion",
    "Projectile motion", "Stopping distances", "Free fall",
  ]),
  t("ocr_p_dynamics", "Forces & motion: dynamics", [
    "Newton's laws of motion", "Momentum & impulse", "Conservation of momentum",
    "Work energy power", "Efficiency", "Car safety",
  ]),
  t("ocr_p_materials", "Materials", [
    "Density", "Hooke's law", "Stress and strain",
    "Young modulus", "Elastic strain energy", "Plastic deformation",
  ]),
  t("ocr_p_charge", "Charge & current", [
    "Electric current as flow of charge", "Kirchhoff's first law", "Mean drift velocity",
    "Kirchhoff's second law", "Circuit symbols", "Series and parallel",
  ]),
  t("ocr_p_energy_power", "Energy, power & resistance", [
    "PD, EMF & internal resistance", "Resistance & Ohm's law", "I–V characteristics",
    "Resistivity", "Power & energy in circuits", "Potential dividers",
  ]),
  t("ocr_p_waves", "Waves", [
    "Wave motion properties", "Transverse & longitudinal", "EM spectrum",
    "Polarisation", "Refraction & TIR", "Superposition & interference",
  ]),
  t("ocr_p_quantum", "Quantum physics", [
    "Photons", "Photoelectric effect", "Wave-particle duality",
    "Electron diffraction", "Energy levels", "Line spectra",
  ]),
  t("ocr_p_thermal", "Thermal physics", [
    "Temperature & absolute zero", "Solid, liquid, gas internal energy",
    "Specific heat capacity", "Specific latent heat", "Ideal gases", "Kinetic theory",
  ]),
  t("ocr_p_circ", "Circular motion & oscillations", [
    "Radians & angular velocity", "Centripetal force", "SHM definition",
    "SHM equations & graphs", "Energy in SHM", "Damping & resonance",
  ]),
  t("ocr_p_grav", "Gravitational fields", [
    "Point & spherical masses", "Newton's law of gravitation", "Field strength g",
    "Gravitational potential", "Planetary motion", "Satellites",
  ]),
  t("ocr_p_astro", "Astrophysics & cosmology", [
    "Stars as black bodies", "Stellar luminosity", "HR diagram",
    "Stellar evolution", "luminosities & distances", "Big Bang evidence",
  ]),
  t("ocr_p_capacitors", "Capacitors", [
    "Capacitance definition", "Energy stored", "Charging curves",
    "Discharging curves", "Time constant", "Capacitor uses",
  ]),
  t("ocr_p_fields_em", "Electric & magnetic fields", [
    "Coulomb's law", "Uniform electric fields", "Motion of charges in fields",
    "Magnetic force on wires & charges", "Electromagnetic induction", "Transformers",
  ]),
  t("ocr_p_nuclear", "Nuclear & particle physics", [
    "Atomic structure", "The nucleus", "Fundamental particles",
    "Radioactivity", "Nuclear decay equations", "Binding energy, fission & fusion",
  ]),
  t("ocr_p_medical", "Medical imaging (option themes)", [
    "X-rays production", "CAT scanning", "PET scanning",
    "Ultrasound", "MRI principles", "Radiation dose & safety",
  ]),
];

// ─── Mathematics ─────────────────────────────────────────────────────────────

const MATHS_EDEXCEL = [
  t("ma_pure_algebra", "Pure: Algebra & functions", [
    "Indices & surds", "Quadratic functions & graphs", "Simultaneous equations",
    "Inequalities (linear & quadratic)", "Polynomials & factor theorem", "Graphs & transformations",
  ]),
  t("ma_pure_coord", "Pure: Coordinate geometry", [
    "Straight line equations", "Parallel & perpendicular", "Circle equations",
    "Tangents & normals to circles", "Intersection of line & curve", "Midpoints & distance",
  ]),
  t("ma_pure_trig", "Pure: Trigonometry", [
    "Sine & cosine rules", "Trig graphs", "Exact values",
    "Trig identities (sin²+cos²)", "Solving trig equations", "Radians & arc length",
  ]),
  t("ma_pure_exlog", "Pure: Exponentials & logarithms", [
    "Exponential functions", "Laws of logarithms", "Solving equations with logs",
    "Natural log & e^x", "Modelling with exp/log", "Changing base",
  ]),
  t("ma_pure_diff", "Pure: Differentiation", [
    "First principles idea", "Standard derivatives", "Product, quotient, chain rules",
    "Second derivatives", "Tangents & normals", "Max/min & rates of change",
  ]),
  t("ma_pure_int", "Pure: Integration", [
    "Reverse of differentiation", "Definite integrals", "Area under a curve",
    "Integration by substitution", "Integration by parts", "Partial fractions integration",
  ]),
  t("ma_pure_vectors", "Pure: Vectors", [
    "2D vector notation", "Magnitude & direction", "Position vectors",
    "Unit vectors i, j", "Scalar product", "3D vectors intro",
  ]),
  t("ma_pure_seq", "Pure: Sequences & series", [
    "Arithmetic sequences", "Geometric sequences", "Sigma notation",
    "Binomial expansion (positive integer n)", "Binomial for any n", "Sequences modelling",
  ]),
  t("ma_pure_num", "Pure: Numerical methods", [
    "Change of sign methods", "Iterative methods", "Newton–Raphson",
    "Staircase & cobweb diagrams", "Numerical integration (trap rule)", "Error bounds",
  ]),
  t("ma_pure_param", "Pure: Parametric equations", [
    "Parametric form of curves", "Converting to cartesian", "Differentiation of parametrics",
    "Integration of parametrics", "Parametric modelling", "Tangents to parametric curves",
  ]),
  t("ma_pure_de", "Pure: Differential equations", [
    "Forming DEs from context", "Separating variables", "Particular solutions",
    "Exponential growth & decay models", "Connected rates of change", "Verifying solutions",
  ]),
  t("ma_stats_data", "Stats: Data presentation & interpretation", [
    "Measures of location", "Measures of spread", "Coding data",
    "Outliers & box plots", "Histograms & cumulative frequency", "Correlation & regression",
  ]),
  t("ma_stats_prob", "Stats: Probability", [
    "Sample space & Venn diagrams", "Mutually exclusive events", "Independent events",
    "Tree diagrams", "Conditional probability", "Probability formulae",
  ]),
  t("ma_stats_dist", "Stats: Statistical distributions", [
    "Discrete distributions", "Binomial distribution", "Normal distribution",
    "Standardising (z-scores)", "Approximations", "Selecting a model",
  ]),
  t("ma_stats_hyp", "Stats: Hypothesis testing", [
    "Null & alternative hypotheses", "Binomial hypothesis tests", "Critical regions",
    "Normal mean tests (known σ)", "One- and two-tailed tests", "Interpreting p-values in context",
  ]),
  t("ma_mech_kin", "Mech: Quantities & kinematics", [
    "SI units in mechanics", "Distance vs displacement", "SUVAT in one dimension",
    "Velocity-time graphs", "Variable acceleration (calculus)", "Motion under gravity",
  ]),
  t("ma_mech_forces", "Mech: Forces & Newton's laws", [
    "Force diagrams", "Newton's laws", "Connected particles",
    "Pulleys", "Friction (F ≤ μR)", "Resultant forces",
  ]),
  t("ma_mech_proj", "Mech: Projectiles & moments", [
    "Projectile motion", "Range and maximum height", "Moments of a force",
    "Equilibrium of a rigid body", "Centres of mass (simple)", "Laminas",
  ]),
];

const MATHS_AQA = [
  t("aqa_m_proof", "Proof", [
    "Proof by deduction", "Proof by exhaustion", "Disproof by counter-example",
    "Proof by contradiction", "Language of proof", "Structured arguments",
  ]),
  t("aqa_m_algebra", "Algebra & functions", [
    "Laws of indices & surds", "Quadratic equations & graphs", "Simultaneous equations",
    "Inequalities", "Polynomial division & factor theorem", "Functions, domain & range",
  ]),
  t("aqa_m_coord", "Coordinate geometry", [
    "Equation of a straight line", "Circle geometry", "Tangents to circles",
    "Parametric equations", "Converting parametrics", "Intersection problems",
  ]),
  t("aqa_m_seq", "Sequences & series", [
    "Arithmetic sequences & series", "Geometric sequences & series", "Binomial expansion",
    "Sigma notation", "Recurrence relations", "Modelling with sequences",
  ]),
  t("aqa_m_trig", "Trigonometry", [
    "Trig ratios & graphs", "Identities", "Solving equations in degrees & radians",
    "Radians, arc length, sector area", "Small angle approximations", "Trig form of addition formulae",
  ]),
  t("aqa_m_exlog", "Exponentials & logarithms", [
    "Exponential functions", "Logarithm laws", "Solving exponential equations",
    "Natural logarithms", "Modelling growth & decay", "Log graphs for linearisation",
  ]),
  t("aqa_m_diff", "Differentiation", [
    "Differentiating polynomials", "Chain, product, quotient rules", "Trig, exp & ln derivatives",
    "Second derivatives & concavity", "Implicit differentiation", "Connected rates of change",
  ]),
  t("aqa_m_int", "Integration", [
    "Indefinite integration", "Definite integrals & area", "Integration by substitution",
    "Integration by parts", "Partial fractions", "Trapezium rule",
  ]),
  t("aqa_m_num", "Numerical methods", [
    "Change of sign", "Fixed-point iteration", "Newton–Raphson method",
    "Graphical interpretation", "Numerical integration", "Error considerations",
  ]),
  t("aqa_m_vectors", "Vectors", [
    "Vector basics in 2D/3D", "Magnitude", "Position vectors",
    "Scalar product", "Angle between vectors", "Vector equation of a line",
  ]),
  t("aqa_m_de", "Differential equations", [
    "First-order separable DEs", "Particular solutions", "Modelling with DEs",
    "Exponential models", "Constructing DEs", "Verifying solutions",
  ]),
  t("aqa_m_stats_data", "Stats: Data & probability", [
    "Sampling techniques", "Data presentation", "Measures of location/spread",
    "Correlation & regression", "Probability rules", "Conditional probability",
  ]),
  t("aqa_m_stats_dist", "Stats: Distributions & hypothesis tests", [
    "Binomial distribution", "Normal distribution", "Hypothesis testing (binomial)",
    "Hypothesis testing (normal mean)", "Critical values & regions", "Interpreting conclusions",
  ]),
  t("aqa_m_mech_kin", "Mech: Kinematics", [
    "Constant acceleration", "Variable acceleration with calculus", "Graphs of motion",
    "Projectiles", "Vertical motion under gravity", "Vectors in kinematics",
  ]),
  t("aqa_m_mech_force", "Mech: Forces & motion", [
    "Newton's laws", "Forces as vectors", "Connected particles",
    "Friction", "Moments", "Equilibrium",
  ]),
];

// ─── Chemistry ───────────────────────────────────────────────────────────────

const CHEM_EDEXCEL = [
  t("ch_atomic", "Atomic structure & periodic table", [
    "Structure of the atom", "Mass spectrometry & isotopes", "Electron configuration",
    "Ionisation energies", "Periodic trends", "Periodic table organisation",
  ]),
  t("ch_bonding", "Bonding & structure", [
    "Ionic bonding", "Covalent bonding", "Metallic bonding",
    "Shapes of molecules (VSEPR)", "Electronegativity & polarity", "Intermolecular forces",
  ]),
  t("ch_amount", "Amount of substance", [
    "The mole & Avogadro", "Empirical & molecular formulae", "Reacting masses & yields",
    "Gas volumes (molar gas volume)", "Concentrations & dilutions", "Titration calculations",
  ]),
  t("ch_redox", "Redox chemistry", [
    "Oxidation numbers", "Half-equations", "Balancing redox equations",
    "Oxidising & reducing agents", "Displacement reactions", "Redox titrations",
  ]),
  t("ch_inorganic1", "Inorganic chemistry: Groups 1, 2 & 7", [
    "Group 2 trends", "Group 2 reactions", "Group 7 trends",
    "Halide ion tests", "Disproportionation", "Uses of Group 2 compounds",
  ]),
  t("ch_inorganic2", "Inorganic chemistry: Transition metals", [
    "d-block characteristics", "Variable oxidation states", "Complex ions & ligands",
    "Colour in transition metal ions", "Catalysts", "Reactions of aqueous ions",
  ]),
  t("ch_energetics", "Energetics / thermochemistry", [
    "Enthalpy change definitions", "Calorimetry", "Hess's law cycles",
    "Bond enthalpies", "Mean bond enthalpy limitations", "Enthalpy profiles",
  ]),
  t("ch_kinetics", "Kinetics", [
    "Collision theory", "Maxwell–Boltzmann distribution", "Activation energy",
    "Effect of concentration & pressure", "Effect of temperature & catalysts", "Rate equations intro",
  ]),
  t("ch_eqm", "Chemical equilibria", [
    "Dynamic equilibrium", "Le Chatelier's principle", "Equilibrium constant Kc",
    "Kc calculations", "Effect of conditions on K", "Industrial equilibria (Haber etc.)",
  ]),
  t("ch_acid", "Acid–base equilibria", [
    "Brønsted–Lowry acids/bases", "pH calculations strong acids/bases", "Weak acids & Ka",
    "Kw and pH of water", "Buffer solutions", "Titration curves & indicators",
  ]),
  t("ch_organic1", "Organic chemistry: fundamentals", [
    "Nomenclature (IUPAC)", "Formulae types", "Isomerism (structural & stereo)",
    "Homologous series", "Reaction mechanisms intro", "Bond fission (homo/hetero)",
  ]),
  t("ch_organic2", "Organic: alkanes, alkenes, halogenoalkanes", [
    "Alkane combustion & free-radical substitution", "Alkene addition reactions",
    "Electrophilic addition mechanism", "Halogenoalkane nucleophilic substitution",
    "Elimination reactions", "Polymers from alkenes",
  ]),
  t("ch_organic3", "Organic: alcohols, carbonyls & carboxylic acids", [
    "Alcohol classification & reactions", "Oxidation of alcohols", "Aldehydes & ketones",
    "Carboxylic acids & derivatives", "Esters", "Acyl chlorides & acid anhydrides",
  ]),
  t("ch_organic4", "Organic: nitrogen compounds & aromatics", [
    "Amines", "Amino acids & peptides", "Amides",
    "Aromatic chemistry (benzene)", "Electrophilic substitution on benzene", "Phenols",
  ]),
  t("ch_analysis", "Analytical techniques", [
    "Mass spectrometry of organics", "Infrared spectroscopy", "NMR spectroscopy (¹H / ¹³C)",
    "Chromatography (TLC, GC)", "Combined spectral analysis", "Elemental analysis",
  ]),
  t("ch_organic5", "Organic synthesis & mechanisms mastery", [
    "Synthetic routes multi-step", "Reaction conditions selection", "Purification techniques",
    "Yield & atom economy", "Mechanism classification", "Chirality in synthesis",
  ]),
];

const CHEM_AQA = [
  t("aqa_c_atomic", "Atomic structure", [
    "Fundamental particles", "Mass number & isotopes", "Time-of-flight mass spectrometry",
    "Electron configuration", "Ionisation energy", "Periodic trends in IE",
  ]),
  t("aqa_c_amount", "Amount of substance", [
    "Relative atomic/molecular mass", "The mole", "Ideal gas equation",
    "Empirical & molecular formula", "Percentage yield & atom economy", "Titration calculations",
  ]),
  t("aqa_c_bonding", "Bonding", [
    "Ionic bonding", "Nature of covalent bond", "Metallic bonding",
    "Shapes of simple molecules & ions", "Bond polarity", "Forces between molecules",
  ]),
  t("aqa_c_energetics", "Energetics", [
    "Enthalpy change", "Calorimetry", "Applications of Hess's law",
    "Bond enthalpies", "Mean bond enthalpies", "Enthalpy profile diagrams",
  ]),
  t("aqa_c_kinetics", "Kinetics", [
    "Collision theory", "Maxwell–Boltzmann distribution", "Effect of temperature",
    "Effect of concentration & pressure", "Catalysts", "Rate equations & orders (A-level)",
  ]),
  t("aqa_c_eqm", "Chemical equilibria & Kp", [
    "Dynamic equilibrium", "Le Chatelier", "Equilibrium constant Kc",
    "Partial pressures & Kp", "Effect of T and p on K", "Equilibrium calculations",
  ]),
  t("aqa_c_redox", "Redox & electrode potentials", [
    "Oxidation states", "Half-equations", "Redox titrations",
    "Electrochemical cells", "Standard electrode potentials", "Electrochemical series predictions",
  ]),
  t("aqa_c_thermo", "Thermodynamics (A-level)", [
    "Born–Haber cycles", "Enthalpies of solution & hydration", "Entropy changes",
    "Gibbs free energy ΔG", "Feasibility of reactions", "Effect of temperature on feasibility",
  ]),
  t("aqa_c_acids", "Acids and bases", [
    "Brønsted–Lowry theory", "pH of strong acids/bases", "Weak acids and Ka",
    "pH curves", "Indicators", "Buffer solutions",
  ]),
  t("aqa_c_periodicity", "Periodicity", [
    "Classification of elements", "Physical properties of Period 3",
    "Period 3 oxides reactions", "Acid–base character of oxides", "Trends across a period", "Periodicity overview",
  ]),
  t("aqa_c_g2_g7", "Group 2 & Group 7 (halogens)", [
    "Group 2 trends", "Group 2 reactions with water/oxygen", "Uses of Group 2 compounds",
    "Halogen trends", "Halide identification tests", "Disproportionation of chlorine",
  ]),
  t("aqa_c_tm", "Transition metals", [
    "General properties of transition metals", "Complex formation", "Shapes of complex ions",
    "Formation of coloured ions", "Variable oxidation states", "Catalysis",
  ]),
  t("aqa_c_aq", "Reactions of aqueous ions", [
    "Metal–aqua ions acidity", "Hydrolysis reactions", "Ligand substitution",
    "Amphoteric behaviour", "Tests for metal ions", "Transition metal aqueous chemistry summary",
  ]),
  t("aqa_c_org_intro", "Introduction to organic chemistry", [
    "Nomenclature", "Reaction mechanisms", "Isomerism",
    "Fractional distillation of crude oil", "Petroleum fractions", "Hazard & risk",
  ]),
  t("aqa_c_alkanes", "Alkanes", [
    "Fractional distillation", "Cracking", "Combustion",
    "Free-radical substitution", "Chlorination of methane", "Environmental chemistry of fuels",
  ]),
  t("aqa_c_halogeno", "Halogenoalkanes", [
    "Nucleophilic substitution", "Elimination", "Ozone depletion",
    "Uses of halogenoalkanes", "Mechanism conditions", "Comparing primary/secondary/tertiary",
  ]),
  t("aqa_c_alkenes", "Alkenes", [
    "Structure & bonding (σ/π)", "Electrophilic addition", "Addition polymers",
    "E–Z isomerism", "Industrial hydration", "Testing for unsaturation",
  ]),
  t("aqa_c_alcohols", "Alcohols", [
    "Production of alcohols", "Oxidation of alcohols", "Elimination to alkenes",
    "Alcohol classification", "Uses of alcohols", "Tests for alcohols/carbonyls intro",
  ]),
  t("aqa_c_org_analysis", "Organic analysis", [
    "Test-tube reactions", "Mass spectrometry", "Infrared spectroscopy",
    "¹H NMR", "¹³C NMR", "Combined techniques for identification",
  ]),
  t("aqa_c_optics", "Optical isomerism", [
    "Chirality", "Optical isomers", "Racemic mixtures",
    "Plane-polarised light", "Pharmaceutical importance", "Drawing enantiomers",
  ]),
  t("aqa_c_aldehydes", "Aldehydes & ketones", [
    "Nucleophilic addition (HCN)", "Reduction of carbonyls", "Oxidation of aldehydes",
    "Brady's reagent (2,4-DNP)", "Tollen's reagent", "Distinguishing tests",
  ]),
  t("aqa_c_carboxylic", "Carboxylic acids & derivatives", [
    "Carboxylic acid reactions", "Esters", "Acylation",
    "Acid anhydrides", "Acyl chlorides", "Biodiesel & fats/oils",
  ]),
  t("aqa_c_aromatic", "Aromatic chemistry", [
    "Bonding in benzene", "Thermochemical evidence", "Electrophilic substitution",
    "Nitration of benzene", "Friedel–Crafts", "Phenols",
  ]),
  t("aqa_c_amines", "Amines", [
    "Preparation of amines", "Base properties", "Nucleophilic properties",
    "Amides", "Amino acids", "Proteins & DNA links",
  ]),
  t("aqa_c_polymers", "Polymers", [
    "Addition polymers", "Condensation polymers", "Polyesters & polyamides",
    "Biodegradability", "Polymer properties", "Repeating units",
  ]),
  t("aqa_c_amino", "Amino acids, proteins & DNA", [
    "Amino acid structure", "Isoelectric points", "Peptide links",
    "Protein structure levels", "Enzymes as proteins", "DNA structure & replication link",
  ]),
  t("aqa_c_synthesis", "Organic synthesis", [
    "Synthetic routes", "Multi-step pathways", "Purification",
    "Percentage yield", "Atom economy", "Identifying functional groups strategically",
  ]),
  t("aqa_c_structure_det", "Structure determination", [
    "Elemental analysis", "Mass spectra fragmentation", "IR key absorptions",
    "NMR chemical shift tables", "Splitting patterns", "Putting spectra together",
  ]),
];

const CHEM_OCR_A = [
  t("ocr_c_atoms", "Atoms & electrons", [
    "Atomic structure", "Isotopes & mass spectrometry", "Electron configuration",
    "Ionisation energy", "Atomic orbitals", "Periodic table structure",
  ]),
  t("ocr_c_compounds", "Compounds, formulae & equations", [
    "Formulae & equations", "The mole", "Empirical formulae",
    "Reacting quantities", "Percentage yield", "Atom economy",
  ]),
  t("ocr_c_amount", "Amount of substance & titration", [
    "Concentrations", "Gas calculations", "Acid–base titrations",
    "Redox titrations", "Water of crystallisation", "Uncertainties in titration",
  ]),
  t("ocr_c_acid_base", "Acids, redox & electrons", [
    "Acids bases & salts", "Redox reactions", "Oxidation numbers",
    "Electron transfer", "Half-equations", "Disproportionation",
  ]),
  t("ocr_c_bonding", "Bonding & structure", [
    "Ionic bonding & lattices", "Covalent bonding", "Shapes of molecules",
    "Electronegativity & polarity", "Intermolecular forces", "Giant structures & properties",
  ]),
  t("ocr_c_periodicity", "The periodic table & periodicity", [
    "Periodicity of physical properties", "Ionisation energy trends", "Group 2",
    "Group 7", "Qualitative analysis", "Redox chemistry of Groups 2/7",
  ]),
  t("ocr_c_enthalpy", "Enthalpy changes", [
    "Enthalpy definitions", "Calorimetry", "Hess' law",
    "Bond enthalpies", "Enthalpy profile diagrams", "Limitations of experimental methods",
  ]),
  t("ocr_c_rates", "Reaction rates", [
    "Collision theory", "Boltzmann distribution", "Catalysts",
    "Orders of reaction", "Rate equations", "Rate-determining step",
  ]),
  t("ocr_c_eqm", "Equilibria", [
    "Dynamic equilibrium", "Kc", "Kp",
    "Le Chatelier", "Equilibrium calculations", "Acid–base equilibria & pH (A-level)",
  ]),
  t("ocr_c_org_basic", "Basic concepts of organic chemistry", [
    "Nomenclature", "Formula representation", "Isomerism",
    "Reaction mechanisms", "Bond fission", "Functional groups overview",
  ]),
  t("ocr_c_hydrocarbons", "Hydrocarbons", [
    "Alkanes", "Alkenes", "Electrophilic addition",
    "Addition polymers", "Electrophilic substitution of benzene", "Aromatic stability",
  ]),
  t("ocr_c_halo_alc", "Halogenoalkanes & alcohols", [
    "Halogenoalkane reactions", "Nucleophilic substitution", "Alcohol reactions",
    "Oxidation of alcohols", "Elimination", "Practical organic techniques",
  ]),
  t("ocr_c_org_synth", "Organic synthesis & analysis", [
    "Synthetic routes", "Infrared spectroscopy", "Mass spectrometry",
    "NMR spectroscopy", "Chromatography", "Combined analysis",
  ]),
  t("ocr_c_pH", "pH and buffers", [
    "Strong & weak acids", "Ka and pKa", "Kw",
    "Buffer calculations", "Titration curves", "Indicators",
  ]),
  t("ocr_c_enthalpy_entropy", "Enthalpy & entropy", [
    "Lattice enthalpy", "Born–Haber cycles", "Enthalpies of solution",
    "Entropy", "Free energy", "Feasibility",
  ]),
  t("ocr_c_redox_em", "Redox & electrode potentials", [
    "Electrochemical cells", "Standard electrode potentials", "Cell predictions",
    "Storage cells", "Fuel cells", "Redox titration calculations",
  ]),
  t("ocr_c_tm", "Transition elements", [
    "d-block properties", "Complex ions", "Ligand substitution",
    "Precipitation reactions", "Redox of transition metals", "Catalysis",
  ]),
  t("ocr_c_org_nitrogen", "Nitrogen compounds & polymers", [
    "Amines", "Amino acids", "Amides",
    "Chirality", "Condensation polymers", "Polypeptides & proteins",
  ]),
];

// ─── Biology ─────────────────────────────────────────────────────────────────

const BIO_EDEXCEL = [
  t("bio_cell", "Cell structure", [
    "Eukaryotic organelles", "Prokaryotic cells", "Microscopy & magnification",
    "Cell specialisation", "Viruses as non-cells", "Fractionation & ultrastructure",
  ]),
  t("bio_molecules", "Biological molecules", [
    "Water properties", "Carbohydrates", "Lipids",
    "Proteins & structure levels", "Biochemical tests", "Inorganic ions",
  ]),
  t("bio_enzymes", "Enzymes", [
    "Enzyme structure & specificity", "Induced fit / lock & key", "Factors affecting rate",
    "Inhibitors (competitive / non)", "Enzyme practicals", "Intracellular vs extracellular",
  ]),
  t("bio_membranes", "Membranes & transport", [
    "Fluid mosaic model", "Diffusion", "Osmosis & water potential",
    "Active transport", "Co-transport", "Factors affecting permeability",
  ]),
  t("bio_dna", "DNA, replication & gene expression", [
    "DNA & RNA structure", "Semi-conservative replication", "Transcription",
    "Translation", "Genetic code features", "Gene mutations",
  ]),
  t("bio_cell_div", "Cell division & organisation", [
    "Cell cycle", "Mitosis stages", "Meiosis & variation",
    "Stem cells", "Tissues organs systems", "Cancer & cell cycle control",
  ]),
  t("bio_gas_exchange", "Gas exchange", [
    "Surface area to volume ratio", "Gas exchange in mammals", "Gas exchange in fish",
    "Gas exchange in insects", "Gas exchange in plants", "Spirometer & lung volumes",
  ]),
  t("bio_transport_anim", "Transport in animals", [
    "Heart structure", "Cardiac cycle", "Blood vessels",
    "Blood & tissue fluid", "Oxygen dissociation curves", "Circulation patterns",
  ]),
  t("bio_transport_plant", "Transport in plants", [
    "Xylem structure & water transport", "Transpiration", "Cohesion-tension theory",
    "Phloem & translocation", "Mass flow hypothesis", "Potometer practicals",
  ]),
  t("bio_immunity", "Infection, immunity & forensics themes", [
    "Pathogens", "Non-specific defences", "Specific immune response",
    "Antibodies & antigens", "Vaccination", "Antibiotics & resistance",
  ]),
  t("bio_biodiversity", "Biodiversity & classification", [
    "Species & taxonomy", "Biodiversity measures", "Adaptations",
    "Natural selection", "Speciation", "Conservation",
  ]),
  t("bio_photosyn", "Photosynthesis", [
    "Chloroplast structure", "Light-dependent reaction", "Light-independent reaction (Calvin)",
    "Limiting factors", "Photosynthesis practicals", "GP, TP, RuBP",
  ]),
  t("bio_resp", "Respiration", [
    "Glycolysis", "Link reaction", "Krebs cycle",
    "Oxidative phosphorylation", "Anaerobic respiration", "Respiratory substrates",
  ]),
  t("bio_energy_eco", "Energy & ecosystems", [
    "Food chains & webs", "Energy transfer efficiency", "Net productivity",
    "Nutrient cycles (N, C)", "Succession", "Human impacts on ecosystems",
  ]),
  t("bio_homeostasis", "Homeostasis", [
    "Negative feedback", "Thermoregulation", "Blood glucose control",
    "Hormones (insulin/glucagon)", "Kidney structure", "Osmoregulation & ADH",
  ]),
  t("bio_nervous", "Nervous system & response", [
    "Neurones", "Action potentials", "Synapses",
    "Reflexes", "The brain (overview)", "Plant responses (tropisms)",
  ]),
  t("bio_genetics", "Genetics & inheritance", [
    "Mendelian monohybrid", "Dihybrid crosses", "Sex linkage",
    "Codominance & multiple alleles", "Epistasis", "Chi-squared tests",
  ]),
  t("bio_gene_tech", "Gene technology", [
    "PCR", "Gel electrophoresis", "Genetic engineering / recombinant DNA",
    "Gene therapy overview", "DNA sequencing", "Ethical issues",
  ]),
];

const BIO_AQA = [
  t("aqa_b1", "Biological molecules", [
    "Monomers and polymers", "Carbohydrates", "Lipids",
    "Proteins", "Enzymes", "Nucleic acids",
    "ATP", "Water", "Inorganic ions",
  ]),
  t("aqa_b2_cells", "Cells", [
    "Cell structure", "Microscopy", "Cell specialisation",
    "Cell cycle & mitosis", "Binary fission & viruses", "Cell transport methods",
  ]),
  t("aqa_b2_immune", "Cell recognition & immune system", [
    "Antigen & immune response", "Phagocytosis", "T cells & B cells",
    "Antibodies", "Vaccination", "HIV",
  ]),
  t("aqa_b3_exchange", "Exchange of substances", [
    "Surface area to volume", "Gas exchange", "Digestion & absorption",
    "Mass transport in animals", "Mass transport in plants", "Haemoglobin",
  ]),
  t("aqa_b4_dna", "DNA, genes & protein synthesis", [
    "DNA & chromosomes", "Genes & the genetic code", "DNA and protein synthesis",
    "Gene mutations", "Meiosis", "Genetic diversity",
  ]),
  t("aqa_b4_diversity", "Genetic diversity & classification", [
    "Genetic diversity by mutation & meiosis", "Investigating diversity", "Classification principles",
    "Courtship behaviour", "Biodiversity within a community", "Species richness & index of diversity",
  ]),
  t("aqa_b5_photo", "Photosynthesis", [
    "Light-dependent reaction", "Light-independent reaction", "Limiting factors",
    "Chloroplast structure", "Calvin cycle intermediates", "Required practical photosynthesis",
  ]),
  t("aqa_b5_resp", "Respiration", [
    "Glycolysis", "Link reaction & Krebs", "Oxidative phosphorylation",
    "Anaerobic respiration", "Respiratory quotients", "Mitochondrial structure",
  ]),
  t("aqa_b5_energy", "Energy & ecosystems", [
    "Food chains energy transfer", "Gross & net productivity", "Nutrient cycles",
    "Use of fertilisers", "Environmental issues", "Farming practices",
  ]),
  t("aqa_b6_response", "Response to stimuli", [
    "Survival & response", "Plant growth factors", "Receptors",
    "Control of heart rate", "Nervous coordination", "Skeletal muscles",
  ]),
  t("aqa_b6_homeo", "Homeostasis", [
    "Principles of homeostasis", "Feedback mechanisms", "Blood glucose control",
    "Diabetes", "The kidney & osmoregulation", "The liver & urea",
  ]),
  t("aqa_b7_inherit", "Genetics & inheritance", [
    "Inheritance", "Linkage", "Epistasis",
    "Chi-squared test", "Populations & allele frequencies", "Hardy–Weinberg principle",
  ]),
  t("aqa_b7_evol", "Populations, evolution & ecosystems", [
    "Variation", "Natural selection & evolution", "Speciation",
    "Populations in ecosystems", "Succession", "Conservation of habitats",
  ]),
  t("aqa_b8_gene", "Control of gene expression", [
    "Mutation", "Stem cells", "Regulation of transcription & translation",
    "Epigenetic control", "Gene expression & cancer", "Genome projects",
  ]),
  t("aqa_b8_tech", "Gene technologies", [
    "Recombinant DNA technology", "Gene counselling", "Genetic fingerprinting",
    "DNA probes", "Diagnosing genetic conditions", "Evaluating uses of gene tech",
  ]),
];

// ─── Economics ───────────────────────────────────────────────────────────────

const ECON_EDEXCEL = [
  t("ec_t1_nature", "Theme 1: Nature of economics", [
    "Economics as a social science", "Positive & normative statements", "The economic problem",
    "PPCs", "Specialisation & division of labour", "Free market, mixed & command economies",
  ]),
  t("ec_t1_demand", "Theme 1: How markets work — demand", [
    "Rational decision making", "Demand curve", "Price, income & cross elasticities",
    "Utility theory intro", "Consumer surplus", "Factors shifting demand",
  ]),
  t("ec_t1_supply", "Theme 1: How markets work — supply & price", [
    "Supply curve", "Price elasticity of supply", "Producer surplus",
    "Price mechanism", "Functions of price", "Indirect taxes & subsidies",
  ]),
  t("ec_t1_failure", "Theme 1: Market failure", [
    "Types of market failure", "Externalities (positive & negative)", "Public goods",
    "Information gaps", "Merit & demerit goods", "Tragedy of the commons",
  ]),
  t("ec_t1_gov", "Theme 1: Government intervention", [
    "Indirect taxes", "Subsidies", "Maximum & minimum prices",
    "Tradable pollution permits", "State provision & regulation", "Government failure",
  ]),
  t("ec_t2_measures", "Theme 2: Measures of economic performance", [
    "Economic growth (GDP, GNI)", "Inflation (CPI/RPI)", "Employment & unemployment",
    "Balance of payments", "Living standards & HDI", "Limitations of GDP",
  ]),
  t("ec_t2_adas", "Theme 2: Aggregate demand & supply", [
    "Components of AD", "AD curve shifts", "Short-run AS",
    "Long-run AS (classical & Keynesian)", "Equilibrium output & price level", "The multiplier",
  ]),
  t("ec_t2_policy", "Theme 2: National income & macroeconomic objectives", [
    "Circular flow of income", "Injections & withdrawals", "Output gaps",
    "Conflicts between objectives", "Phillips curve (short/long run)", "Macroeconomic trade-offs",
  ]),
  t("ec_t2_macro_pol", "Theme 2: Macroeconomic policies", [
    "Fiscal policy", "Monetary policy", "Supply-side policies",
    "Interest rates & QE", "Budget deficit/surplus", "Policy conflicts & evaluation",
  ]),
  t("ec_t3_business", "Theme 3: Business growth & objectives", [
    "Sizes & types of firms", "Business growth", "Demergers",
    "Business objectives", "Revenue", "Costs (short & long run)",
  ]),
  t("ec_t3_profit", "Theme 3: Revenues, costs & profits", [
    "Total, average & marginal revenue", "Economies & diseconomies of scale", "Normal & supernormal profit",
    "Shutdown points", "Efficiency concepts", "Profit maximisation rule",
  ]),
  t("ec_t3_market_str", "Theme 3: Market structures", [
    "Perfect competition", "Monopolistic competition", "Oligopoly",
    "Monopoly & monopoly power", "Price discrimination", "Contestability",
  ]),
  t("ec_t3_labour", "Theme 3: Labour market", [
    "Demand for labour", "Supply of labour", "Wage determination",
    "Current labour market issues", "Minimum wage", "Flexible labour markets",
  ]),
  t("ec_t3_gov_comp", "Theme 3: Government intervention (competition)", [
    "Government intervention to control mergers", "CMA & regulation of monopolies",
    "Promoting competition", "Protecting suppliers & employees", "Deregulation", "Privatisation & nationalisation",
  ]),
  t("ec_t4_global", "Theme 4: International economics", [
    "Globalisation", "Specialisation & trade", "Pattern of trade",
    "Terms of trade", "Trading blocs", "WTO",
  ]),
  t("ec_t4_poverty", "Theme 4: Poverty & inequality", [
    "Absolute & relative poverty", "Inequality measures (Gini)", "Causes of poverty",
    "Policies to reduce poverty", "Kuznets curve debates", "Impact of inequality on growth",
  ]),
  t("ec_t4_em_dev", "Theme 4: Emerging & developing economies", [
    "Measures of development", "Factors influencing growth & development", "HDI",
    "Market-oriented strategies", "Interventionist strategies", "Role of aid & debt relief",
  ]),
  t("ec_t4_frs", "Theme 4: Financial sector & role of the state", [
    "Role of financial markets", "Market failure in the financial sector", "Role of central banks",
    "Regulation of financial sector", "Public expenditure", "Taxation",
    "Public sector finances", "Macroeconomic policies in a global context",
  ]),
];

const ECON_AQA = [
  t("aqa_e_basic", "Economic methodology & the economic problem", [
    "The nature & purpose of economic activity", "Economic resources", "Scarcity & choice",
    "Production possibility diagrams", "Value judgements", "Scientific methods in economics",
  ]),
  t("aqa_e_price", "Price determination in a competitive market", [
    "The determinants of demand", "Price, income & cross elasticities of demand",
    "The determinants of supply", "Price elasticity of supply",
    "The determination of equilibrium price", "Consumer & producer surplus",
  ]),
  t("aqa_e_prod", "Production, costs & revenue", [
    "Production & productivity", "Specialisation & division of labour", "Costs of production",
    "Economies & diseconomies of scale", "Marginal, average & total revenue", "Profit",
  ]),
  t("aqa_e_comp", "Competitive & concentrated markets", [
    "Market structures", "Objectives of firms", "Perfect competition",
    "Monopoly & monopoly power", "Monopolistic competition", "Oligopoly",
    "Price discrimination", "Contestability",
  ]),
  t("aqa_e_labour", "The labour market", [
    "Demand for labour", "Supply of labour", "Wage determination pure competition",
    "Influence of trade unions", "National minimum wage", "Discrimination in labour markets",
  ]),
  t("aqa_e_dist", "Distribution of income & wealth", [
    "The distribution of income & wealth", "The problem of poverty", "Government policies",
    "Equality vs equity", "Gini coefficient", "Lorenz curve",
  ]),
  t("aqa_e_failure", "Market mechanism, market failure & government intervention", [
    "How markets & prices allocate resources", "Meaning of market failure",
    "Public goods & private goods", "Positive & negative externalities",
    "Merit & demerit goods", "Market imperfections",
    "Inequity", "Government intervention & government failure",
  ]),
  t("aqa_e_macro_perf", "The measurement of macroeconomic performance", [
    "Objectives of government policy", "Macroeconomic indicators", "Uses of index numbers",
    "Uses of national income data", "Real vs nominal", "Limitations of national income data",
  ]),
  t("aqa_e_ad", "How the macroeconomy works: AD", [
    "Circular flow of income", "Aggregate demand & its determinants", "Accelerator process",
    "The multiplier", "Aggregate demand curve", "Components: C, I, G, (X–M)",
  ]),
  t("aqa_e_as", "How the macroeconomy works: AS", [
    "Short-run aggregate supply", "Long-run aggregate supply", "Determinants of AS",
    "AD/AS analysis", "Economic cycle", "Output gaps",
  ]),
  t("aqa_e_growth", "Economic performance", [
    "Economic growth & the cycle", "Employment & unemployment", "Inflation & deflation",
    "Balance of payments on current account", "Possible conflicts between objectives", "Phillips curve",
  ]),
  t("aqa_e_fin", "Financial markets & monetary policy", [
    "Structure of financial markets", "Commercial banks & investment banks", "Central banks & monetary policy",
    "Interest rates", "Quantity of money & QE", "Regulation of the financial system",
  ]),
  t("aqa_e_fiscal", "Fiscal policy & supply-side", [
    "Fiscal policy instruments", "Government budget", "Supply-side policies",
    "Taxation principles", "Public expenditure", "Evaluating demand- & supply-side policies",
  ]),
  t("aqa_e_int", "The international economy", [
    "Globalisation", "Trade — comparative advantage", "Protectionism",
    "Balance of payments", "Exchange rate systems", "Economic growth & development",
  ]),
];

const ECON_OCR = [
  t("ocr_e_scarce", "Introduction to microeconomics: scarcity", [
    "The basic economic problem", "Opportunity cost", "PPCs",
    "Specialisation", "Markets vs planned economies", "Economic agents' objectives",
  ]),
  t("ocr_e_demand_supply", "How competitive markets work", [
    "Demand", "Supply", "Price determination",
    "Elasticities", "Consumer & producer surplus", "The price mechanism",
  ]),
  t("ocr_e_costs", "Business objectives & costs", [
    "Business objectives", "Fixed & variable costs", "Revenue",
    "Profit", "Economies of scale", "Efficiency",
  ]),
  t("ocr_e_structures", "Market structures", [
    "Perfect competition", "Monopoly", "Oligopoly",
    "Monopolistic competition", "Contestable markets", "Price competition & non-price",
  ]),
  t("ocr_e_labour", "Labour market", [
    "Demand & supply of labour", "Wage determination", "Labour market failure",
    "Minimum wages", "Trade unions", "Migration & labour",
  ]),
  t("ocr_e_mkt_fail", "Market failure & intervention", [
    "Externalities", "Public goods", "Information failure",
    "Merit/demerit goods", "Government intervention methods", "Government failure",
  ]),
  t("ocr_e_macro_ind", "Macroeconomic indicators", [
    "Economic growth", "Unemployment", "Inflation",
    "Balance of payments", "Income distribution", "Happiness & living standards",
  ]),
  t("ocr_e_adas", "Aggregate demand & aggregate supply", [
    "Components of AD", "SRAS & LRAS", "Macroeconomic equilibrium",
    "The multiplier", "The economic cycle", "Output gaps",
  ]),
  t("ocr_e_policy", "Macroeconomic policy", [
    "Fiscal policy", "Monetary policy", "Supply-side policy",
    "Policy conflicts", "Phillips curve", "Evaluating policy effectiveness",
  ]),
  t("ocr_e_trade", "International trade & globalisation", [
    "Why countries trade", "Comparative advantage", "Protectionism",
    "Exchange rates", "Globalisation impacts", "Trading blocs & WTO",
  ]),
  t("ocr_e_dev", "Development economics & inequality", [
    "Measures of development", "Causes of underdevelopment", "Strategies for development",
    "Aid & debt", "Inequality", "Sustainable development",
  ]),
  t("ocr_e_fin_role", "The financial sector", [
    "Role of money & finance", "Financial institutions", "Financial regulation",
    "Financial market failure", "Central bank role", "Crises & lessons",
  ]),
];

// ─── Computer Science ────────────────────────────────────────────────────────

const CS_AQA = [
  t("cs_prog_fund", "Programming fundamentals", [
    "Data types", "Variables & constants", "Input/output",
    "Arithmetic & Boolean operations", "String handling", "Random number generation",
  ]),
  t("cs_prog_constructs", "Programming constructs", [
    "Sequence", "Selection (if/switch)", "Iteration (for/while)",
    "Nested constructs", "Recursion", "Exception handling",
  ]),
  t("cs_prog_sub", "Subroutines & modularity", [
    "Procedures & functions", "Parameters (by value/reference)", "Local & global variables",
    "Stack frames", "Modular design", "Library routines",
  ]),
  t("cs_oop", "Object-oriented programming", [
    "Classes & objects", "Encapsulation", "Inheritance",
    "Polymorphism", "Aggregation & composition", "Abstract classes & interfaces",
  ]),
  t("cs_ds_basic", "Data structures (fundamental)", [
    "Arrays & multi-dimensional arrays", "Records / structs", "Files (text & binary)",
    "Queues", "Stacks", "Lists",
  ]),
  t("cs_ds_adv", "Data structures (advanced)", [
    "Hash tables & hashing", "Graphs (adj list/matrix)", "Trees & binary trees",
    "Binary search trees", "Heaps", "Dictionaries / maps",
  ]),
  t("cs_algo_search_sort", "Algorithms: searching & sorting", [
    "Linear search", "Binary search", "Bubble sort",
    "Merge sort", "Quick sort", "Comparison of sort efficiency",
  ]),
  t("cs_algo_graph", "Algorithms: graph & pathfinding", [
    "Tree traversal (pre/in/post)", "Breadth-first search", "Depth-first search",
    "Dijkstra's algorithm", "A* overview", "Shortest path applications",
  ]),
  t("cs_complexity", "Algorithm complexity", [
    "Time complexity", "Space complexity", "Big-O notation",
    "Best/average/worst case", "Comparing algorithms", "Tractable vs intractable",
  ]),
  t("cs_theory", "Theory of computation", [
    "Abstraction & automation", "Finite state machines", "Regular expressions",
    "Context-free languages / BNF", "Turing machines", "Halting problem",
  ]),
  t("cs_datarep", "Data representation", [
    "Number bases (bin/hex/dec)", "Two's complement & floating point", "Character sets (ASCII/Unicode)",
    "Images (bitmaps, resolution, colour depth)", "Sound sampling", "Compression (lossy/lossless)",
  ]),
  t("cs_comp_arch", "Computer systems & architecture", [
    "Hardware components", "Von Neumann architecture", "Fetch–decode–execute",
    "Processor performance factors", "Addressing modes", "Advanced architectures (multi-core, pipelining)",
  ]),
  t("cs_os", "Organisation & operating systems", [
    "OS role & functions", "Scheduling", "Memory management & paging",
    "Interrupts", "BIOS/UEFI", "Device drivers",
  ]),
  t("cs_lang", "Language translators", [
    "Machine code & assembly", "Compilers", "Interpreters",
    "Assemblers", "Bytecode & VMs", "Stages of compilation (lex/parse/code gen)",
  ]),
  t("cs_logic", "Logic & Boolean algebra", [
    "Logic gates", "Truth tables", "Boolean expressions",
    "Simplification & De Morgan", "Adders", "D-type flip-flops",
  ]),
  t("cs_net", "Networking", [
    "Network topologies", "Protocols (TCP/IP stack)", "IP addressing & DNS",
    "Client-server & peer-to-peer", "Wireless networking", "Network security threats & defences",
  ]),
  t("cs_db", "Databases", [
    "Relational model", "SQL (SELECT/INSERT/UPDATE/DELETE)", "Primary & foreign keys",
    "Normalisation (1NF–3NF)", "Entity relationship modelling", "Transaction processing ACID",
  ]),
  t("cs_bigdata", "Big data & functional programming core", [
    "Big data features (volume/velocity/variety)", "Fact-based model", "Distributed processing preview",
    "Functional paradigm concepts", "Higher-order functions", "Function composition",
  ]),
  t("cs_security", "Fundamentals of cyber security", [
    "Threats (malware, phishing, DoS)", "Social engineering", "Prevention measures",
    "Encryption (symmetric/asymmetric)", "Digital signatures & certificates", "Ethical hacking overview",
  ]),
  t("cs_legal", "Consequences of uses of computing", [
    "Data Protection legislation", "Computer Misuse Act", "Copyright & patents",
    "Ethical issues", "Environmental issues", "Privacy vs security debates",
  ]),
];

const CS_OCR = [
  t("ocr_cs_proc", "The characteristics of contemporary processors", [
    "ALU, CU, registers", "Fetch–decode–execute cycle", "CPU performance factors",
    "Pipelining", "Cache levels", "Von Neumann vs Harvard",
  ]),
  t("ocr_cs_types", "Processor types & architectures", [
    "CISC vs RISC", "GPUs", "Multicore & parallel systems",
    "Input, output & storage devices", "Magnetic/optical/solid-state", "Virtual storage",
  ]),
  t("ocr_cs_software", "Software & software development", [
    "OS functions", "Scheduling algorithms", "Memory management",
    "Interrupts", "BIOS", "Device drivers",
    "Applications software mirrors", "Utilities",
  ]),
  t("ocr_cs_apps", "Applications generation & translating", [
    "Open source vs closed source", "Translators: compilers/interpreters/assemblers",
    "Stages of compilation", "Linkers & loaders", "Libraries", "SDKs",
  ]),
  t("ocr_cs_exch", "Exchanging data", [
    "Compression (lossy/lossless)", "Encryption", "Hashing",
    "Databases relational", "SQL", "Normalisation",
    "Transaction processing", "ACID",
  ]),
  t("ocr_cs_net", "Networks & web technologies", [
    "Protocols & TCP/IP stack", "DNS", "LANs & WANs",
    "Circuit & packet switching", "Network security", "Firewalls & proxies",
    "HTML/CSS/JavaScript basics", "Search engine indexing overview",
  ]),
  t("ocr_cs_data_types", "Data types, structures & algorithms theory", [
    "Primitive data types", "Binary arithmetic", "Floating-point representation",
    "Bitwise operations", "Character sets", "Arrays, records, lists, tuples",
  ]),
  t("ocr_cs_structures", "Data structures", [
    "Linked lists", "Stacks", "Queues (inc. priority & circular)",
    "Graphs", "Trees", "Hash tables",
  ]),
  t("ocr_cs_bool", "Boolean algebra", [
    "Logic gates & circuits", "Truth tables", "Boolean algebra laws",
    "Karnaugh maps", "Half/full adders", "D-type flip-flops",
  ]),
  t("ocr_cs_legal", "Legal, moral, cultural & ethical issues", [
    "Data Protection Act / GDPR themes", "Computer Misuse Act", "Copyright Designs & Patents",
    "Regulation of Investigatory Powers", "Ethical issues in computing", "Cultural & environmental impact",
  ]),
  t("ocr_cs_thinking", "Elements of computational thinking", [
    "Thinking abstractly", "Thinking ahead", "Thinking procedurally",
    "Thinking logically", "Thinking concurrently", "Problem identification & decomposition",
  ]),
  t("ocr_cs_prob", "Problem solving & programming", [
    "Programming constructs", "Recursion", "Global & local variables",
    "Modularity & functions", "IDE features", "Object-oriented techniques",
  ]),
  t("ocr_cs_algo", "Algorithms", [
    "Analysis & design of algorithms", "Standard algorithms (search/sort)", "Complexity measures Big-O",
    "Path finding (Dijkstra, A*)", "Algorithm efficiency comparisons", "Algorithms for data structures",
  ]),
  t("ocr_cs_prog_tech", "Programming techniques advanced", [
    "List processing", "List comprehensions intuition", "Passing by value/reference? (as language)",
    "Exception handling", "Use of recursion vs iteration", "Writing maintainable code",
  ]),
  t("ocr_cs_comp_meth", "Computational methods", [
    "Features making problems solvable by computational methods", "Problem recognition",
    "Divide and conquer", "Backtracking", "Data mining overview", "Heuristics",
    "Performance modelling", "Visualisation of data",
  ]),
  t("ocr_cs_alg_des", "Algorithms design techniques", [
    "Strategy / structure charts", "Pseudocode", "Flowcharts",
    "Dry runs / trace tables", "Testing strategies", "Agile & waterfall overview",
  ]),
];

// ─── Psychology ──────────────────────────────────────────────────────────────

const PSYCH_AQA = [
  t("psy_social", "Social influence", [
    "Types of conformity", "Asch's research", "Zimbardo & conformity to social roles",
    "Milgram & obedience", "Explanations of obedience", "Resistance to social influence",
    "Minority influence", "Social change",
  ]),
  t("psy_memory", "Memory", [
    "Multi-store model", "Types of long-term memory", "Working memory model",
    "Explanations for forgetting", "Eyewitness testimony", "Cognitive interview",
  ]),
  t("psy_attach", "Attachment", [
    "Caregiver–infant interactions", "Schaffer stages", "Animal studies (Lorenz, Harlow)",
    "Explanations of attachment (learning / Bowlby)", "Ainsworth Strange Situation",
    "Cultural variations", "Bowlby's maternal deprivation", "Influence of early attachment",
  ]),
  t("psy_psychopath", "Psychopathology", [
    "Definitions of abnormality", "Phobias: characteristics & behavioural approach",
    "Depression: characteristics & cognitive approach", "OCD: characteristics & biological approach",
    "Behavioural treatments for phobias", "Cognitive treatments for depression",
    "Biological treatments for OCD",
  ]),
  t("psy_approach", "Approaches in psychology", [
    "Origins of psychology", "Behaviourist approach", "Social learning theory",
    "Cognitive approach", "Biological approach", "Psychodynamic approach",
    "Humanistic approach", "Comparison of approaches",
  ]),
  t("psy_biopsych", "Biopsychology", [
    "Divisions of the nervous system", "Neurons & synaptic transmission", "Endocrine system",
    "Fight or flight", "Localisation of function", "Lateralisation & split brain",
    "Plasticity & functional recovery", "Ways of studying the brain", "Biological rhythms",
  ]),
  t("psy_research", "Research methods", [
    "Experimental method", "Observational techniques", "Self-report techniques",
    "Correlations", "Case studies", "Content analysis",
    "Scientific processes & features of science", "Data handling & statistical testing",
  ]),
  t("psy_issues", "Issues and debates", [
    "Gender & culture bias", "Free will & determinism", "Nature–nurture",
    "Holism & reductionism", "Idiographic & nomothetic", "Ethical implications of research",
  ]),
  t("psy_rel", "Relationships (option)", [
    "Evolutionary explanations for partner preference", "Factors affecting attraction",
    "Theories of romantic relationships", "Virtual relationships",
    "Parasocial relationships", "Duck's phase model",
  ]),
  t("psy_gender", "Gender (option)", [
    "Sex and gender", "Androgyny & BSRI", "The role of chromosomes & hormones",
    "Atypical sex chromosome patterns", "Cognitive explanations", "Psychodynamic explanations",
    "Social learning theory & gender", "Atypical gender development",
  ]),
  t("psy_cognition", "Cognition and development (option)", [
    "Piaget's theory", "Vygotsky's theory", "Baillargeon & early infant abilities",
    "The development of social cognition (Selman)", "Theory of mind", "Mirror neuron system",
  ]),
  t("psy_schiz", "Schizophrenia (option)", [
    "Classification & diagnosis", "Biological explanations", "Psychological explanations",
    "Drug therapy", "CBT & family therapy", "Token economies",
    "Interactionist approach / diathesis–stress", "Reliability & validity of diagnosis",
  ]),
  t("psy_eating", "Eating behaviour (option)", [
    "Explanations for food preferences", "Neural & hormonal mechanisms", "Biological explanations for anorexia",
    "Psychological explanations for anorexia", "Biological explanations for obesity",
    "Psychological explanations for obesity", "Success & failure of dieting",
  ]),
  t("psy_stress", "Stress (option)", [
    "Physiology of stress", "Role of stress in illness", "Sources of stress",
    "Measuring stress", "Individual differences in stress", "Managing & coping with stress",
  ]),
  t("psy_aggression", "Aggression (option)", [
    "Neural & hormonal mechanisms", "Genetic factors", "Ethological explanation",
    "Evolutionary explanation", "Social psychological explanations", "Institutional aggression",
    "Media influences on aggression",
  ]),
  t("psy_forensic", "Forensic psychology (option)", [
    "Offender profiling", "Biological explanations of offending", "Psychological explanations of offending",
    "Dealing with offending behaviour", "Custodial sentencing", "Behaviour modification in custody",
    "Anger management", "Restorative justice",
  ]),
  t("psy_addiction", "Addiction (option)", [
    "Describing addiction", "Risk factors in addiction", "Explanations for nicotine addiction",
    "Explanations for gambling addiction", "Reducing addiction", "Theory of planned behaviour",
    "Prochaska's model of behaviour change",
  ]),
];

// ─── Further Mathematics ─────────────────────────────────────────────────────

const FP_MATH = [
  t("fm_complex", "Core pure: Complex numbers", [
    "Algebraic form a + bi", "Argand diagrams", "Modulus & argument",
    "Polar & exponential form", "De Moivre's theorem", "Roots of complex numbers",
    "Loci in the Argand plane", "Complex transformations",
  ]),
  t("fm_matrices", "Core pure: Matrices", [
    "Matrix operations", "Determinants 2×2 and 3×3", "Inverses",
    "Linear simultaneous equations", "Matrix transformations", "Invariant points & lines",
    "Eigenvalues & eigenvectors", "Diagonalisation",
  ]),
  t("fm_further_alg", "Core pure: Further algebra & functions", [
    "Roots of polynomials", "Relations between roots & coefficients", "Linear transformations of roots",
    "Method of differences", "Partial fractions (repeated & improper)", "Summation of series",
  ]),
  t("fm_further_calc", "Core pure: Further calculus", [
    "Volumes of revolution", "Mean value of a function", "Improper integrals",
    "Further differentiation (inverse trig)", "Further integration techniques", "Reduction formulae",
  ]),
  t("fm_polar", "Core pure: Polar coordinates", [
    "Polar coordinates & conversion", "Sketching polar curves", "Area using polar coordinates",
    "Tangents to polar curves", "Common polar curves (cardioid, rose)", "Intersection of polars",
  ]),
  t("fm_hyperbolic", "Core pure: Hyperbolic functions", [
    "Definitions of sinh, cosh, tanh", "Identities", "Inverse hyperbolics",
    "Differentiation of hyperbolics", "Integration of hyperbolics", "Integrals yielding inverse hyperbolics",
  ]),
  t("fm_de", "Core pure: Differential equations", [
    "First-order integrating factor", "Second-order homogeneous linear DEs", "Particular integrals",
    "Non-homogeneous second-order DEs", "Simple harmonic modelling", "Coupled first-order systems",
  ]),
  t("fm_vectors_3d", "Core pure: Vectors & 3D space", [
    "Vector product", "Scalar triple product", "Equation of a line in 3D",
    "Equation of a plane", "Angles between lines/planes", "Shortest distance line–line / point–plane",
  ]),
  t("fm_fs1", "Further statistics 1", [
    "Discrete probability distributions", "Poisson & binomial links", "Geometric & negative binomial",
    "Hypothesis testing (discrete)", "Chi-squared contingency tables", "Chi-squared goodness of fit",
    "Probability generating functions", "Quality of tests & Type I/II errors",
  ]),
  t("fm_fs2", "Further statistics 2", [
    "Continuous distributions (linear combinations)", "Continuous unmarked distributions", "t-distribution",
    "Confidence intervals", "Hypothesis testing continuous", "ANOVA overview",
  ]),
  t("fm_fm1", "Further mechanics 1", [
    "Momentum & impulse (vector)", "Work, energy & power", "Elastic strings & springs (Hooke)",
    "Elastic collisions in 1D", "Oblique impacts", "Successive impacts",
  ]),
  t("fm_fm2", "Further mechanics 2", [
    "Circular motion vertical circle", "Centres of mass", "Moments of inertia intro",
    "Kinematics of variable force", "Simple harmonic motion further", "Forced oscillations overview",
  ]),
  t("fm_fp1", "Further pure 1 (option themes)", [
    "Vectors further", "Conic sections", "Inequalities",
    "t-formulae", "Numerical methods further", "Group theory intro",
  ]),
  t("fm_d1", "Decision maths 1", [
    "Algorithms on graphs", "Route inspection", "Travelling salesman",
    "Critical path analysis", "Linear programming", "Simplex algorithm overview",
  ]),
];

// ─── English Literature GCSE ─────────────────────────────────────────────────

const ENG_LIT_AQA = [
  t("eng_lit_poetry_form", "Poetry: form, structure & language", [
    "Form (sonnet, free verse, dramatic monologue)", "Structure & progression", "Rhyme & rhythm/metre",
    "Imagery (simile, metaphor, personification)", "Sound devices (alliteration, assonance, sibilance)",
    "Tone & mood", "Semantic fields",
  ]),
  t("eng_lit_poetry_comp", "Poetry: comparison (anthology)", [
    "Comparing themes", "Comparing methods", "Comparing context",
    "Integrating quotations", "Writing comparative thesis", "Love & relationships clusters",
    "Power & conflict clusters",
  ]),
  t("eng_lit_shakespeare_char", "Shakespeare: character", [
    "Character presentation", "Character development / arc", "Relationships between characters",
    "Soliloquy & aside analysis", "Key quotations for major characters", "Stagecraft & character",
  ]),
  t("eng_lit_shakespeare_theme", "Shakespeare: themes & context", [
    "Major themes tracking", "Motifs & imagery patterns", "Historical & social context",
    "Genre (tragedy/comedy/history)", "Audience response then vs now", "Critical interpretations",
  ]),
  t("eng_lit_shakespeare_lang", "Shakespeare: language & structure", [
    "Blank verse vs prose", "Metaphor & figurative language", "Dramatic irony",
    "Structure of acts/scenes", "Poisoned words / rhetoric", "Exam essay technique",
  ]),
  t("eng_lit_modern_plot", "Modern text: plot & character", [
    "Plot structure", "Key characters", "Character motivation",
    "Relationships", "Key scenes deep dive", "Quotations bank",
  ]),
  t("eng_lit_modern_theme", "Modern text: themes & methods", [
    "Central themes", "Writer's methods (language)", "Structure & form of the text",
    "Setting & symbolism", "Context (when relevant)", "Exam-style responses",
  ]),
  t("eng_lit_19c_context", "19th-century novel: context & plot", [
    "Plot overview", "Social & historical context", "Authorial context",
    "Genre conventions", "Setting", "Narrative perspective",
  ]),
  t("eng_lit_19c_char", "19th-century novel: character & theme", [
    "Protagonist & antagonist", "Character foils", "Themes (class, gender, morality etc.)",
    "Key chapters", "Language analysis", "Evaluating writer’s intentions",
  ]),
  t("eng_lit_unseen", "Unseen poetry", [
    "First reading strategies", "Identifying form & structure quickly", "Language analysis under time pressure",
    "Personal response with evidence", "Comparing two unseen poems", "Useful analytical vocabulary",
  ]),
  t("eng_lit_essay", "Literature essay craft", [
    "Thesis statements", "PEEL / PETAL paragraphs", "Embedding quotations",
    "Linking to context", "Academic register", "Timing & planning under exam conditions",
  ]),
  t("eng_lit_context_theory", "Context, AO coverage & interpretation", [
    "AO1 relevant response", "AO2 analysis of language/form/structure", "AO3 context",
    "AO4 SPAG (where assessed)", "Critical viewpoints", "Avoiding narrative retell",
  ]),
];

// ─── English Language GCSE ───────────────────────────────────────────────────

const ENG_LANG_AQA = [
  t("eng_lang_p1_read_info", "Paper 1 Q1–Q2: information & language", [
    "List 4 things (retrieval)", "Selecting judicious quotations", "Word / phrase connotations",
    "Language techniques catalogue", "Effects on the reader", "Zoom-in analysis",
  ]),
  t("eng_lang_p1_struct", "Paper 1 Q3: structure", [
    "Openings & endings", "Focus shifts", "Perspective & viewpoint changes",
    "Pace & chronology", "Foreshadowing & withholding", "Structural terminology",
  ]),
  t("eng_lang_p1_eval", "Paper 1 Q4: evaluation", [
    "Understanding the statement", "Agree / partially agree strategies", "Selecting evidence to evaluate",
    "Methods linked to evaluation", "Critical personal response", "Building a convincing argument",
  ]),
  t("eng_lang_p1_write", "Paper 1 Q5: creative writing", [
    "Narrative openings", "Descriptive writing techniques", "Show not tell",
    "Varied sentence structures", "Ambitious vocabulary & imagery", "Planning & time management",
    "Crafting genre & atmosphere", "Endings with impact",
  ]),
  t("eng_lang_p2_summary", "Paper 2 Q1–Q2: true/false & summary", [
    "True/false statements", "Synthesising two sources", "Summary without analysis",
    "Inference in summaries", "Selecting relevant detail", "Concise paraphrasing",
  ]),
  t("eng_lang_p2_lang", "Paper 2 Q3: language (non-fiction)", [
    "Rhetorical devices", "Tone & register", "Persuasive language",
    "Emotive vocabulary", "Fact, opinion & assertion", "Effects on different audiences",
  ]),
  t("eng_lang_p2_compare", "Paper 2 Q4: compare viewpoints", [
    "Identifying writers' perspectives", "Comparing attitudes", "Comparing methods",
    "Integrative comparison structure", "Contextual clues (time/place)", "Balanced comparison paragraphs",
  ]),
  t("eng_lang_p2_write", "Paper 2 Q5: transactional writing", [
    "Writing to argue/persuade", "Writing to advise/explain", "Audience, purpose, form",
    "Article / letter / speech / essay forms", "Rhetorical toolkit", "Counter-argument & rebuttal",
    "Openings & memorable endings", "Tone control",
  ]),
  t("eng_lang_spag", "SPaG & technical accuracy", [
    "Sentence demarcation", "Commas, colons, semi-colons", "Apostrophes",
    "Homophones", "Subject–verb agreement", "Ambitious punctuation for effect",
  ]),
  t("eng_lang_spoken", "Spoken language (endorsement)", [
    "Planning a presentation", "Using standard English", "Responding to questions",
    "Rhetorical delivery", "Listening skills", "Audience engagement",
  ]),
];

// ─── History GCSE ────────────────────────────────────────────────────────────

const HISTORY_EDEXCEL = [
  t("hist_med_medieval", "Medicine: Medieval medicine (c1250–1500)", [
    "Supernatural & religious explanations", "Rational explanations (Four Humours)", "Approaches to prevention & treatment",
    "Medical care (hospitals, physicians, apothecaries, barber-surgeons)", "The Black Death", "Continuity & change review",
  ]),
  t("hist_med_renaissance", "Medicine: Renaissance & Industrial (c1500–1900)", [
    "Changing ideas (Vesalius, Harvey)", "Prevention & treatment changes", "John Hunter & surgery",
    "Edward Jenner & vaccination", "Pasteur & germ theory", "Koch, Lister, Simpson & Nightingale",
    "Public health problems & cholera", "Public health Acts",
  ]),
  t("hist_med_modern", "Medicine: Modern Britain (c1900–present)", [
    "Magic bullets & antibiotics", "DNA & genetic understanding", "High-tech medicine & surgery",
    "NHS", "Government lifestyle campaigns", "Modern fighting disease (incl. COVID themes as relevant)",
  ]),
  t("hist_med_western", "Medicine: Western Front historic environment", [
    "Trench conditions & injuries", "RAMC & FANY", "Chain of evacuation",
    "X-rays, blood transfusions, surgery developments", "Thomas splint", "Sources & utility questions",
  ]),
  t("hist_eliz_queen", "Early Elizabethan England: Queen, government & religion", [
    "Elizabethan court & government", "The succession issue", "Religious Settlement 1559",
    "Challenges to the Settlement", "Mary Queen of Scots", "Catholic plots",
  ]),
  t("hist_eliz_challenges", "Early Elizabethan England: challenges at home & abroad", [
    "Revolt of the Northern Earls", "Ridolfi, Throckmorton, Babington plots", "War with Spain",
    "Spanish Armada", "Reasons for Armada defeat", "Impact of voyages of discovery",
  ]),
  t("hist_eliz_society", "Early Elizabethan England: society & exploration", [
    "Education", "Leisure", "Problem of the poor",
    "Reasons for exploration & Drake", "Raleigh & Virginia", "Outbreak of war themes revisited",
  ]),
  t("hist_weimar", "Weimar & Nazi Germany: Weimar Republic 1918–29", [
    "Origins of the Republic", "Early challenges 1919–23", "Recovery under Stresemann",
    "Changes in society", "Golden Years culture", "Sources & interpretations skills",
  ]),
  t("hist_hitler_rise", "Weimar & Nazi Germany: Hitler's rise 1919–33", [
    "Early development of the Nazi Party", "Munich Putsch", "Lean years 1924–28",
    "Growth in support 1929–32", "How Hitler became Chancellor", "Role of propaganda & SA",
  ]),
  t("hist_nazi_control", "Weimar & Nazi Germany: Nazi control & dictatorship 1933–39", [
    "Creating a dictatorship", "Police state", "Controlling attitudes (propaganda/censorship)",
    "Opposition & resistance", "Churches & Nazi regime", "Interpretation questions",
  ]),
  t("hist_nazi_life", "Weimar & Nazi Germany: life in Nazi Germany 1933–39", [
    "Nazi policies towards women", "Nazi youth policies", "Employment & living standards",
    "Persecution of minorities", "Jewish persecution 1933–39", "Exam technique: explaining consequences",
  ]),
  t("hist_cw_origins", "Cold War: origins 1941–58", [
    "Early tension (Tehran, Yalta, Potsdam)", "Iron Curtain & satellite states", "Truman Doctrine & Marshall Plan",
    "Berlin Crisis 1948–49", "NATO & Warsaw Pact", "The arms race & Hungarian Uprising 1956",
  ]),
  t("hist_cw_crises", "Cold War: crises 1958–70", [
    "Berlin Ultimatum & Wall", "Cuban Missile Crisis", "Czechoslovakia & Prague Spring",
    "Consequences of each crisis", "Detente beginnings", "Exam technique: narrative account",
  ]),
  t("hist_cw_end", "Cold War: end of Cold War 1970–91", [
    "Détente & SALT", "Soviet invasion of Afghanistan", "Reagan & Second Cold War",
    "Gorbachev's new thinking", "Fall of the Berlin Wall", "Collapse of the USSR",
  ]),
];

const HISTORY_AQA = [
  t("hist_aqa_period_med", "Period study sample: America / Germany foundations", [
    "Political structures", "Economic conditions", "Social groups",
    "Key crises", "Turning points", "Interpretations practice",
  ]),
  t("hist_aqa_ww", "Wider world depth: conflict & tension introduction", [
    "Causes of conflict", "Key individuals", "Alliances & treaties",
    "Major crises", "Resolution attempts", "Source evaluation",
  ]),
  t("hist_aqa_ww2", "Wider world depth: interwar & WWII themes", [
    "Treaty of Versailles debates", "League of Nations", "Road to WWII",
    "Appeasement", "Key turning points of war", "Consequences",
  ]),
  t("hist_aqa_health", "Thematic study: Health & the people overview", [
    "Medieval medicine", "Renaissance medicine", "Industrial medicine",
    "Modern medicine", "Factors of change (war, science, government, individuals)", "Case studies",
  ]),
  t("hist_aqa_power", "Thematic study: Power & the people themes", [
    "Challenging authority medieval–modern", "Reform & reformers", "Franchise expansion",
    "Workers' movements", "Women's rights", "Minority rights",
  ]),
  t("hist_aqa_normans", "British depth: Norman England", [
    "Conquest & control", "Feudal system", "Church reforms",
    "Law & order", "Historic environment site study skills", "Exam explanation questions",
  ]),
  t("hist_aqa_eliz", "British depth: Elizabethan England", [
    "Court & parliament", "Golden Age culture", "Hardwick Hall / historic environment",
    "Troubles at home & abroad", "Poor law", "Armada",
  ]),
  t("hist_aqa_skills", "Historical skills & exam craft", [
    "Source utility", "Interpretations comparison", "Explain questions",
    "Account narrative", "How far do you agree essays", "Using second-order concepts (cause, change, similarity)",
  ]),
];

// ─── Geography GCSE ──────────────────────────────────────────────────────────

const GEOG_AQA = [
  t("geo_tectonics", "Natural hazards: tectonic", [
    "Plate margins", "Earthquakes", "Volcanic hazards",
    "Why people live in tectonic zones", "Management & monitoring", "Named case studies (HIC/LIC)",
  ]),
  t("geo_weather", "Natural hazards: weather", [
    "Global atmospheric circulation", "Tropical storms", "UK weather hazards",
    "Extreme weather impacts", "Climate change evidence", "Climate change mitigation & adaptation",
  ]),
  t("geo_eco", "The living world: ecosystems", [
    "Ecosystems at a range of scales", "Interdependence", "Nutrient cycles basics",
    "UK ecosystems overview", "Change in ecosystems", "Sustainability principles",
  ]),
  t("geo_trf", "The living world: tropical rainforests", [
    "Characteristics of TRFs", "Causes of deforestation", "Impacts of deforestation",
    "Value of TRFs", "Sustainable management", "Case study (e.g. Malaysia / Amazon)",
  ]),
  t("geo_hot_cold", "The living world: hot deserts or cold environments", [
    "Characteristics of the environment", "Biodiversity adaptations", "Development opportunities",
    "Challenges of development", "Threats & desertification / fragile environments", "Management strategies",
  ]),
  t("geo_coasts", "UK physical landscapes: coasts", [
    "Wave types & coastal processes", "Erosional landforms", "Depositional landforms",
    "Mass movement", "Hard & soft engineering", "Managed retreat & case study",
  ]),
  t("geo_rivers", "UK physical landscapes: rivers", [
    "Long & cross profiles", "Fluvial processes", "Landforms of erosion & deposition",
    "Flood hydrographs", "Flood management hard/soft", "Named UK river case study",
  ]),
  t("geo_urban", "Urban issues & challenges", [
    "Global pattern of urban change", "Mega cities", "Urban growth in LICs/NEEs (case study)",
    "Urban change in the UK (case study city)", "Urban sustainability", "Urban regeneration & inequalities",
  ]),
  t("geo_econ", "The changing economic world", [
    "Measuring development", "Demographic transition model", "Causes of uneven development",
    "Reducing the development gap", "NEE case study (economic development)", "UK economy changes",
  ]),
  t("geo_resources", "Resource management overview", [
    "Significance of food, water, energy", "UK resource overview", "Provision challenges in UK",
    "Global inequalities in supply", "Impacts of insecurity", "Sustainable futures intro",
  ]),
  t("geo_food_water_energy", "Resource management option deep dive", [
    "Food: demands & insecurity", "Food: strategies to increase supply", "Water: insecurity causes",
    "Water: management strategies", "Energy: crisis & renewables/non-renewables", "Large scale vs local schemes",
  ]),
  t("geo_skills", "Geographical skills & fieldwork", [
    "Cartographic skills", "Graphical skills", "Statistical skills (mean, median, %, + of)",
    "Fieldwork enquiry stages", "Physical fieldwork", "Human fieldwork",
    "Risk assessment", "Presenting & analysing primary data",
  ]),
];

// ─── SAT Math ────────────────────────────────────────────────────────────────

const SAT_MATH = [
  t("sat_m_linear_eq", "Algebra: linear equations & inequalities", [
    "Solving linear equations in one variable", "Linear inequalities", "Absolute value equations",
    "Literal equations", "Modelling with linear equations", "Checking solutions",
  ]),
  t("sat_m_systems", "Algebra: systems of equations", [
    "Systems graphically", "Substitution", "Elimination",
    "Systems of inequalities", "Word problems → systems", "No solution / infinite solutions",
  ]),
  t("sat_m_functions", "Algebra: functions & linear models", [
    "Function notation", "Domain & range intensity", "Linear function graphs",
    "Slope & rate of change", "Interpreting intercepts in context", "Building linear models",
  ]),
  t("sat_m_quad", "Advanced math: quadratics", [
    "Factoring quadratics", "Quadratic formula", "Completing the square",
    "Graphing parabolas (vertex form)", "Quadratic word problems", "Discriminant",
  ]),
  t("sat_m_poly", "Advanced math: polynomials & rationals", [
    "Polynomial operations", "Factor & remainder ideas", "Rational expressions",
    "Solving rational equations", "Polynomial graphs end behaviour", "Zeros & factors",
  ]),
  t("sat_m_exp_rad", "Advanced math: exponentials & radicals", [
    "Exponent rules", "Radical expressions", "Exponential growth & decay",
    "Solving exponential equations (simple)", "Rational exponents", "Modelling with exponentials",
  ]),
  t("sat_m_nonlinear", "Advanced math: nonlinear systems & other", [
    "Quadratic–linear systems", "Function transformations", "Composition basics",
    "Inverses intuition", "Analyzing structure of expressions", "Equivalent forms",
  ]),
  t("sat_m_ratio", "Problem solving: ratios, rates & proportions", [
    "Ratios & unit rates", "Proportional relationships", "Unit conversion",
    "Scale factors", "Density", "Multi-step rate problems",
  ]),
  t("sat_m_percent", "Problem solving: percentages", [
    "Percent increase/decrease", "Percent of a percent", "Interest (simple & compound intro)",
    "Percent error", "Successive percentages", "Word problems with percentages",
  ]),
  t("sat_m_stats", "Problem solving: data analysis & statistics", [
    "Mean, median, mode, range", "Standard deviation intuition", "Two-way tables",
    "Scatterplots & correlation", "Lines of best fit", "Sampling & bias",
  ]),
  t("sat_m_prob", "Problem solving: probability", [
    "Basic probability", "Compound events", "Conditional probability",
    "Independence", "Reading probability from tables/graphs", "Expected value intro",
  ]),
  t("sat_m_area", "Geometry: area, volume & densit", [
    "Area of polygons", "Circles (area & circumference)", "Volume of prisms/cylinders",
    "Volume of cones/pyramids/spheres", "Surface area", "Density applications",
  ]),
  t("sat_m_angles", "Geometry: angles, triangles & similarity", [
    "Angle relationships", "Triangle theorems", "Congruence criteria",
    "Similarity & proportions", "Pythagorean theorem", "Special right triangles",
  ]),
  t("sat_m_circles_trig", "Geometry: circles & trigonometry", [
    "Circle equations", "Central & inscribed angles", "Arc length & sector area",
    "Right-triangle trigonometry", "Sine, cosine, tangent", "Degrees vs radians intro",
  ]),
];

// ─── SAT Reading & Writing ───────────────────────────────────────────────────

const SAT_EBRW = [
  t("sat_r_central", "Information & ideas: central ideas & details", [
    "Identifying main idea", "Supporting details", "Summarising accurately",
    "Distinguishing primary vs secondary ideas", "Topic sentences", "Whole-text purpose",
  ]),
  t("sat_r_command", "Information & ideas: command of evidence", [
    "Textual evidence selection", "Quantitative evidence (tables/graphs)", "Paired evidence questions",
    "Strongest support", "Evidence that weakens claims", "Integrating info from multiple sources",
  ]),
  t("sat_r_infer", "Information & ideas: inferences", [
    "Reasonable inferences", "Implicit claims", "Character/author motives",
    "Predicting logical continuations", "Drawing conclusions", "Avoiding over-inference",
  ]),
  t("sat_r_words", "Craft & structure: words in context", [
    "Vocabulary in context", "Tone words", "Domain-specific terms",
    "Connotation vs denotation", "Multiple-meaning words", "Precision of word choice",
  ]),
  t("sat_r_structure", "Craft & structure: text structure & purpose", [
    "Overall text structure", "Function of a portion of text", "Author's purpose",
    "Transitions under craft", "Compare–contrast structures", "Problem–solution structures",
  ]),
  t("sat_r_cross", "Craft & structure: cross-text connections", [
    "Comparing two texts", "Agreement vs disagreement", "Perspective differences",
    "Relationship between passages", "Synthesising viewpoints", "Common dual-passage traps",
  ]),
  t("sat_w_rhetorical", "Expression of ideas: rhetorical synthesis", [
    "Combining notes to meet a goal", "Audience-aware writing", "Including/excluding details",
    "Effective transitions between ideas", "Logical sequence", "Concision while retaining meaning",
  ]),
  t("sat_w_transitions", "Expression of ideas: transitions", [
    "Addition transitions", "Contrast transitions", "Cause–effect transitions", "Example transitions",
    "Chronology transitions", "Choosing the best transition",
  ]),
  t("sat_w_boundaries", "Standard English: boundaries", [
    "Sentence boundaries (fragments/run-ons)", "Comma splices", "End punctuation",
    "Combining clauses correctly", "Semi-colons", "Colons",
  ]),
  t("sat_w_form", "Standard English: form, structure & sense", [
    "Subject–verb agreement", "Pronoun–antecedent agreement", "Verb tense/aspect consistency",
    "Modifier placement", "Parallel structure", "Comparative/superlative forms",
  ]),
  t("sat_w_punct", "Standard English: punctuation & conventions", [
    "Commas for lists & nonessential info", "Apostrophes (possession vs plurals)", "Dashes & parentheses",
    "Possession with joint ownership", "Punctuating quotations", "Common SAT punctuation patterns",
  ]),
  t("sat_w_style", "Expression of ideas: effective language use", [
    "Precision", "Concision (delete redundancy)", "Style & tone consistency",
    "Syntax variety awareness", "Formal vs informal register", "Avoiding awkward constructions",
  ]),
];

// ─── CATALOG ─────────────────────────────────────────────────────────────────

export const CATALOG = {
  physics_alevel: {
    id: "physics_alevel",
    name: "Physics",
    level: "A Level",
    icon: "⚛",
    boards: {
      edexcel: { id: "edexcel", name: "Edexcel", topics: PHYSICS_EDEXCEL, textbookHint: "Edexcel AS/A level Physics (Pearson) exercise style" },
      aqa: { id: "aqa", name: "AQA", topics: PHYSICS_AQA, textbookHint: "AQA A-level Physics (Oxford) specification order" },
      ocr_a: { id: "ocr_a", name: "OCR A", topics: PHYSICS_OCR_A, textbookHint: "OCR A Physics A (CGP/Oxford)" },
      ocr_b: { id: "ocr_b", name: "OCR B (Advancing Physics)", topics: PHYSICS_OCR_A, textbookHint: "Advancing Physics contexts" },
      wjec: { id: "wjec", name: "WJEC / Eduqas", topics: PHYSICS_AQA, textbookHint: "WJEC Physics thematic units" },
      cie: { id: "cie", name: "Cambridge International", topics: PHYSICS_EDEXCEL, textbookHint: "Cambridge International AS & A Level Physics" },
    },
  },
  maths_alevel: {
    id: "maths_alevel",
    name: "Mathematics",
    level: "A Level",
    icon: "∑",
    boards: {
      edexcel: { id: "edexcel", name: "Edexcel", topics: MATHS_EDEXCEL, textbookHint: "Edexcel Pure/Stats/Mech (Pearson)" },
      aqa: { id: "aqa", name: "AQA", topics: MATHS_AQA, textbookHint: "AQA Maths student books" },
      ocr_a: { id: "ocr_a", name: "OCR A", topics: MATHS_AQA, textbookHint: "OCR A Level Maths" },
      ocr_b: { id: "ocr_b", name: "OCR B (MEI)", topics: MATHS_AQA, textbookHint: "MEI structured mathematics" },
      cie: { id: "cie", name: "Cambridge International", topics: MATHS_EDEXCEL, textbookHint: "Cambridge Pure & Mechanics/Statistics" },
    },
  },
  further_maths: {
    id: "further_maths",
    name: "Further Mathematics",
    level: "A Level",
    icon: "∞",
    boards: {
      edexcel: { id: "edexcel", name: "Edexcel", topics: FP_MATH, textbookHint: "Edexcel Further Pure / options" },
      aqa: { id: "aqa", name: "AQA", topics: FP_MATH, textbookHint: "AQA Further Maths" },
      ocr_a: { id: "ocr_a", name: "OCR A", topics: FP_MATH, textbookHint: "OCR Further Maths" },
    },
  },
  chemistry_alevel: {
    id: "chemistry_alevel",
    name: "Chemistry",
    level: "A Level",
    icon: "🧪",
    boards: {
      edexcel: { id: "edexcel", name: "Edexcel", topics: CHEM_EDEXCEL, textbookHint: "Edexcel A level Chemistry (Pearson)" },
      aqa: { id: "aqa", name: "AQA", topics: CHEM_AQA, textbookHint: "AQA Chemistry Oxford" },
      ocr_a: { id: "ocr_a", name: "OCR A", topics: CHEM_OCR_A, textbookHint: "OCR A Chemistry" },
      ocr_b: { id: "ocr_b", name: "OCR B (Salters)", topics: CHEM_AQA, textbookHint: "Salters storylines" },
      cie: { id: "cie", name: "Cambridge International", topics: CHEM_EDEXCEL, textbookHint: "Cambridge Chemistry" },
    },
  },
  biology_alevel: {
    id: "biology_alevel",
    name: "Biology",
    level: "A Level",
    icon: "🧬",
    boards: {
      edexcel_a: { id: "edexcel_a", name: "Edexcel A (Salters-Nuffield)", topics: BIO_EDEXCEL, textbookHint: "SNAB activebook topics" },
      edexcel_b: { id: "edexcel_b", name: "Edexcel B", topics: BIO_EDEXCEL, textbookHint: "Edexcel B Biology" },
      aqa: { id: "aqa", name: "AQA", topics: BIO_AQA, textbookHint: "AQA Biology (Oxford)" },
      ocr_a: { id: "ocr_a", name: "OCR A", topics: BIO_AQA, textbookHint: "OCR A Biology" },
      ocr_b: { id: "ocr_b", name: "OCR B", topics: BIO_EDEXCEL, textbookHint: "OCR B Advancing Biology" },
      cie: { id: "cie", name: "Cambridge International", topics: BIO_AQA, textbookHint: "Cambridge Biology" },
    },
  },
  economics_alevel: {
    id: "economics_alevel",
    name: "Economics",
    level: "A Level",
    icon: "📈",
    boards: {
      edexcel: { id: "edexcel", name: "Edexcel", topics: ECON_EDEXCEL, textbookHint: "Edexcel Economics A themes 1–4" },
      aqa: { id: "aqa", name: "AQA", topics: ECON_AQA, textbookHint: "AQA Economics" },
      ocr: { id: "ocr", name: "OCR", topics: ECON_OCR, textbookHint: "OCR Economics" },
    },
  },
  computer_science_alevel: {
    id: "computer_science_alevel",
    name: "Computer Science",
    level: "A Level",
    icon: "💻",
    boards: {
      aqa: { id: "aqa", name: "AQA", topics: CS_AQA, textbookHint: "AQA CS (Hodder/Cambridge)" },
      ocr: { id: "ocr", name: "OCR", topics: CS_OCR, textbookHint: "OCR H446 components 01/02" },
      edexcel: { id: "edexcel", name: "Pearson Edexcel", topics: CS_AQA, textbookHint: "Edexcel CS Principles" },
    },
  },
  psychology_alevel: {
    id: "psychology_alevel",
    name: "Psychology",
    level: "A Level",
    icon: "🧠",
    boards: {
      aqa: { id: "aqa", name: "AQA", topics: PSYCH_AQA, textbookHint: "AQA Psychology Year 1/2" },
      edexcel: { id: "edexcel", name: "Edexcel", topics: PSYCH_AQA, textbookHint: "Edexcel Psychology" },
      ocr: { id: "ocr", name: "OCR", topics: PSYCH_AQA, textbookHint: "OCR Psychology" },
    },
  },
  english_lit_gcse: {
    id: "english_lit_gcse",
    name: "English Literature",
    level: "GCSE",
    icon: "📚",
    boards: {
      aqa: { id: "aqa", name: "AQA", topics: ENG_LIT_AQA, textbookHint: "AQA Lit poetry anthology + set texts" },
      edexcel: { id: "edexcel", name: "Edexcel", topics: ENG_LIT_AQA, textbookHint: "Edexcel Lit components" },
      ocr: { id: "ocr", name: "OCR", topics: ENG_LIT_AQA, textbookHint: "OCR Lit" },
    },
  },
  english_lang_gcse: {
    id: "english_lang_gcse",
    name: "English Language",
    level: "GCSE",
    icon: "✍",
    boards: {
      aqa: { id: "aqa", name: "AQA", topics: ENG_LANG_AQA, textbookHint: "AQA Lang Paper 1 & 2 skills" },
      edexcel: { id: "edexcel", name: "Edexcel", topics: ENG_LANG_AQA, textbookHint: "Edexcel Lang" },
      ocr: { id: "ocr", name: "OCR", topics: ENG_LANG_AQA, textbookHint: "OCR Lang" },
    },
  },
  history_gcse: {
    id: "history_gcse",
    name: "History",
    level: "GCSE",
    icon: "🏛",
    boards: {
      edexcel: { id: "edexcel", name: "Edexcel", topics: HISTORY_EDEXCEL, textbookHint: "Edexcel 9-1 History topics" },
      aqa: { id: "aqa", name: "AQA", topics: HISTORY_AQA, textbookHint: "AQA GCSE History" },
    },
  },
  geography_gcse: {
    id: "geography_gcse",
    name: "Geography",
    level: "GCSE",
    icon: "🌍",
    boards: {
      aqa: { id: "aqa", name: "AQA", topics: GEOG_AQA, textbookHint: "AQA Geography 8035" },
      edexcel_b: { id: "edexcel_b", name: "Edexcel B", topics: GEOG_AQA, textbookHint: "Edexcel B Geography" },
    },
  },
  sat_math: {
    id: "sat_math",
    name: "SAT Math",
    level: "SAT",
    icon: "🎯",
    boards: {
      college_board: { id: "college_board", name: "College Board Digital SAT", topics: SAT_MATH, textbookHint: "Official SAT Study Guide / Khan-aligned domains" },
    },
  },
  sat_english: {
    id: "sat_english",
    name: "SAT Reading & Writing",
    level: "SAT",
    icon: "📝",
    boards: {
      college_board: { id: "college_board", name: "College Board Digital SAT", topics: SAT_EBRW, textbookHint: "Digital SAT R&W domains" },
    },
  },
};

/** Map A Level subject → how many leading topics count as typical Year-1 / AS content */
const AS_TOPIC_COUNTS = {
  physics_alevel: 9,
  maths_alevel: 10,
  chemistry_alevel: 12,
  biology_alevel: 10,
  economics_alevel: 9,
  computer_science_alevel: 10,
  psychology_alevel: 7,
  further_maths: 8,
};

function cloneTopicWithPrefix(topic, prefix) {
  return {
    id: `${prefix}_${topic.id}`,
    name: topic.name,
    subskills: topic.subskills.map((s) => ({
      id: `${prefix}_${s.id}`,
      name: s.name,
    })),
  };
}

function makeAsBoards(aLevelBoards, count, prefix) {
  const out = {};
  for (const [bid, board] of Object.entries(aLevelBoards)) {
    const slice = board.topics.slice(0, Math.min(count, board.topics.length));
    out[bid] = {
      id: board.id,
      name: board.name,
      textbookHint: `${board.textbookHint} (AS / Year 1 focus)`,
      topics: slice.map((t) => cloneTopicWithPrefix(t, prefix)),
    };
  }
  return out;
}

// Auto-generate AS Level catalogue entries for linear A Level subjects
for (const [aId, count] of Object.entries(AS_TOPIC_COUNTS)) {
  const src = CATALOG[aId];
  if (!src) continue;
  const asId = aId.replace(/_alevel$/, "_as").replace(/^further_maths$/, "further_maths_as");
  if (CATALOG[asId]) continue;
  CATALOG[asId] = {
    id: asId,
    name: src.name,
    level: "AS Level",
    icon: src.icon,
    boards: makeAsBoards(src.boards, count, "as"),
  };
}

export function listSubjects() {
  return Object.values(CATALOG)
    .map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      icon: s.icon,
      boards: Object.values(s.boards).map((b) => ({ id: b.id, name: b.name, topicCount: b.topics.length })),
    }))
    .sort((a, b) => {
      const order = { "AS Level": 0, "A Level": 1, GCSE: 2, SAT: 3 };
      const d = (order[a.level] ?? 9) - (order[b.level] ?? 9);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name);
    });
}

export function getBoard(subjectId, boardId) {
  const s = CATALOG[subjectId];
  if (!s) return null;
  const b = s.boards[boardId];
  if (!b) return null;
  return { subject: s, board: b };
}

export function getTopic(subjectId, boardId, topicId) {
  const pack = getBoard(subjectId, boardId);
  if (!pack) return null;
  const topic = pack.board.topics.find((t) => t.id === topicId);
  if (!topic) return null;
  return { ...pack, topic };
}
