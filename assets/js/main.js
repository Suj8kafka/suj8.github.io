const root = document.documentElement;
const skillModal = document.querySelector(".skill-modal");
const skillDialog = document.querySelector(".skill-dialog");
const skillDialogVisual = document.querySelector(".skill-dialog-visual");
const skillDialogCategory = document.getElementById("skill-dialog-category");
const skillDialogTitle = document.getElementById("skill-dialog-title");
const skillDialogDescription = document.querySelector(".skill-dialog-description");
const skillStack = document.querySelector(".skill-stack");
const skillDialogClose = document.querySelector(".skill-dialog-close");
let storedTheme;
try { storedTheme = localStorage.getItem("portfolio-theme"); } catch {}
const themeChoices = document.querySelectorAll("[data-theme-choice]");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let themePreference = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "auto";
let activeSkillCard = null;
let skillFocusFrame = 0;

// Keep the two header popovers independent, including when using the keyboard.
const headerPopoverTriggers = document.querySelectorAll('.live-counter, .availability-badge');
headerPopoverTriggers.forEach(trigger => {
  const resetDismissal = () => { delete trigger.dataset.tooltipDismissed; };
  trigger.addEventListener('pointerenter', resetDismissal);
  trigger.addEventListener('focusin', resetDismissal);
  if (trigger.matches('.availability-badge')) {
    trigger.addEventListener('click', () => {
      resetDismissal();
      trigger.focus({ preventScroll: true });
    });
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    headerPopoverTriggers.forEach(trigger => { trigger.dataset.tooltipDismissed = 'true'; });
  }
});

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
  window.cancelAnimationFrame(skillFocusFrame);
  skillFocusFrame = 0;
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
  window.cancelAnimationFrame(skillFocusFrame);
  skillFocusFrame = window.requestAnimationFrame(() => {
    skillFocusFrame = window.requestAnimationFrame(() => {
      skillFocusFrame = 0;
      if (skillModal.classList.contains("is-open") && activeSkillCard === card) {
        skillDialogClose.focus({ preventScroll: true });
      }
    });
  });
}

function applyTheme(preference) {
  themePreference = preference;
  root.dataset.theme = preference === "auto" ? (systemTheme.matches ? "dark" : "light") : preference;
  try { localStorage.setItem("portfolio-theme", preference); } catch {}
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
  if (!skillModal.classList.contains("is-open")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeSkillModal();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...skillDialog.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(element => element.getClientRects().length > 0);
  const first = focusable[0], last = focusable.at(-1);
  if (!first) {
    event.preventDefault();
    skillDialog.focus({ preventScroll: true });
  } else if (!skillDialog.contains(document.activeElement)
    || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus({ preventScroll: true });
  }
});
