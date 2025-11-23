const steps = 16;
const tracks = [
  {
    name: "Kick",
    color: "#7ddcff",
    synth: new Tone.MembraneSynth({ volume: -4 }).toDestination(),
    note: "C2",
    duration: "16n",
  },
  {
    name: "Snare",
    color: "#ff9c6e",
    synth: new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
    }).toDestination(),
    note: null,
    duration: "16n",
  },
  {
    name: "Hi-Hat",
    color: "#c3ff7d",
    synth: new Tone.MetalSynth({
      frequency: 180,
      envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
      harmonicity: 3.1,
      modulationIndex: 32,
      resonance: 600,
      octaves: 1.5,
    }).toDestination(),
    note: "D5",
    duration: "32n",
  },
  {
    name: "Bass",
    color: "#d6b3ff",
    synth: new Tone.MonoSynth({
      oscillator: { type: "square" },
      filter: { Q: 1, type: "lowpass", rolloff: -24 },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.6 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.1,
        release: 0.4,
        baseFrequency: 120,
        octaves: 3,
      },
    }).toDestination(),
    note: "C2",
    duration: "8n",
  },
];

const pattern = tracks.map(() => Array(steps).fill(false));
const grid = document.getElementById("grid");
const playToggle = document.getElementById("play-toggle");
const stopButton = document.getElementById("stop");
const tempo = document.getElementById("tempo");
const tempoValue = document.getElementById("tempo-value");
const swing = document.getElementById("swing");
const swingValue = document.getElementById("swing-value");
const randomize = document.getElementById("randomize");
const clear = document.getElementById("clear");
const startAudio = document.getElementById("start-audio");
let isPlaying = false;
let currentStep = 0;

function setButtonState(enabled) {
  [playToggle, stopButton, randomize, clear].forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function createRow(trackIndex, track) {
  const label = document.createElement("div");
  label.className = "track-label";
  const labelDot = document.createElement("span");
  labelDot.className = "track-color";
  labelDot.style.background = track.color;

  const labelText = document.createElement("strong");
  labelText.textContent = track.name;

  const muteBtn = document.createElement("button");
  muteBtn.type = "button";
  muteBtn.className = "mute";
  muteBtn.textContent = "Mute";
  muteBtn.addEventListener("click", () => toggleMute(trackIndex, muteBtn));

  label.append(labelDot, labelText, muteBtn);
  grid.appendChild(label);

  for (let step = 0; step < steps; step++) {
    const cell = document.createElement("button");
    cell.className = "step";
    cell.setAttribute("aria-label", `${track.name} step ${step + 1}`);
    cell.addEventListener("click", () => toggleStep(trackIndex, step, cell));
    grid.appendChild(cell);
  }
}

function buildGrid() {
  grid.style.gridTemplateColumns = `120px repeat(${steps}, 1fr)`;
  tracks.forEach((track, index) => createRow(index, track));
}

function toggleStep(trackIndex, stepIndex, cell) {
  pattern[trackIndex][stepIndex] = !pattern[trackIndex][stepIndex];
  cell.classList.toggle("active", pattern[trackIndex][stepIndex]);
}

function clearPlayhead() {
  document.querySelectorAll(".step.playhead").forEach((cell) => {
    cell.classList.remove("playhead");
  });
}

function drawPlayhead(stepIndex) {
  clearPlayhead();
  const cells = Array.from(document.querySelectorAll(".step"));
  tracks.forEach((_, trackIdx) => {
    const cellIndex = trackIdx * steps + stepIndex;
    const cell = cells[cellIndex];
    if (cell) {
      cell.classList.add("playhead");
    }
  });
}

function randomizePattern() {
  const probability = 0.28;
  const cells = document.querySelectorAll(".step");
  cells.forEach((cell) => cell.classList.remove("active"));

  tracks.forEach((_, trackIdx) => {
    for (let step = 0; step < steps; step++) {
      const active = Math.random() < probability;
      pattern[trackIdx][step] = active;
      const cell = cells[trackIdx * steps + step];
      cell.classList.toggle("active", active);
    }
  });
}

function clearPattern() {
  pattern.forEach((row) => row.fill(false));
  document.querySelectorAll(".step").forEach((cell) => {
    cell.classList.remove("active");
  });
}

function toggleMute(trackIndex, button) {
  tracks[trackIndex].muted = !tracks[trackIndex].muted;
  button.classList.toggle("active", tracks[trackIndex].muted);
  button.textContent = tracks[trackIndex].muted ? "Muted" : "Mute";
}

function updateTempo(value) {
  tempoValue.textContent = `${value} BPM`;
  Tone.Transport.bpm.value = value;
}

function updateSwing(value) {
  swingValue.textContent = `${value}%`;
  Tone.Transport.swing = Number(value) / 100;
  Tone.Transport.swingSubdivision = "16n";
}

function scheduleLoop() {
  Tone.Transport.scheduleRepeat((time) => {
    tracks.forEach((track, trackIdx) => {
      if (!pattern[trackIdx][currentStep]) return;
      if (track.muted) return;

      triggerTrack(track, time);
    });

    drawPlayhead(currentStep);
    currentStep = (currentStep + 1) % steps;
  }, "16n");
}

function triggerTrack(track, time) {
  if (track.note) {
    track.synth.triggerAttackRelease(track.note, track.duration, time);
  } else {
    track.synth.triggerAttackRelease(track.duration, time);
  }
}

async function startAudioContext() {
  await Tone.start();
  setButtonState(true);
  startAudio.disabled = true;
}

function setupControls() {
  playToggle.addEventListener("click", async () => {
    if (!isPlaying) {
      currentStep = 0;
      Tone.Transport.start();
      playToggle.textContent = "Pause";
      isPlaying = true;
    } else {
      Tone.Transport.pause();
      playToggle.textContent = "Play";
      isPlaying = false;
    }
  });

  stopButton.addEventListener("click", () => {
    Tone.Transport.stop();
    playToggle.textContent = "Play";
    isPlaying = false;
    currentStep = 0;
    clearPlayhead();
  });

  randomize.addEventListener("click", randomizePattern);
  clear.addEventListener("click", clearPattern);

  tempo.addEventListener("input", (event) => updateTempo(event.target.value));
  swing.addEventListener("input", (event) => updateSwing(event.target.value));

  startAudio.addEventListener("click", async () => {
    await startAudioContext();
  });
}

function setupEffects() {
  const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.2 });
  const delay = new Tone.FeedbackDelay("8n", 0.18);
  tracks.forEach((track) => {
    track.synth.connect(reverb);
    track.synth.connect(delay);
  });
  reverb.toDestination();
  delay.toDestination();
}

function init() {
  buildGrid();
  setupControls();
  setupEffects();
  scheduleLoop();
  updateTempo(tempo.value);
  updateSwing(swing.value);
}

init();
