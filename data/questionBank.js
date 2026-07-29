/** Pre-authored questions: diagnostic + exam-style (instant). */

function q(prompt, choices, answerIndex, explanation, hint = "", extra = {}) {
  const fingerprint = prompt.replace(/\s+/g, " ").trim().toLowerCase();
  return {
    prompt,
    choices,
    answerIndex,
    explanation,
    hint,
    fingerprint,
    style: extra.style || "standard",
    difficulty: extra.difficulty || "medium",
    marks: extra.marks || null,
  };
}

const bank = new Map();
const examBank = new Map();

function key(parts) {
  return parts.join("::");
}

function add(k, items) {
  const cur = bank.get(k) || [];
  const seen = new Set(cur.map((x) => x.fingerprint || x.prompt));
  for (const item of items) {
    const fp = item.fingerprint || item.prompt.replace(/\s+/g, " ").trim().toLowerCase();
    if (seen.has(fp)) continue;
    seen.add(fp);
    cur.push({ ...item, fingerprint: fp });
  }
  bank.set(k, cur);
}

function addExam(topicKey, items) {
  const cur = examBank.get(topicKey) || [];
  const seen = new Set(cur.map((x) => x.fingerprint || x.prompt));
  for (const item of items) {
    const fp = item.fingerprint || item.prompt.replace(/\s+/g, " ").trim().toLowerCase();
    if (seen.has(fp)) continue;
    seen.add(fp);
    cur.push({ ...item, fingerprint: fp, style: "exam" });
  }
  examBank.set(topicKey, cur);
}

function contentId(item) {
  const fp = item.fingerprint || String(item.prompt || "").replace(/\s+/g, " ").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < fp.length; i++) h = (h * 31 + fp.charCodeAt(i)) >>> 0;
  return item.id || ("q_" + h.toString(16));
}

const motion = "physics_alevel::edexcel::phys_mech_motion";
add(motion + "::phys_mech_motion_1::easy", [
  q(
    "A cyclist starts from rest and reaches a steady speed of 8.0 m/s after 4.0 s of uniform acceleration.\n\nWhat is the acceleration?",
    ["1.0 m/s²", "2.0 m/s²", "4.0 m/s²", "32 m/s²"],
    1,
    "a = (v − u)/t = (8.0 − 0)/4.0 = 2.0 m/s².",
    "Use a = (v − u)/t with u = 0.",
    { difficulty: "easy" }
  ),
]);
add(motion + "::phys_mech_motion_1::medium", [
  q(
    "A train moves with constant acceleration from 12 m/s to 28 m/s while travelling 200 m.\n\nWhat is the acceleration?",
    ["1.6 m/s²", "2.0 m/s²", "2.8 m/s²", "4.0 m/s²"],
    0,
    "Use v² = u² + 2as.\n28² = 12² + 2a(200)\n784 = 144 + 400a\na = 640/400 = 1.6 m/s².",
    "Choose the SUVAT relation with v, u, a and s (no t needed).",
    { difficulty: "medium" }
  ),
  q(
    "A ball is thrown vertically upwards at 15 m/s from ground level. Air resistance is negligible. Take g = 9.8 m/s² downwards.\n\nWhat is the ball’s velocity at its highest point?",
    ["15 m/s upwards", "9.8 m/s downwards", "0", "7.5 m/s upwards"],
    2,
    "At the highest point the instantaneous velocity is zero. Acceleration remains g downwards.",
    "Think about the turning point of the motion.",
    { difficulty: "medium" }
  ),
  q(
    "An object starts from rest and accelerates uniformly at 3.0 m/s² for 4.0 s.\n\nHow far does it travel in this time?",
    ["12 m", "24 m", "48 m", "6.0 m"],
    1,
    "s = ut + ½at² = 0 + ½(3.0)(4.0)² = 1.5 × 16 = 24 m.",
    { difficulty: "medium" }
  ),
]);
add(motion + "::phys_mech_motion_1::hard", [
  q(
    "A car brakes uniformly from 30 m/s to rest in 4.5 s on a straight road.\n\nFind:\n(i) the magnitude of the deceleration\n(ii) the stopping distance\n\nWhich pair is correct?",
    [
      "6.7 m/s² and 67.5 m",
      "6.7 m/s² and 135 m",
      "4.5 m/s² and 67.5 m",
      "30 m/s² and 67.5 m",
    ],
    0,
    "(i) a = (0 − 30)/4.5 = −6.67 m/s², so magnitude 6.7 m/s² (2 s.f.).\n(ii) With constant acceleration, s = (u+v)t/2 = (30+0)×4.5/2 = 67.5 m.",
    "Magnitude of deceleration is the positive size of a. For distance, average speed × time works when a is constant.",
    { difficulty: "hard", style: "exam", marks: 4 }
  ),
]);
add(motion + "::phys_mech_motion_1::stretch", [
  q(
    "A particle moves in a straight line. It accelerates at 2.0 m/s² from rest for 3.0 s, then travels at constant velocity for 5.0 s.\n\nWhat is the total displacement after 8.0 s?",
    ["9.0 m", "15 m", "39 m", "48 m"],
    2,
    "After the first 3 s: v = 6.0 m/s and s1 = ½×2×3² = 9.0 m.\nNext 5 s at 6.0 m/s: s2 = 30 m.\nTotal displacement = 39 m.",
    "Split the journey into an accelerated phase and a constant-speed phase.",
    { difficulty: "stretch", style: "exam", marks: 5 }
  ),
]);

