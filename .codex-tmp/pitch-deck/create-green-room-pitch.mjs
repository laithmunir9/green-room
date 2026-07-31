import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const TMP_DIR = "/Users/laithmunir/Projects/green-room/.codex-tmp/pitch-deck";
const FINAL_PPTX = "/Users/laithmunir/Projects/green-room/Green_Room_Hackathon_Pitch.pptx";
const LOGO_PATH = "/Users/laithmunir/Projects/green-room/public/logo.png";

const W = 1280;
const H = 720;
const C = {
  bg: "#FBF7EC",
  ink: "#24352E",
  muted: "#5F7268",
  green: "#2B4A40",
  sage: "#9FBB94",
  tan: "#E7C48F",
  panel: "#FFFDF8",
  line: "#8C9A90",
  blush: "#F1EAD9",
};

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontFace: opts.fontFace || "Aptos",
    fontSize: opts.size || 24,
    bold: !!opts.bold,
    italic: !!opts.italic,
    color: opts.color || C.ink,
    alignment: opts.align || "left",
  };
  return shape;
}

function addFooter(slide, n) {
  addText(slide, String(n).padStart(2, "0"), 1168, 640, 48, 24, {
    size: 16,
    bold: true,
    color: C.muted,
    align: "right",
  });
}

function addRule(slide, x, y, w, color = C.tan) {
  slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: 6 },
    fill: color,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function addSoftShape(slide, x, y, w, h, fill, line = C.line) {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: 2 },
    borderRadius: "rounded-xl",
  });
}

function addSourceNotes(slide, lines, sources) {
  slide.speakerNotes.textFrame.setText([
    ...lines,
    "",
    "[Sources]",
    ...sources,
  ]);
  slide.speakerNotes.setVisible(true);
}

