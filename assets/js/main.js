const root = document.documentElement;
const header = document.querySelector(".site-header");
const pageLoader = document.querySelector(".page-loader");
const skillModal = document.querySelector(".skill-modal");
const skillDialog = document.querySelector(".skill-dialog");
const skillDialogVisual = document.querySelector(".skill-dialog-visual");
const skillDialogCategory = document.getElementById("skill-dialog-category");
const skillDialogTitle = document.getElementById("skill-dialog-title");
const skillDialogDescription = document.querySelector(".skill-dialog-description");
const skillStack = document.querySelector(".skill-stack");
const skillDialogClose = document.querySelector(".skill-dialog-close");
const storedTheme = localStorage.getItem("portfolio-theme");
const themeChoices = document.querySelectorAll("[data-theme-choice]");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let themePreference = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "auto";
let activeSkillCard = null;

const skillDetails = {
  research: {
    category: "Research & strategy",
    title: "Understand",
    description: "I start by making the problem visible: what people need, where they get stuck, and which decisions will make the product more useful.",
    tools: [["User flows", "UX"], ["User research", "People"], ["UX audits", "Clarity"], ["Product thinking", "Strategy"]]
  },
  design: {
    category: "Visual & interaction",
    title: "Design",
    description: "I shape clear interfaces with a strong visual hierarchy, thoughtful interaction patterns, and systems that stay consistent as products grow.",
    tools: [["Figma", "Design"], ["Design systems", "UI"], ["Visual design", "Craft"], ["Interaction design", "UX"]]
  },
  prototype: {
    category: "Wireframes & testing",
    title: "Prototype",
    description: "Prototypes turn assumptions into something tangible. I use them to communicate, test, learn, and improve before handoff.",
    tools: [["Wireframing", "Structure"], ["Prototyping", "Figma"], ["Usability testing", "Learn"], ["Responsive UI", "Systems"]]
  },
  visual: {
    category: "Brand & communication",
    title: "Express",
    description: "From identity work to campaign graphics, I use visual language to make products recognizable, expressive, and easy to trust.",
    tools: [["Branding", "Identity"], ["Typography", "Detail"], ["Composition", "Balance"], ["Photoshop", "Visuals"]]
  },
  frontend: {
    category: "UI & web development",
    title: "Build",
    description: "I understand the front end well enough to bridge design and implementation, creating handoffs that are practical and faithful to the intent.",
    tools: [["HTML", "Semantic"], ["CSS", "Responsive"], ["JavaScript", "Interaction"], ["Git", "Workflow"]]
  },
  collaboration: {
    category: "Team & delivery",
    title: "Deliver",
    description: "Good work gets better through collaboration. I communicate decisions clearly and stay engaged through build, review, and iteration.",
    tools: [["Developer handoff", "Clarity"], ["Feedback", "Improve"], ["Documentation", "Systems"], ["Communication", "Team"]]
  }
};

const skillModalIcons = {
  research: "icon-search",
  design: "icon-layout",
  prototype: "icon-arrow-up-right",
  visual: "icon-asterisk",
  frontend: "icon-code",
  collaboration: "icon-arrow-left-right"
};

function closeSkillModal() {
  if (!skillModal.classList.contains("is-open")) return;
  skillModal.classList.remove("is-open");
  skillModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (activeSkillCard) activeSkillCard.focus({ preventScroll: true });
}

function openSkillModal(card) {
  const detail = skillDetails[card.dataset.skill];
  if (!detail) return;
  activeSkillCard = card;
  skillModal.dataset.skill = card.dataset.skill;
  const iconId = skillModalIcons[card.dataset.skill];
  skillDialogVisual.innerHTML = `<div class="skill-dialog-visual-icon"><svg class="icon" aria-hidden="true"><use href="#${iconId}"></use></svg></div>`;
  skillDialogCategory.textContent = detail.category;
  skillDialogTitle.textContent = detail.title;
  skillDialogDescription.textContent = detail.description;
  skillStack.innerHTML = detail.tools.map(([name, label]) => `<span><strong>${name}</strong>${label}</span>`).join("");
  skillModal.classList.add("is-open");
  skillModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => skillDialogClose.focus({ preventScroll: true }), 50);
}

function hidePageLoader() {
  if (pageLoader) pageLoader.classList.add("is-hidden");
}

function applyTheme(preference) {
  themePreference = preference;
  root.dataset.theme = preference === "auto" ? (systemTheme.matches ? "dark" : "light") : preference;
  localStorage.setItem("portfolio-theme", preference);
  updateThemeControl();
}

function updateThemeControl() {
  themeChoices.forEach((choice) => {
    choice.setAttribute("aria-pressed", String(choice.dataset.themeChoice === themePreference));
  });
}

themeChoices.forEach((choice) => {
  choice.addEventListener("click", () => applyTheme(choice.dataset.themeChoice));
});