add(motion + "::phys_mech_motion_2::medium", [
  q(
    "A velocity–time graph is a straight line from the point (0 s, 4.0 m/s) to (6.0 s, 16 m/s).\n\nWhat does the area under this line represent, and what is its value?",
    [
      "Acceleration of 2.0 m/s²",
      "Displacement of 60 m",
      "Displacement of 120 m",
      "Force of 60 N",
    ],
    1,
    "Area under a velocity–time graph equals displacement.\nArea of trapezium = ½(4.0 + 16)×6.0 = 60 m.\nThe gradient is acceleration (2.0 m/s²), but the question asks for the area.",
    "Remember: gradient ↔ acceleration, area ↔ displacement.",
    { difficulty: "medium" }
  ),
  q(
    "Which quantity is given by the gradient of a velocity–time graph?",
    ["Displacement", "Acceleration", "Speed only", "Momentum"],
    1,
    "Gradient = Δv/Δt = acceleration.",
    { difficulty: "medium" }
  ),
]);
add(motion + "::phys_mech_motion_2::hard", [
  q(
    "A velocity–time graph is triangular: velocity rises linearly from 0 to 8.0 m/s in 2.0 s, then falls linearly back to 0 in the next 6.0 s.\n\nWhat is the total distance travelled?",
    ["8.0 m", "24 m", "32 m", "48 m"],
    2,
    "Distance = area under the graph = area of one triangle = ½ × base × height = ½ × 8.0 s × 8.0 m/s = 32 m.",
    "Total time base is 2.0 + 6.0 = 8.0 s.",
    { difficulty: "hard", style: "exam", marks: 3 }
  ),
]);