async function main() {
  await fs.mkdir(TMP_DIR, { recursive: true });
  const sourceNotes = [
    "IEC Pitch Deck Template (1).pdf: used only for pitch-deck sequence guidance: problem, solution, product/demo, team/close; business model, roadmap, market, and ask were intentionally excluded per user instruction.",
    "HI Bootcamp - Day 3.pdf: used for jury criteria and 2-minute pitch guidance: specific person/problem, proof it is real, live demo, impact, and team understanding.",
    "ai_stage_fright_research.pdf: used for research statistics on AI/VR public-speaking anxiety interventions.",
  ].join("\n");
  await fs.writeFile(path.join(TMP_DIR, "source-notes.txt"), sourceNotes);

  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  presentation.theme.colorScheme = {
    name: "Green Room",
    themeColors: {
      dk1: C.ink,
      lt1: C.bg,
      dk2: C.green,
      lt2: C.panel,
      accent1: C.green,
      accent2: C.sage,
      accent3: C.tan,
      accent4: C.blush,
      accent5: C.muted,
      accent6: "#C0453A",
      hlink: C.green,
      folHlink: C.muted,
    },
  };

  const logo = await readImageBlob(LOGO_PATH);

  // 1. Title
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    slide.images.add({
      blob: logo,
      contentType: "image/png",
      alt: "Green Room logo",
      fit: "contain",
      position: { left: 82, top: 76, width: 92, height: 92 },
    });
    addText(slide, "Green Room", 82, 214, 700, 88, {
      size: 66,
      bold: true,
      color: C.green,
      fontFace: "Georgia",
    });
    addText(slide, "Practice the room before you face it.", 86, 318, 780, 50, {
      size: 30,
      color: C.ink,
    });
    addRule(slide, 86, 396, 240, C.tan);
    addText(slide, "AI role-play for viva, pitch, interview, and public-speaking practice.", 86, 430, 700, 72, {
      size: 24,
      color: C.muted,
    });
    addSoftShape(slide, 890, 100, 240, 420, C.panel);
    addText(slide, "speak", 930, 160, 160, 44, { size: 28, bold: true, color: C.green, align: "center" });
    addText(slide, "respond", 930, 292, 160, 44, { size: 28, bold: true, color: C.green, align: "center" });
    addText(slide, "improve", 930, 424, 160, 44, { size: 28, bold: true, color: C.green, align: "center" });
    addFooter(slide, 1);
    addSourceNotes(
      slide,
      [
        "Open with the product name and one-line promise. Keep it human: this is not a generic AI tool; it is a practice room for stressful speaking moments.",
      ],
      [
        "Product context from local Green Room app files in /Users/laithmunir/Projects/green-room.",
        "HI Bootcamp - Day 3.pdf, page 9: recommends 15 seconds for who you are, product name, and one-line purpose.",
      ],
    );
  }

  // 2. Problem
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addText(slide, "Knowing the answer is not the same as saying it under pressure.", 78, 74, 1030, 96, {
      size: 42,
      bold: true,
      color: C.green,
      fontFace: "Georgia",
    });
    addRule(slide, 82, 190, 178, C.tan);
    const items = [
      ["The moment", "A student has a viva, pitch, interview, or class presentation coming up."],
      ["What breaks", "They rehearse alone, so they never practice interruptions, blanking, tone, or follow-up questions."],
      ["Why it matters", "The first realistic audience often appears on the day that counts."],
    ];
    items.forEach(([head, body], i) => {
      const y = 250 + i * 116;
      addText(slide, `0${i + 1}`, 86, y + 6, 56, 38, { size: 25, bold: true, color: C.tan });
      addText(slide, head, 160, y, 260, 38, { size: 27, bold: true, color: C.ink });
      addText(slide, body, 432, y, 640, 56, { size: 22, color: C.muted });
    });
    addFooter(slide, 2);
    addSourceNotes(
      slide,
      [
        "Use a specific person and moment. Do not say 'students have communication problems.' Say: one student has to speak under pressure and currently gets no realistic reps.",
      ],
      [
        "HI Bootcamp - Day 3.pdf, pages 4-6: winning pitches name a real person, a real moment, and a specific broken alternative.",
        "IEC Pitch Deck Template (1).pdf, page 5: problem slide should be emotionally clear and minimal.",
      ],
    );
  }

  // 3. Evidence
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.green;
    addText(slide, "Evidence says practice with feedback can move the needle.", 78, 74, 1030, 88, {
      size: 42,
      bold: true,
      color: C.panel,
      fontFace: "Georgia",
    });
    addText(slide, "In a peer-reviewed AI speech-coach study:", 82, 184, 720, 38, {
      size: 24,
      color: "#DCE8DD",
    });
    const stats = [
      ["25.2%", "average reduction in public-speaking anxiety"],
      ["60.5%", "increase in speech competency scores"],
    ];
    stats.forEach(([num, label], i) => {
      const x = 92 + i * 520;
      addText(slide, num, x, 270, 420, 92, {
        size: 72,
        bold: true,
        color: C.tan,
        fontFace: "Georgia",
      });
      addText(slide, label, x + 4, 372, 380, 74, {
        size: 26,
        color: C.panel,
      });
    });
    addText(slide, "Small study, strong signal: 20 senior-high students, one week of daily AI-coach practice.", 96, 536, 900, 58, {
      size: 22,
      color: "#DCE8DD",
    });
    addFooter(slide, 3);
    addSourceNotes(
      slide,
      [
        "This is the proof-it-is-real slide. Say the caveat out loud so the jury trusts the number: early evidence, small sample, but directly relevant to AI speech coaching.",
      ],
      [
        "ai_stage_fright_research.pdf, pages 1-2: Garcia et al. 2024 ICCE Proceedings, n=20, reported 25.2% average anxiety reduction and 60.5% speech competency gain after one week using Yoodli.",
        "HI Bootcamp - Day 3.pdf, page 6: no source named, no number used.",
      ],
    );
  }

  // 4. Solution
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addText(slide, "Green Room turns solo rehearsal into a realistic audience.", 78, 74, 1030, 92, {
      size: 42,
      bold: true,
      color: C.green,
      fontFace: "Georgia",
    });
    addRule(slide, 82, 188, 178, C.tan);
    const columns = [
      ["Choose the room", "Viva, pitch, interview, public speech, or casual discussion."],
      ["Speak out loud", "The mic captures the turn, cleans the transcript, and tracks pace."],
      ["Get pushed back", "AI personas ask, challenge, distract, encourage, and keep the session moving."],
    ];
    columns.forEach(([head, body], i) => {
      const x = 86 + i * 378;
      addSoftShape(slide, x, 258, 314, 238, i === 1 ? C.panel : C.blush);
      addText(slide, head, x + 28, 296, 260, 42, { size: 28, bold: true, color: C.green });
      addText(slide, body, x + 28, 362, 252, 90, { size: 21, color: C.ink });
    });
    addText(slide, "The AI is not the pitch. The believable practice loop is the pitch.", 86, 562, 950, 42, {
      size: 24,
      bold: true,
      color: C.ink,
    });
    addFooter(slide, 4);
    addSourceNotes(
      slide,
      [
        "Keep this in plain words. Avoid naming models or frameworks unless asked. The jury scores what was built and why this approach beats the obvious one.",
      ],
      [
        "HI Bootcamp - Day 3.pdf, page 2: jury scores problem, solution, demo, impact, and team.",
        "HI Bootcamp - Day 3.pdf, page 10: avoid the tech list; explain what it does for the person.",
        "IEC Pitch Deck Template (1).pdf, pages 6-8: solution and product/demo slides should state the approach and technical advantage without drowning in details.",
      ],
    );
  }

  // 5. Demo
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.panel;
    addText(slide, "Demo the one moment that matters.", 78, 74, 950, 78, {
      size: 46,
      bold: true,
      color: C.green,
      fontFace: "Georgia",
    });
    addText(slide, "A complete speaking rep, live.", 82, 156, 700, 38, { size: 25, color: C.muted });
    const steps = [
      ["1", "Pick a scenario", "Viva, pitch, interview, or public speech."],
      ["2", "Answer out loud", "Speak naturally; the transcript shows what the app heard."],
      ["3", "Handle the room", "Respond to a follow-up, challenge, or distraction."],
      ["4", "End with feedback", "See coaching notes and pace from the spoken turn."],
    ];
    steps.forEach(([num, head, body], i) => {
      const y = 244 + i * 84;
      addText(slide, num, 96, y, 50, 50, { size: 35, bold: true, color: C.tan, align: "center" });
      addText(slide, head, 170, y, 360, 32, { size: 27, bold: true, color: C.ink });
      addText(slide, body, 540, y + 3, 570, 38, { size: 21, color: C.muted });
    });
    addSoftShape(slide, 882, 92, 250, 92, C.bg);
    addText(slide, "Run it live", 922, 122, 170, 34, { size: 27, bold: true, color: C.green, align: "center" });
    addFooter(slide, 5);
    addSourceNotes(
      slide,
      [
        "Do not tour the app. Start from cold if possible, then show one speaking loop end to end. If the model is slow, use the polite fallback and keep talking.",
      ],
      [
        "HI Bootcamp - Day 3.pdf, pages 3 and 7-10: demo must run live, one complete flow beats many half-finished features, avoid the tour, have fallback behavior.",
        "IEC Pitch Deck Template (1).pdf, page 7: a product demo is more powerful than slides or script.",
      ],
    );
  }

  // 6. Impact
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addText(slide, "If 1,000 students used it, the first scary audience would not be the real one.", 78, 74, 1040, 110, {
      size: 42,
      bold: true,
      color: C.green,
      fontFace: "Georgia",
    });
    addRule(slide, 82, 206, 178, C.tan);
    addText(slide, "What changes", 86, 270, 280, 40, { size: 29, bold: true, color: C.ink });
    const bullets = [
      "More realistic reps before high-stakes speaking moments.",
      "Earlier feedback on clarity, pace, and handling pressure.",
      "A team can show a working path, explain it, and improve it fast.",
    ];
    bullets.forEach((b, i) => {
      addText(slide, b, 112, 340 + i * 66, 820, 42, { size: 25, color: i === 0 ? C.green : C.ink, bold: i === 0 });
    });
    addText(slide, "Build it for someone. Then tell them why.", 86, 588, 800, 42, {
      size: 28,
      bold: true,
      color: C.green,
      fontFace: "Georgia",
    });
    addFooter(slide, 6);
    addSourceNotes(
      slide,
      [
        "Close by resolving the opening: the product gives students realistic practice before the moment counts. If asked about team, each member should explain a part of the build and demo path.",
      ],
      [
        "HI Bootcamp - Day 3.pdf, pages 2, 5, 9, and 13: impact asks what changes if a thousand people use it; everyone should contribute and explain the build; close on who it is for and why.",
      ],
    );
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(TMP_DIR, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(TMP_DIR, `${stem}.layout.json`), await layout.text());
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(TMP_DIR, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
