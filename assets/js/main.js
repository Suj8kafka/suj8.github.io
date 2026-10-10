const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const header = document.querySelector(".site-header");
const cursorOrb = document.querySelector(".cursor-orb");
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

if (storedTheme === "dark") {
  root.dataset.theme = "dark";
}

function updateThemeControl() {
  const isDark = root.dataset.theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.querySelector(".theme-label").textContent = isDark ? "Light" : "Dark";
}

themeToggle.addEventListener("click", () => {
  const isDark = root.dataset.theme !== "dark";
  root.dataset.theme = isDark ? "dark" : "light";
  localStorage.setItem("portfolio-theme", root.dataset.theme);
  updateThemeControl();
});

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
      number: { value: 56, density: { enable: true, value_area: 700 } },
      color: { value: ["#f36b3d", "#a7d7d0", "#d9e68a"] },
      shape: { type: "circle" },
      opacity: { value: .78, random: true },
      size: { value: 3, random: true },
      line_linked: { enable: true, distance: 145, color: "#686f68", opacity: .42, width: 1 },
      move: { enable: true, speed: 1, direction: "none", random: true, straight: false, out_mode: "out", bounce: false }
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
function updateHeader() {
  headerScrollFrame = 0;
  const scrollY = window.scrollY;
  const isDetached = header.classList.contains("is-detached");
  const shouldDetach = isDetached ? scrollY > 8 : scrollY > 28;
  header.classList.toggle("is-detached", shouldDetach);
}

window.addEventListener("scroll", () => {
  if (!headerScrollFrame) headerScrollFrame = requestAnimationFrame(updateHeader);
}, { passive: true });
updateHeader();

let pointerFrame = 0;
let pointerX = 0;
let pointerY = 0;
window.addEventListener("pointermove", (event) => {
  document.body.classList.add("has-pointer");
  pointerX = event.clientX;
  pointerY = event.clientY;
  if (!pointerFrame) {
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      cursorOrb.style.setProperty("--cursor-x", `${pointerX}px`);
      cursorOrb.style.setProperty("--cursor-y", `${pointerY}px`);
    });
  }
});

document.addEventListener("pointerover", (event) => {
  if (event.target.closest("a, button, .experience-node")) document.body.classList.add("cursor-hover");
});
document.addEventListener("pointerout", (event) => {
  if (event.target.closest("a, button, .experience-node") && !event.relatedTarget?.closest("a, button, .experience-node")) {
    document.body.classList.remove("cursor-hover");
  }
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