add(motion + "::phys_mech_motion_3::medium", [
  q(
    "A football is kicked from level ground with speed 18 m/s at 35° above the horizontal. Air resistance is negligible.\n\nWhat is the initial vertical component of the velocity?",
    ["About 10 m/s", "About 15 m/s", "18 m/s", "18 cos 35° m/s only"],
    0,
    "Resolve the launch velocity: vertical component uy = u sin θ = 18 sin 35° ≈ 10.3 m/s.",
    "For a launch above the horizontal: horizontal uses cos, vertical uses sin.",
    { difficulty: "medium" }
  ),
  q(
    "For projectile motion with no air resistance, what is the horizontal acceleration after launch?",
    ["g downwards", "g cos θ", "zero", "g sin θ"],
    2,
    "There is no horizontal force after launch, so horizontal acceleration is zero and horizontal velocity is constant.",
    { difficulty: "medium" }
  ),
]);
add(motion + "::phys_mech_motion_3::hard", [
  q(
    "A projectile is launched at 24 m/s at 40° to the horizontal from the top of a cliff and lands 30 m below the launch height. Ignore air resistance. Take g = 9.8 m/s².\n\nWhich statement is correct throughout the flight until landing?",
    [
      "Horizontal velocity stays constant at about 18.4 m/s",
      "Horizontal velocity becomes zero at the highest point",
      "Acceleration is zero at the highest point",
      "The landing speed must equal the launch speed",
    ],
    0,
    "No horizontal forces ⇒ ux = 24 cos 40° ≈ 18.4 m/s remains constant.\nAt the apex only the vertical velocity component is zero; g is never zero. Landing lower than launch means kinetic energy (and speed) is greater than at launch.",
    "Treat horizontal and vertical motion separately.",
    { difficulty: "hard", style: "exam", marks: 4 }
  ),
]);

addExam(motion, [
  q(
    "Exam-style question\n\nA trolley freewheels from rest down a straight slope with constant acceleration 1.2 m/s².\n\nA Calculate its speed after 2.5 s.\nB Calculate the distance travelled in this time.\nC The slope is made steeper so the acceleration increases. Without calculating, state what happens to the time needed to travel the same distance as in B.\n\nWhich pair gives A and B correctly?",
    [
      "A: 3.0 m/s   B: 3.75 m",
      "A: 3.0 m/s   B: 7.5 m",
      "A: 1.2 m/s   B: 3.75 m",
      "A: 4.2 m/s   B: 3.75 m",
    ],
    0,
    "A: v = u + at = 0 + 1.2×2.5 = 3.0 m/s.\nB: s = ut + ½at² = 0 + ½×1.2×(2.5)² = 3.75 m.\nC: For a larger acceleration, the same distance is covered in less time.",
    "Write which SUVAT equation you use for each part.",
    { difficulty: "hard", style: "exam", marks: 6 }
  ),
  q(
    "Exam-style question\n\nA stone is projected horizontally at 14 m/s from a bridge 45 m above a river. Take g = 9.8 m/s². Ignore air resistance.\n\nHow long does the stone take to reach the water, and how far horizontally from the base of the bridge does it land?",
    [
      "About 3.0 s and 42 m",
      "About 3.0 s and 21 m",
      "About 9.2 s and 42 m",
      "About 3.0 s and 45 m",
    ],
    0,
    "Vertical motion from rest: s = ½gt² ⇒ 45 = ½×9.8×t² ⇒ t² ≈ 9.18 ⇒ t ≈ 3.0 s.\nHorizontal distance sx = ux t = 14×3.0 ≈ 42 m.",
    "Horizontal projection means initial vertical velocity is zero.",
    { difficulty: "stretch", style: "exam", marks: 5 }
  ),
]);