systemTheme.addEventListener("change", () => {
  if (themePreference === "auto") applyTheme("auto");
});

applyTheme(themePreference);
updateThemeControl();
document.getElementById("year").textContent = new Date().getFullYear();
window.addEventListener("load", hidePageLoader, { once: true });
if (document.readyState === "complete") hidePageLoader();

function initHeroParticles() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800) return;
  if (typeof window.particlesJS !== "function") {
    console.warn("Particle animation could not be initialized.");
    return;
  }

  window.particlesJS("particles-js", {
    particles: {
      number: { value: 24, density: { enable: true, value_area: 700 } },
      color: { value: ["#356dff", "#a7d7d0", "#d9e68a"] },
      shape: { type: "circle" },
      opacity: { value: .78, random: true },
      size: { value: 3, random: true },
      line_linked: { enable: true, distance: 145, color: "#686f68", opacity: .42, width: 1 },
      move: { enable: true, speed: .5, direction: "none", random: true, straight: false, out_mode: "out", bounce: false }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: { enable: true, mode: "repulse" },
        onclick: { enable: false, mode: "push" },
        resize: true
      },
      modes: { repulse: { distance: 85, duration: .45 } }
    },
    retina_detect: true
  });
}

const startParticles = window.requestIdleCallback
  ? (callback) => window.requestIdleCallback(callback, { timeout: 1200 })
  : (callback) => window.setTimeout(callback, 300);
startParticles(initHeroParticles);

let headerScrollFrame = 0;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollSettleTimer;
let parallaxFrame = 0;
const heroSection = document.querySelector(".hero");
const sectionIllustrations = [...document.querySelectorAll(".section-illustration")];
const parallaxLayers = [
  [".depth-grid", .12],
  [".depth-orbit-one", .32],
  [".depth-orbit-two", .44],
  [".depth-card-wire", .38],
  [".depth-card-ui", .55],
  [".depth-board", .48],
  [".depth-device", .62],
  [".depth-swatches", .42],
  [".depth-cursor", .7],
  [".depth-label-ux", .5],
  [".depth-label-build", .3]
].flatMap(([selector, speed]) => [...document.querySelectorAll(selector)].map((element) => ({ element, speed })));
parallaxLayers.forEach(({ element }) => element.classList.add("parallax-layer"));

function updateParallax() {
  parallaxFrame = 0;
  if (prefersReducedMotion.matches) return;
  const heroProgress = heroSection
    ? Math.max(0, Math.min(1, (window.scrollY - heroSection.offsetTop) / Math.max(1, heroSection.offsetHeight)))
    : 0;
  parallaxLayers.forEach(({ element, speed }) => {
    const offset = heroProgress * speed * -260;
    const baseRotation = Number.parseFloat(getComputedStyle(element).getPropertyValue("--parallax-base-rotation")) || 0;
    const rotation = baseRotation + heroProgress * speed * 18;
    element.style.setProperty("--parallax-offset", `${offset.toFixed(2)}px`);
    element.style.setProperty("--parallax-rotation", `${rotation.toFixed(2)}deg`);
  });
  sectionIllustrations.forEach((element, index) => {
    const section = element.parentElement;
    const bounds = section.getBoundingClientRect();
    const sectionProgress = Math.max(0, Math.min(1,
      (window.scrollY + window.innerHeight - section.offsetTop) / Math.max(1, window.innerHeight + bounds.height)));
    const direction = index % 2 ? -1 : 1;
    const offset = (sectionProgress - .5) * 360 * direction;
    element.style.setProperty("--section-offset", `${offset.toFixed(2)}px`);
  });
}

function requestParallaxUpdate() {
  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
}

const heroDepthScene = document.querySelector(".hero-depth-scene");
heroDepthScene?.parentElement.addEventListener("pointermove", (event) => {
  if (prefersReducedMotion.matches) return;
  const bounds = heroDepthScene.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width - .5) * 20;
  const y = ((event.clientY - bounds.top) / bounds.height - .5) * 14;
  heroDepthScene.style.setProperty("--micro-x", `${x.toFixed(2)}px`);
  heroDepthScene.style.setProperty("--micro-y", `${y.toFixed(2)}px`);
});
heroDepthScene?.parentElement.addEventListener("pointerleave", () => {
  heroDepthScene.style.setProperty("--micro-x", "0px");
  heroDepthScene.style.setProperty("--micro-y", "0px");
});

function updateHeader() {
  headerScrollFrame = 0;
  const scrollY = window.scrollY;
  const isDetached = header.classList.contains("is-detached");
  const shouldDetach = isDetached ? scrollY > 8 : scrollY > 28;
  header.classList.toggle("is-detached", shouldDetach);
  updateParallax();
}

