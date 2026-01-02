// ==========================================
// 1. Global Configuration and State Initialization
// ==========================================
const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbxdTgEhNm7D0Bdj3ZJ3RBlsASNfbOCGmwB6KErcARCsAzT-4uzUaVEmOkJ61hlz2tDlng/exec";

const TOTAL_SOUNDS = 256;
const FIRST_BATCH = 10;
const NEXT_BATCHES = 5;

let participantId = "part_" + Date.now();
let randomizedIndices = Array.from({ length: TOTAL_SOUNDS }, (_, i) => i + 1);

// Fisher-Yates shuffle to randomize sound order
for (let i = randomizedIndices.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [randomizedIndices[i], randomizedIndices[j]] = [
    randomizedIndices[j],
    randomizedIndices[i],
  ];
}

let currentIndex = 0;
let touchedSliders = new Set();

const container = document.getElementById("soundContainer");
const introContainer = document.getElementById("intro-container");
const progressText = document.getElementById("progress");
const errorDisplay = document.getElementById("errorMessage");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

// ==========================================
// 2. Audio Preloading Logic
// ==========================================
function preloadNextBatch(startIdx, count) {
  const end = Math.min(startIdx + count, TOTAL_SOUNDS);
  for (let i = startIdx; i < end; i++) {
    const audio = new Audio();
    audio.src = `sounds/SON${randomizedIndices[i]}.wav`;
    audio.preload = "auto";
  }
}

// ==========================================
// 3. Application Setup and Introduction
// ==========================================
function init() {
  if (introContainer) {
    introContainer.innerHTML = `
      <div class="intro-text">
        <br>
        <p class="welcome-msg">Tous les sons suivants ont été créés par synthétiseur virtuel. Cette étude vise à comprendre ce qui rend un son anxiogène et si un algorithme peut prédire le niveau d'anxiété d'un son.</p>
        <br> 
        <p class = "consigne-title"><strong>Consignes</strong> </p>
        <p>Écoutez les 10 sons ci-dessous en entier. Déplacez le curseur pour évaluez à quel point chaque son semble <strong>anxiogène</strong> : serait-il une source de stress s'il était entendu de façon prolongée ou inattendue ?</p>
        <p class = "contact-msg">Pour toute question, contactez : <strong>publelue@gmail.com</strong>. <br> </p>
      </div>`;
  }

  const reminderContainer = document.getElementById("reminder-container");
  if (reminderContainer) {
    reminderContainer.innerHTML = `
      <p>Évaluez 5 nouveaux sons en cliquant sur « Continuer » ou bien terminez ce sondage en sélectionnant « Soumettre et quitter ». Merci pour votre participation !</p>
    `;
  }

  renderBatch(FIRST_BATCH);
}
// ==========================================
// 4. Dynamic UI Generation (Batch Rendering)
// ==========================================
function renderBatch(count) {
  container.innerHTML = "";
  errorDisplay.innerText = "";
  touchedSliders.clear();

  const limit = Math.min(currentIndex + count, TOTAL_SOUNDS);

  for (let i = currentIndex; i < limit; i++) {
    const soundNum = randomizedIndices[i];
    const presentationIndex = i + 1;
    const soundIDForSheet = `SON_${soundNum}`;
    const audioFileName = `SON${soundNum}.wav`;

    const div = document.createElement("div");
    div.className = "sound-block";
    div.id = `block-${soundNum}`;

    div.innerHTML = `
      <span class="presentation-label">SON ${presentationIndex}</span>
      <audio controls src="sounds/${audioFileName}"></audio>
      <div class="slider-wrapper">
        <div class="slider-container">
            <input type="range" class="score-slider" 
                   data-id="${soundNum}" 
                   data-send-id="${soundIDForSheet}"
                   data-index="${presentationIndex}" 
                   min="0" max="100" value="50">
        </div>
        <div class="slider-labels">
            <div class="tick-group" style="left: 0%;">
              <div class="tick"></div>
              <div class="tick-text">PAS<br>ANXIOGÈNE</div>
            </div>
            <div class="tick-group" style="left: 33.33%;">
              <div class="tick"></div>
              <div class="tick-text">UN PEU<br>ANXIOGÈNE</div>
            </div>
            <div class="tick-group" style="left: 66.66%;">
              <div class="tick"></div>
              <div class="tick-text">ASSEZ<br>ANXIOGÈNE</div>
            </div>
            <div class="tick-group" style="left: 100%;">
              <div class="tick"></div>
              <div class="tick-text">TRÈS<br>ANXIOGÈNE</div>
            </div>
        </div>
      </div>
    `;
    container.appendChild(div);
  }

  preloadNextBatch(limit, NEXT_BATCHES);

  setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, 50);

  document.querySelectorAll(".score-slider").forEach((s) => {
    updateThumbColor(s);
    s.oninput = function () {
      const id = this.getAttribute("data-id");
      touchedSliders.add(id);
      updateThumbColor(this);
      document.getElementById(`block-${id}`).classList.remove("error");
      errorDisplay.innerText = "";
    };
  });

  currentIndex = limit;
  progressText.innerText = `PROGRESSION : ${currentIndex} / 50`;

  if (currentIndex >= TOTAL_SOUNDS) {
    nextBtn.style.display = "none";
    submitBtn.style.display = "inline-block";
  } else {
    nextBtn.style.display = "inline-block";
    submitBtn.style.display = "inline-block";
  }
}

