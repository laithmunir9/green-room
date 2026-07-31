const slides = [...document.querySelectorAll(".slide")];
const progress = document.getElementById("progress");
const count = document.getElementById("count");
let slideIndex = 0;
let stepIndex = 0;

function maxStep(slide) {
  return Number(slide.dataset.steps || 1);
}

function render() {
  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === slideIndex);
    if (i !== slideIndex) {
      slide.querySelectorAll(".fragment").forEach((fragment) => fragment.classList.remove("visible"));
    }
  });
  const slide = slides[slideIndex];
  slide.querySelectorAll(".fragment").forEach((fragment) => {
    fragment.classList.toggle("visible", Number(fragment.dataset.step || 1) <= stepIndex);
  });
  const totalUnits = slides.reduce((sum, slide) => sum + maxStep(slide), 0);
  const completedBefore = slides.slice(0, slideIndex).reduce((sum, slide) => sum + maxStep(slide), 0);
  const current = completedBefore + Math.max(stepIndex, 1);
  progress.style.width = `${Math.round((current / totalUnits) * 100)}%`;
  count.textContent = `${slideIndex + 1}/${slides.length}.${stepIndex}`;
}

function advanceSlide() {
  const slide = slides[slideIndex];
  if (stepIndex < maxStep(slide)) {
    stepIndex += 1;
  } else if (slideIndex < slides.length - 1) {
    slideIndex += 1;
    stepIndex = 0;
  }
  render();
}

function retreatSlide() {
  if (stepIndex > 0) {
    stepIndex -= 1;
  } else if (slideIndex > 0) {
    slideIndex -= 1;
    stepIndex = maxStep(slides[slideIndex]);
  }
  render();
}

document.getElementById("next").addEventListener("click", advanceSlide);
document.getElementById("prev").addEventListener("click", retreatSlide);

document.addEventListener("keydown", (event) => {
  if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(event.key)) {
    event.preventDefault();
    advanceSlide();
  }
  if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(event.key)) {
    event.preventDefault();
    retreatSlide();
  }
  if (event.key.toLowerCase() === "home") {
    slideIndex = 0;
    stepIndex = 0;
    render();
  }
});

let wheelLock = false;
document.addEventListener("wheel", (event) => {
  if (Math.abs(event.deltaY) < 18 || wheelLock) return;
  wheelLock = true;
  if (event.deltaY > 0) advanceSlide();
  else retreatSlide();
  setTimeout(() => { wheelLock = false; }, 360);
}, { passive: true });

render();