window.addEventListener("scroll", () => {
  if (!prefersReducedMotion.matches) {
    header.classList.add("is-scrolling");
    window.clearTimeout(scrollSettleTimer);
    scrollSettleTimer = window.setTimeout(() => header.classList.remove("is-scrolling"), 140);
  }
  if (!headerScrollFrame) headerScrollFrame = requestAnimationFrame(updateHeader);
  requestParallaxUpdate();
}, { passive: true });
updateHeader();
requestParallaxUpdate();
window.addEventListener("resize", requestParallaxUpdate, { passive: true });

const backToTop = document.querySelector("[data-back-to-top]");
let blurResetTimer;

backToTop?.addEventListener("click", (event) => {
  event.preventDefault();
  const useMotionBlur = !prefersReducedMotion.matches;
  document.body.classList.toggle("is-returning-top", useMotionBlur);
  window.clearTimeout(blurResetTimer);
  window.scrollTo({ top: 0, behavior: useMotionBlur ? "smooth" : "auto" });
  if (useMotionBlur) {
    blurResetTimer = window.setTimeout(() => {
      document.body.classList.remove("is-returning-top");
    }, 850);
  }
});

const contactScrollLink = document.querySelector("[data-contact-scroll]");
const contactSection = document.getElementById("contact");
let contactScrollFrame = 0;
let contactFinishTimer;

contactScrollLink?.addEventListener("click", (event) => {
  if (prefersReducedMotion.matches || !contactSection) return;
  event.preventDefault();
  window.cancelAnimationFrame(contactScrollFrame);
  window.clearTimeout(contactFinishTimer);

  const start = window.scrollY;
  const target = Math.max(0, contactSection.getBoundingClientRect().top + start);
  const distance = target - start;
  const duration = Math.min(1250, Math.max(700, Math.abs(distance) * .55));
  const startedAt = performance.now();
  let previousY = start;
  let previousTime = startedAt;
  let displayedSpeed = 0;

  document.body.classList.add("is-contact-scrolling");

  const finishContactScroll = () => {
    document.body.classList.remove("is-contact-scrolling");
    document.body.style.removeProperty("--contact-scroll-blur");
    document.body.style.removeProperty("--contact-scroll-streak");
    contactScrollFrame = 0;
  };

  const animateContactScroll = (now) => {
    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / duration);
    const easedProgress = progress < .5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    const nextY = start + distance * easedProgress;
    const deltaTime = Math.max(1, now - previousTime);
    const velocity = Math.abs(nextY - previousY) / deltaTime;
    const speedFactor = Math.min(1, velocity / 2.4);
    displayedSpeed += (speedFactor - displayedSpeed) * .28;
    const blur = Math.min(9, displayedSpeed * 9);

    window.scrollTo({ top: nextY, behavior: "instant" });
    document.body.style.setProperty("--contact-scroll-blur", `${blur.toFixed(2)}px`);
    document.body.style.setProperty("--contact-scroll-streak", `${(displayedSpeed * .8).toFixed(2)}`);
    previousY = nextY;
    previousTime = now;

    if (progress < 1) {
      contactScrollFrame = window.requestAnimationFrame(animateContactScroll);
    } else {
      document.body.style.setProperty("--contact-scroll-blur", "0px");
      document.body.style.setProperty("--contact-scroll-streak", "0");
      contactFinishTimer = window.setTimeout(finishContactScroll, 120);
    }
  };

  contactScrollFrame = window.requestAnimationFrame(animateContactScroll);
});

document.querySelectorAll(".company-logo").forEach((logo) => {
  const image = logo.querySelector("img");
  image.addEventListener("error", () => {
    image.remove();
    logo.querySelector("span").style.display = "block";
  });
});

document.querySelectorAll(".skill-card").forEach((card) => {
  card.addEventListener("pointerdown", (event) => event.preventDefault());
  card.addEventListener("click", () => openSkillModal(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSkillModal(card);
    }
  });
});
skillDialogClose.addEventListener("click", closeSkillModal);
skillModal.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-modal-close")) closeSkillModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSkillModal();
});

const revealItems = document.querySelectorAll(".experience-node, .skill-card, .article-card, .about-copy");
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => {
  item.classList.add("reveal");
  revealObserver.observe(item);
});

const skillsSection = document.querySelector(".skills");
const skillCards = [...skillsSection.querySelectorAll(".skill-card")];
let skillFillTimers = [];
const skillsSectionObserver = new IntersectionObserver(([entry]) => {
  skillFillTimers.forEach((timer) => window.clearTimeout(timer));
  skillFillTimers = [];
  skillsSection.classList.toggle("is-active", entry.isIntersecting);
  if (!entry.isIntersecting) {
    skillCards.forEach((card) => card.classList.remove("is-filled"));
    return;
  }
  skillCards.forEach((card, index) => {
    skillFillTimers.push(window.setTimeout(() => card.classList.add("is-filled"), index * 90));
  });
}, { threshold: 0.12 });

skillsSectionObserver.observe(skillsSection);