const forces = "physics_alevel::edexcel::phys_mech_forces";
add(forces + "::phys_mech_forces_1::easy", [
  q(
    "A shopping trolley is pushed with a steady horizontal force on a smooth horizontal floor (friction can be ignored).\n\nWhile the resultant force on the trolley is non-zero, Newton’s first law says the trolley will:",
    [
      "Move at constant speed",
      "Accelerate in the direction of the resultant force",
      "Eventually stop by itself",
      "Move backwards",
    ],
    1,
    "A non-zero resultant force produces acceleration in the direction of that force.",
    { difficulty: "easy" }
  ),
]);
add(forces + "::phys_mech_forces_1::medium", [
  q(
    "A box of mass 4.0 kg is pulled across a smooth horizontal surface by a horizontal force of 10 N.\n\nWhat is the acceleration of the box?",
    ["0.40 m/s²", "2.5 m/s²", "40 m/s²", "14 m/s²"],
    1,
    "From F = ma, a = F/m = 10/4.0 = 2.5 m/s².",
    { difficulty: "medium" }
  ),
  q(
    "A force of 20 N acts at right angles to a door, 0.75 m from the hinges.\n\nWhat is the moment of this force about the hinges?",
    ["15 N m", "26.7 N m", "0.038 N m", "20.8 N m"],
    0,
    "Moment = force × perpendicular distance from the pivot = 20 × 0.75 = 15 N m.",
    { difficulty: "medium" }
  ),
]);
add(forces + "::phys_mech_forces_1::hard", [
  q(
    "A uniform beam of weight 120 N and length 2.0 m rests horizontally on two vertical supports at its ends A and B. A box of weight 80 N is placed 0.50 m from A.\n\nWhat is the upward force from the support at B?",
    ["50 N", "70 N", "80 N", "100 N"],
    2,
    "Vertical equilibrium: RA + RB = 200 N.\nTake moments about A (so RA does not appear):\n120×1.0 + 80×0.50 = RB×2.0\n160 = 2 RB\nRB = 80 N.",
    "Moments about one support removes that support from the equation.",
    { difficulty: "hard", style: "exam", marks: 4 }
  ),
]);
add(forces + "::phys_mech_forces_2::medium", [
  q(
    "For a rigid body to be in equilibrium, which condition must hold?",
    [
      "Resultant force is zero only",
      "Resultant moment is zero only",
      "Resultant force and resultant moment are both zero",
      "The body must be at rest",
    ],
    2,
    "Both the resultant force and the resultant moment must be zero. A body can still move with constant velocity if those conditions hold.",
    { difficulty: "medium" }
  ),
]);
add(forces + "::phys_mech_forces_3::medium", [
  q(
    "Two forces of 5.0 N and 12 N act at right angles to each other.\n\nWhat is the magnitude of the resultant force?",
    ["7.0 N", "13 N", "17 N", "60 N"],
    1,
    "Resultant magnitude = √(5² + 12²) = √(25 + 144) = √169 = 13 N.",
    { difficulty: "medium" }
  ),
]);
addExam(forces, [
  q(
    "Exam-style question\n\nA skier of mass 70 kg accelerates straight down a 20° slope at 1.5 m/s². Take g = 9.8 m/s². Assume friction is a constant force up the slope.\n\nWhich values are closest for (i) the component of weight down the slope and (ii) the frictional force?",
    [
      "(i) about 230 N   (ii) about 130 N",
      "(i) about 650 N   (ii) about 130 N",
      "(i) about 230 N   (ii) about 550 N",
      "(i) about 70 N    (ii) about 1.5 N",
    ],
    0,
    "Weight component down the slope: mg sin 20° ≈ 70×9.8×0.342 ≈ 235 N.\nNet force down the slope: ma = 70×1.5 = 105 N.\nSo mg sinθ − F = ma ⇒ F ≈ 235 − 105 ≈ 130 N.",
    "Resolve parallel to the slope, then apply Newton’s second law.",
    { difficulty: "stretch", style: "exam", marks: 6 }
  ),
]);

