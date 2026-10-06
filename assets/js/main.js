const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const header = document.querySelector(".site-header");
const cursorOrb = document.querySelector(".cursor-orb");
const storedTheme = localStorage.getItem("portfolio-theme");

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

function updateHeader() {
  header.classList.toggle("is-detached", window.scrollY > 28);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

window.addEventListener("pointermove", (event) => {
  document.body.classList.add("has-pointer");
  cursorOrb.style.left = `${event.clientX}px`;
  cursorOrb.style.top = `${event.clientY}px`;
});

document.querySelectorAll("a, button, .experience-node").forEach((element) => {
  element.addEventListener("pointerenter", () => document.body.classList.add("cursor-hover"));
  element.addEventListener("pointerleave", () => document.body.classList.remove("cursor-hover"));
});

document.querySelectorAll(".experience-card").forEach((card) => {
  const accent = card.classList.contains("card-blue") ? "#a7d7d0"
    : card.classList.contains("card-pink") ? "#edbbc2"
      : card.classList.contains("card-lime") ? "#d9e68a" : "#f36b3d";
  card.addEventListener("pointerenter", () => {
    card.classList.add("is-hovered");
    card.style.setProperty("background", accent, "important");
  });
  card.addEventListener("pointerleave", () => {
    card.classList.remove("is-hovered");
    card.style.removeProperty("background");
  });
});

document.querySelectorAll(".company-logo").forEach((logo) => {
  const image = logo.querySelector("img");
  image.addEventListener("error", () => {
    image.remove();
    logo.querySelector("span").style.display = "block";
  });
});

const revealItems = document.querySelectorAll(".experience-node, .article-card, .about-copy");
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
