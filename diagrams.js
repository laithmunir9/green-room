/** Visuals for Adaptive Tutor */
export function pickVisual(opts) {
  opts = opts || {};
  var t = String((opts.topicName || "") + " " + (opts.subskillName || "") + " " + (opts.subjectName || "")).toLowerCase();
  var v = [];
  function d(k, c) { v.push({ type: "diagram", key: k, caption: c }); }
  function p(u, c, r) { v.push({ type: "photo", url: u, caption: c, credit: r || "Wikimedia Commons" }); }

  if (/motion|suvat|velocity|acceleration|kinematic/.test(t)) {
    d("suvat", "Straight-line motion");
    d("vt", "Velocity-time graph");
  }
  if (/projectile|trajectory/.test(t)) d("projectile", "Projectile path");
  if (/force|newton|moment|friction|resolve/.test(t)) d("forces", "Free-body diagram");
  if (/circuit|ohm|resist|current|emf/.test(t)) d("circuit", "Series circuit");
  if (/wave|amplitude|wavelength|diffraction/.test(t)) d("waves", "Wave diagram");
  if (/trig|triangle|sin|cos|pythag/.test(t)) d("triangle", "Right triangle");
  if (/bond|molecule|organic|covalent/.test(t)) d("molecule", "Molecule");
  if (/cell|mitosis|membrane|nucleus/.test(t)) d("cell", "Cell schematic");
  if (/coordinate|graph|gradient|function|geometry/.test(t)) d("axes", "Coordinate axes");

  if (/star|astro|galaxy|cosmology/.test(t)) {
    p(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Orion_constellation_Heic0917j.jpg/640px-Orion_constellation_Heic0917j.jpg",
      "Stars in Orion",
      "ESA/Hubble"
    );
  }
  if (/leaf|photosynthesis|plant/.test(t)) {
    p(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Leaf_1_web.jpg/640px-Leaf_1_web.jpg",
      "Leaf structure",
      "Wikimedia Commons"
    );
  }
  if (/volcano|tectonic|earthquake|hazard/.test(t)) {
    p(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Large_eruption_of_Mount_Etna.jpg/640px-Large_eruption_of_Mount_Etna.jpg",
      "Volcanic eruption",
      "Wikimedia Commons"
    );
  }
  if (/market|economy|inflation|trade|gdp/.test(t)) {
    p(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Stock_market_display.jpg/640px-Stock_market_display.jpg",
      "Markets and data",
      "Wikimedia Commons"
    );
  }
  if (/computer|network|algorithm|binary|cpu/.test(t)) {
    p(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Desktop_computer_clipart_-_Yellow_theme.svg/320px-Desktop_computer_clipart_-_Yellow_theme.svg.png",
      "Computer systems",
      "Wikimedia Commons"
    );
  }

  if (!v.length) d("concept", "Skill focus");
  return v.slice(0, 3);
}