const energy = "physics_alevel::edexcel::phys_mech_energy";
add(energy + "::phys_mech_energy_1::easy", [
  q(
    "A student lifts a 5.0 kg school bag straight up through 1.2 m at constant speed. Take g = 9.8 m/s².\n\nHow much work is done against gravity?",
    ["6.0 J", "41 J", "59 J", "98 J"],
    2,
    "Work against gravity W = mgΔh = 5.0 × 9.8 × 1.2 ≈ 59 J.",
    { difficulty: "easy" }
  ),
]);
add(energy + "::phys_mech_energy_1::medium", [
  q(
    "A ball of mass 0.40 kg is thrown vertically upwards with kinetic energy 18 J at release. Ignore air resistance. Take g = 9.8 m/s².\n\nWhat maximum height above the release point is reached?",
    ["2.3 m", "4.6 m", "9.2 m", "45 m"],
    1,
    "At maximum height KE has become GPE: 18 = mgh ⇒ h = 18/(0.40×9.8) ≈ 4.6 m.",
    { difficulty: "medium" }
  ),
  q(
    "A machine does 2400 J of useful work in 1.5 minutes. Its efficiency is 60%.\n\nWhat total energy input is required?",
    ["1440 J", "2400 J", "4000 J", "6000 J"],
    2,
    "Efficiency = useful out / total in ⇒ total in = useful out / η = 2400 / 0.60 = 4000 J.\n(The time is not needed for this part.)",
    { difficulty: "medium" }
  ),
]);
add(energy + "::phys_mech_energy_1::hard", [
  q(
    "A motor lifts a 250 kg load vertically at constant speed through 12 m in 8.0 s. Take g = 9.8 m/s².\n\nWhat useful output power is delivered to the load?",
    ["0.37 kW", "3.7 kW", "29 kW", "24 kW"],
    1,
    "Useful work = mgh = 250×9.8×12 = 29400 J.\nPower = work/time = 29400/8.0 = 3675 W ≈ 3.7 kW.",
    { difficulty: "hard", style: "exam", marks: 3 }
  ),
]);
addExam(energy, [
  q(
    "Exam-style question\n\nA rollercoaster carriage of mass 450 kg is released from rest at height 28 m. At a later point 9.0 m above the ground its speed is 16 m/s. Take g = 9.8 m/s².\n\nApproximately how much energy has been dissipated by resistive forces between these two positions?",
    ["about 12 kJ", "about 26 kJ", "about 58 kJ", "about 84 kJ"],
    1,
    "Loss in GPE = mgΔh = 450×9.8×(28−9) = 450×9.8×19 = 83790 J.\nGain in KE = ½mv² = ½×450×256 = 57600 J.\nEnergy dissipated ≈ 83790 − 57600 ≈ 26200 J ≈ 26 kJ.",
    "Mechanical energy falls by the work done against resistance.",
    { difficulty: "stretch", style: "exam", marks: 5 }
  ),
]);

const maAlg = "maths_alevel::edexcel::ma_pure_algebra";
add(maAlg + "::ma_pure_algebra_1::easy", [
  q("Simplify 3² × 3⁵.", ["3⁷", "3¹⁰", "9⁷", "6⁷"], 0, "When multiplying powers of the same base, add the indices: 2+5=7.", { difficulty: "easy" }),
]);
add(maAlg + "::ma_pure_algebra_1::medium", [
  q("Solve x² − 5x + 6 = 0.", ["x = 1 or 6", "x = 2 or 3", "x = −2 or −3", "x = 0 or 5"], 1, "Factorise: (x−2)(x−3)=0, so x=2 or x=3.", { difficulty: "medium" }),
  q("Write √50 in simplest surd form.", ["5√2", "25√2", "2√5", "10√5"], 0, "√50 = √(25×2) = 5√2.", { difficulty: "medium" }),
]);
add(maAlg + "::ma_pure_algebra_1::hard", [
  q(
    "The equation 2x² − 3x + k = 0 has equal roots.\n\nFind the value of k.",
    ["9/8", "8/9", "3/2", "−9/8"],
    0,
    "For equal roots the discriminant is zero:\nb² − 4ac = 0 ⇒ (−3)² − 4(2)k = 0 ⇒ 9 − 8k = 0 ⇒ k = 9/8.",
    { difficulty: "hard", style: "exam", marks: 3 }
  ),
]);
add(maAlg + "::ma_pure_algebra_2::medium", [
  q("Solve x² − 9 = 0.", ["x = ±3", "x = ±9", "x = 3 only", "x = 0"], 0, "x² = 9 ⇒ x = ±3.", { difficulty: "medium" }),
]);
add(maAlg + "::ma_pure_algebra_3::medium", [
  q("Solve the simultaneous equations x + y = 5 and x − y = 1.", ["x=3, y=2", "x=2, y=3", "x=5, y=0", "x=1, y=1"], 0, "Add the equations: 2x = 6 ⇒ x = 3, then y = 2.", { difficulty: "medium" }),
]);
add(maAlg + "::ma_pure_algebra_4::medium", [
  q("Solve the inequality 2x − 4 > 6.", ["x > 5", "x > 1", "x < 5", "x ≥ 5"], 0, "2x > 10 ⇒ x > 5.", { difficulty: "medium" }),
]);
addExam(maAlg, [
  q(
    "Exam-style question\n\nLet f(x) = 2x³ − 5x² − 4x + 3.\n\nGiven that (x − 3) is a factor of f(x), fully factorise f(x) and find all roots of f(x) = 0.",
    [
      "Roots: 3, 1 and −1/2",
      "Roots: 3, 1/2 and −1",
      "Roots: −3, 1 and −1/2",
      "Only root: 3",
    ],
    1,
    "Because f(3)=0 (given/checkable), divide f by (x−3) to get 2x² + x − 1.\nThen 2x² + x − 1 = (2x − 1)(x + 1).\nSo f(x)=(x−3)(2x−1)(x+1).\nRoots: x=3, x=1/2, x=−1.",
    { difficulty: "stretch", style: "exam", marks: 7 }
  ),
]);