// ==========================================
// 5. Interactive UI Feedback
// ==========================================
function updateThumbColor(slider) {
  const val = slider.value;
  const ratio = val / 100;

  const r = Math.round(255 + ratio * (35 - 255));
  const g = Math.round(245 + ratio * (0 - 245));
  const b = Math.round(250 + ratio * (70 - 250));

  const color = `rgb(${r}, ${g}, ${b})`;
  slider.style.setProperty("--thumb-color", color);
}

// ==========================================
// 6. Data Validation and Submission
// ==========================================
function validate() {
  const currentSliders = document.querySelectorAll(".score-slider");
  let allTouched = true;
  currentSliders.forEach((s) => {
    const id = s.getAttribute("data-id");
    if (!touchedSliders.has(id)) {
      document.getElementById(`block-${id}`).classList.add("error");
      allTouched = false;
    }
  });
  return allTouched;
}

async function sendToSheet() {
  const currentBatch = [];
  document.querySelectorAll(".score-slider").forEach((slider) => {
    currentBatch.push({
      participant_id: participantId,
      timestamp: new Date().toISOString(),
      sound_id: slider.getAttribute("data-send-id"),
      anxiety_score: slider.value,
      presentation_index: slider.getAttribute("data-index"),
    });
  });

  errorDisplay.style.color = "var(--light-purple)";
  errorDisplay.innerText =
    "MERCI DE PATIENTER - VOS RÉPONSES SONT PRÉCIEUSES...";

  try {
    await fetch(SHEET_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentBatch),
    });
    errorDisplay.innerText = "";
    return true;
  } catch (err) {
    errorDisplay.innerText = "ERREUR RÉSEAU.";
    return false;
  }
}

// ==========================================
// 7. Event Handlers and Navigation
// ==========================================
nextBtn.addEventListener("click", async () => {
  if (!validate()) {
    errorDisplay.style.color = "#620000ff";
    errorDisplay.innerText = "ERREUR : MERCI D'ÉVALUER TOUS LES SONS";
    return;
  }
  if (introContainer) introContainer.innerHTML = "";
  nextBtn.disabled = true;
  const success = await sendToSheet();
  nextBtn.disabled = false;
  if (success) renderBatch(NEXT_BATCHES);
});

submitBtn.addEventListener("click", async () => {
  const reminderContainer = document.getElementById("reminder-container");
  if (reminderContainer) reminderContainer.innerHTML = "";
  if (!validate()) {
    errorDisplay.style.color = "#620000ff";
    errorDisplay.innerText = "ERREUR : MERCI D'ÉVALUER TOUS LES SONS";
    return;
  }
  submitBtn.disabled = true;
  await sendToSheet();
  if (introContainer) introContainer.innerHTML = "";
  container.innerHTML = `
    <div class="final-message">
      <h3 style="color:var(--light-purple); margin-top:50px; margin-bottom:20px;">
        SESSION TERMINÉE. MERCI POUR VOTRE CONTRIBUTION !
      </h3>
      <p> Elle sera très utile pour tenter d’expliquer ce qui rend un son créé par synthétiseur virtuel anxiogène, et pour tester si un algorithme de machine learning peut prédire les paramètres d’un son plus angoissant.</p>
      <p class = "contact-msg">Pour toute question, ou si vous souhaitez recevoir les résultats de l'étude, contactez : <strong>publelue@gmail.com</strong>. <br> </p>
    </div>
  `;
  nextBtn.style.display = "none";
  submitBtn.style.display = "none";
  progressText.style.display = "none";
  errorDisplay.innerText = "";
});

init();
