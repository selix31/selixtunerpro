// ----------------------
// Navigation et éléments
// ----------------------
const startBtn = document.getElementById("startBtn");
const guitarBtn = document.getElementById("guitarBtn");
const ukuleleBtn = document.getElementById("ukuleleBtn");

const welcome = document.getElementById("welcome");
const menu = document.getElementById("menu");
const tuner = document.getElementById("tuner");

const noteDisplay = document.getElementById("note");
const freqDisplay = document.getElementById("frequency");
const centsDisplay = document.getElementById("cents");
const needle = document.getElementById("needle");
const correctNotesDiv = document.getElementById("correctNotes");

// ----------------------
// Notes instruments
// ----------------------
const guitarNotes = [
    { note: "E", freq: 82.41 },
    { note: "A", freq: 110 },
    { note: "D", freq: 146.83 },
    { note: "G", freq: 196 },
    { note: "B", freq: 246.94 },
    { note: "E", freq: 329.63 }
];

const ukuleleNotes = [
    { note: "G", freq: 196 },
    { note: "C", freq: 261.63 },
    { note: "E", freq: 329.63 },
    { note: "A", freq: 440 }
];

let activeNotes = guitarNotes; // Notes actives par défaut
let correctNotesList = []; // Notes correctes stockées
let currentPercent = 50; // Position de l’aiguille
let audioContext, analyser, microphone, dataArray;
let isTunerRunning = false;

// ----------------------
// Fonctions menu
// ----------------------
startBtn.onclick = () => {
    welcome.style.display = "none";
    menu.style.display = "block";
}

// Guitare
guitarBtn.onclick = () => {
    selectInstrument(guitarNotes);
}

// Ukulélé
ukuleleBtn.onclick = () => {
    selectInstrument(ukuleleNotes);
}

// Sélection d’instrument
function selectInstrument(notesArray) {
    menu.style.display = "none";
    tuner.style.display = "block";

    // 1. Changer notes actives
    activeNotes = notesArray;

    // 2. Reset notes correctes
    resetCorrectNotes();

    // 3. Stop tuner si déjà actif
    stopTuner();

    // 4. Démarrer tuner
    startTuner();
}

// ----------------------
// Reset notes correctes
// ----------------------
function resetCorrectNotes() {
    correctNotesList = [];
    correctNotesDiv.innerHTML = "";
}

// ----------------------
// Stop tuner
// ----------------------
function stopTuner() {
    if (audioContext && isTunerRunning) {
        audioContext.close();
        isTunerRunning = false;
    }
}

// ----------------------
// Démarrer tuner
// ----------------------
async function startTuner() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 8192; // Détection notes graves améliorée
    dataArray = new Float32Array(analyser.fftSize);

    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    isTunerRunning = true;
    detectPitch();
}

// ----------------------
// Détection pitch
// ----------------------
function detectPitch() {
    analyser.getFloatTimeDomainData(dataArray);
    let pitch = autoCorrelate(dataArray, audioContext.sampleRate);

    if (pitch !== -1) {
        freqDisplay.innerText = pitch.toFixed(2) + " Hz";

        let closest = getClosestNote(pitch);
        noteDisplay.innerText = closest.note;

        let cents = 1200 * Math.log2(pitch / closest.freq);
        centsDisplay.innerText = cents.toFixed(1) + " cents";

        moveNeedle(cents);

        if (Math.abs(cents) < 5) {
            addCorrectNote(closest.note);
        }
    } else {
        resetNeedle();
        freqDisplay.innerText = "0 Hz";
        noteDisplay.innerText = "--";
        centsDisplay.innerText = "-- cents";
    }

    requestAnimationFrame(detectPitch);
}

// ----------------------
// Ajouter note correcte
// ----------------------
function addCorrectNote(note) {
    if (!correctNotesList.includes(note)) {
        correctNotesList.push(note);
        const span = document.createElement("span");
        span.className = "correct";
        span.innerText = note + " correct";
        correctNotesDiv.appendChild(span);
    }
}

// ----------------------
// Trouver note la plus proche
// ----------------------
function getClosestNote(freq) {
    let closest = activeNotes[0];
    for (let i = 1; i < activeNotes.length; i++) {
        if (Math.abs(freq - activeNotes[i].freq) < Math.abs(freq - closest.freq)) {
            closest = activeNotes[i];
        }
    }
    return closest;
}

// ----------------------
// Bouger aiguille fluide ±50 cents
// ----------------------
function moveNeedle(cents) {
    let maxCents = 50;
    if (cents > maxCents) cents = maxCents;
    if (cents < -maxCents) cents = -maxCents;

    let targetPercent = 50 + (cents / maxCents) * 50;
    currentPercent += (targetPercent - currentPercent) * 0.2; // fluidité
    needle.style.left = currentPercent + "%";

    needle.style.background = Math.abs(cents) < 5 ? "lime" : "red";
}

// ----------------------
// Reset aiguille
// ----------------------
function resetNeedle() {
    currentPercent += (50 - currentPercent) * 0.2;
    needle.style.left = currentPercent + "%";
    needle.style.background = "red";
}

// ----------------------
// Autocorrélation pitch
// ----------------------
function autoCorrelate(buffer, sampleRate) {
    let SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.005) return -1; // seuil plus bas pour graves

    let r1 = 0, r2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buffer[i]) < 0.2) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buffer[SIZE - i]) < 0.2) { r2 = SIZE - i; break; }

    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE - i; j++) c[i] += buffer[j] * buffer[j + i];

    let d = 0; while (c[d] > c[d + 1]) d++;

    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }

    return sampleRate / maxpos;
}