const satA = "sat_math::college_board::sat_m_algebra";
add(satA + "::sat_m_algebra_1::easy", [
  q("If 3x − 7 = 11, what is x?", ["4", "5", "6", "18"], 2, "3x = 18 ⇒ x = 6.", { difficulty: "easy" }),
]);
add(satA + "::sat_m_algebra_1::medium", [
  q("If 2(x + 3) = 14, what is x?", ["2", "4", "5", "7"], 1, "x + 3 = 7 ⇒ x = 4.", { difficulty: "medium" }),
]);
add(satA + "::sat_m_algebra_1::hard", [
  q(
    "A straight line passes through the points (2, 5) and (6, 13).\n\nWhat is the equation of the line in the form y = mx + c?",
    ["y = 2x + 1", "y = 2x + 5", "y = x + 3", "y = 3x − 1"],
    0,
    "Gradient m = (13−5)/(6−2) = 8/4 = 2.\nUsing (2,5): 5 = 2(2) + c ⇒ c = 1.\nSo y = 2x + 1.",
    { difficulty: "hard", style: "exam" }
  ),
]);
add(satA + "::sat_m_algebra_2::medium", [
  q("For the system x + y = 10 and x − y = 2, what is x?", ["4", "6", "8", "5"], 1, "Add the equations: 2x = 12 ⇒ x = 6.", { difficulty: "medium" }),
]);
addExam(satA, [
  q(
    "Exam-style question\n\nService A charges a setup fee of $36 plus $12 per hour. Service B charges $18 per hour with no setup fee.\n\nAfter how many hours are the total costs equal?",
    ["3 hours", "4 hours", "6 hours", "8 hours"],
    2,
    "36 + 12h = 18h ⇒ 36 = 6h ⇒ h = 6.",
    { difficulty: "hard", style: "exam" }
  ),
]);

export function bankSize() {
  let n = 0;
  for (const arr of bank.values()) n += arr.length;
  for (const arr of examBank.values()) n += arr.length;
  return n;
}

