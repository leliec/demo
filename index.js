const cards = document.querySelectorAll(".card");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");
const closeBtn = document.getElementById("close-btn");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const content = card.getAttribute("data-content");
    overlayText.textContent = content;
    overlay.classList.remove("hidden");
  });
});

closeBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
});

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) {
    overlay.classList.add("hidden");
  }
});