export function getBankQuestions({
  subjectId,
  boardId,
  topicId,
  subskillId,
  level = "medium",
  count = 1,
  excludeIds = new Set(),
  excludeFingerprints = new Set(),
  difficultyPreference = null,
}) {
  const levelOrder = difficultyPreference
    ? [difficultyPreference, "hard", "stretch", "medium", "easy", level]
    : [level, "hard", "stretch", "medium", "easy"];
  const out = [];
  const tried = new Set();
  const seenFp = new Set(excludeFingerprints);

  const pushFrom = (list, src, lv, matchedSubskillId) => {
    for (const item of list) {
      const id = contentId(item);
      const fp = item.fingerprint || item.prompt.replace(/\s+/g, " ").trim().toLowerCase();
      if (excludeIds.has(id) || tried.has(id) || seenFp.has(fp)) continue;
      if (excludeIds.has(fp)) continue;
      tried.add(id);
      seenFp.add(fp);
      out.push({
        ...item,
        id,
        fingerprint: fp,
        source: src,
        level: item.difficulty || lv,
        // The subskill this question actually came from — may differ from the
        // requested subskillId once we fall back across subskills/topic below.
        subskillId: matchedSubskillId,
      });
      if (out.length >= count) return true;
    }
    return false;
  };

  for (const lv of levelOrder) {
    const k = key([subjectId, boardId, topicId, subskillId, lv]);
    if (pushFrom(bank.get(k) || [], "bank", lv, subskillId)) return out;
  }
  const subPrefix = key([subjectId, boardId, topicId, subskillId]);
  for (const [k, list] of bank.entries()) {
    if (!k.startsWith(subPrefix + "::")) continue;
    if (pushFrom(list, "bank", level, subskillId)) return out;
  }
  const topicPrefix = key([subjectId, boardId, topicId]);
  for (const [k, list] of bank.entries()) {
    if (!k.startsWith(topicPrefix + "::")) continue;
    const realSubskillId = k.split("::")[3] || subskillId;
    if (pushFrom(list, "bank-topic", level, realSubskillId)) return out;
  }
  return out;
}

export function getExamQuestions({ subjectId, boardId, topicId, count = 5, excludeIds = new Set() }) {
  const topicKey = key([subjectId, boardId, topicId]);
  const list = examBank.get(topicKey) || [];
  const out = [];
  const seenFp = new Set();
  const extras = [];
  for (const [k, arr] of bank.entries()) {
    if (!k.startsWith(topicKey + "::")) continue;
    const subskillId = k.split("::")[3] || null;
    for (const item of arr) {
      if (item.style === "exam" || item.difficulty === "hard" || item.difficulty === "stretch") {
        extras.push({ ...item, subskillId });
      }
    }
  }
  for (const item of [...list, ...extras]) {
    const id = contentId(item);
    const fp = item.fingerprint || item.prompt.replace(/\s+/g, " ").trim().toLowerCase();
    if (excludeIds.has(id) || seenFp.has(fp)) continue;
    seenFp.add(fp);
    // Items from `examBank` (list) are genuinely topic-wide, multi-part questions
    // with no single tested subskill — leave subskillId null rather than guessing.
    out.push({ ...item, id, fingerprint: fp, style: "exam", source: item.source || "exam-bank", subskillId: item.subskillId || null });
    if (out.length >= count) break;
  }
  return out;
}

export function putBankQuestion({ subjectId, boardId, topicId, subskillId, level = "medium", question }) {
  const k = key([subjectId, boardId, topicId, subskillId, level]);
  const fingerprint = String(question.prompt || "").replace(/\s+/g, " ").trim().toLowerCase();
  const item = {
    id: contentId({ ...question, fingerprint }),
    prompt: question.prompt,
    choices: question.choices,
    answerIndex: question.answerIndex,
    explanation: question.explanation || "",
    hint: question.hint || "",
    fingerprint,
    source: question.source || "ai-cache",
    style: question.style || "standard",
    difficulty: question.difficulty || level,
  };
  const cur = bank.get(k) || [];
  if (!cur.some((x) => x.fingerprint === fingerprint)) {
    cur.push(item);
    bank.set(k, cur);
  }
  return item;
}

export function listBankKeys() {
  return [...bank.keys()];
}
