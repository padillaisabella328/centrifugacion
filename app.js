/* ===========================================================
      SIMULADOR DE CENTRÍFUGA DE CANASTA (TIPO LAVADORA)
=========================================================== */

let running = false;
let markerDetected = false;
let rotorAngle = 0;
let currentRPM = 0;
let targetRPM = 450;
let elapsedTime = 0;
let timerInterval = null;
const gravity = 9.81;

// Parámetros físicos
let process = {
    radius : 0.30,
    densityDifference : 800,
    particleDiameter : 40,
    viscosity : 1.0,
    omega : 0,
    factorG : 0,
    acceleration : 0,
    centrifugalForce : 0,
    sedimentationVelocity : 0,
    efficiency : 0
};

// DOM Elements
const rotor = document.getElementById("rotor");
const marker = document.getElementById("hiroMarker");
const loader = document.getElementById("loader");
const loaderProgress = document.getElementById("loaderProgress");
const dashboard = document.getElementById("dashboard");
const dashboardHandle = document.getElementById("dashboardHandle");

const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");
const btnInfo = document.getElementById("btnInfo");
const btnMenu = document.getElementById("btnMenu");

const statusLed = document.getElementById("statusLed");
const statusText = document.getElementById("statusText");
const timer = document.getElementById("timer");

// UI Updates
function updateDashboard() {
    document.getElementById("omegaValue").textContent = process.omega.toFixed(1);
    document.getElementById("gValue").textContent = process.factorG.toFixed(0);
    document.getElementById("forceValue").textContent = process.centrifugalForce.toFixed(2);
    document.getElementById("velocityValue").textContent = (process.sedimentationVelocity * 1000).toFixed(2);
    document.getElementById("accelerationValue").textContent = process.acceleration.toFixed(0);
    document.getElementById("powerValue").textContent = process.efficiency.toFixed(0) + " %";
}

// Loader Animación
let load = 0;
const loaderAnimation = setInterval(() => {
    load += Math.random() * 12;
    if (load >= 100) {
        load = 100;
        clearInterval(loaderAnimation);
        setTimeout(() => {
            loader.style.opacity = "0";
            setTimeout(() => loader.style.display = "none", 600);
        }, 300);
    }
    loaderProgress.style.width = load + "%";
}, 60);

// Controles de interfaz
dashboardHandle.addEventListener("click", () => dashboard.classList.toggle("open"));
btnMenu.addEventListener("click", () => dashboard.classList.toggle("open"));

const infoModal = document.getElementById("infoModal");
btnInfo.onclick = () => infoModal.style.display = "flex";
document.getElementById("closeInfo").onclick = () => infoModal.style.display = "none";
window.onclick = (e) => { if(e.target === infoModal) infoModal.style.display = "none"; };

// Marcador AR
marker.addEventListener("markerFound", () => {
    markerDetected = true;
    statusText.textContent = "Tambor detectado";
    statusLed.style.background = "#32d26b";
    statusLed.style.boxShadow = "0 0 18px #32d26b";
});
marker.addEventListener("markerLost", () => {
    markerDetected = false;
    statusText.textContent = "Buscando marcador";
    statusLed.style.background = "#ff4545";
    statusLed.style.boxShadow = "0 0 18px #ff4545";
});

// Temporizador
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedTime++;
        const h = Math.floor(elapsedTime / 3600);
        const m = Math.floor((elapsedTime % 3600) / 60);
        const s = elapsedTime % 60;
        timer.textContent = String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
    }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }
function resetTimer() { elapsedTime = 0; timer.textContent = "00:00:00"; }

// Cálculos de las ecuaciones
function calculatePhysics() {
    process.omega = 2 * Math.PI * (targetRPM / 60);
    process.acceleration = process.radius * process.omega * process.omega;
    process.factorG = process.acceleration / gravity;
    process.centrifugalForce = process.densityDifference * process.acceleration * 1e-9;
    
    // Velocidad radial hacia las paredes
    process.sedimentationVelocity = 
        (process.densityDifference * process.acceleration * Math.pow(process.particleDiameter * 1e-6, 2)) / 
        (18 * process.viscosity * 0.001);
        
    process.efficiency = Math.min(100, process.factorG / 12);
}

// Giro del tambor central
const ACCELERATION = 200;
const DECELERATION = 250;
function updateRotor(delta) {
    if(running) {
        if(currentRPM < targetRPM) currentRPM += ACCELERATION * delta;
        if(currentRPM > targetRPM) currentRPM = targetRPM;
    } else {
        if(currentRPM > 0) currentRPM -= DECELERATION * delta;
        if(currentRPM < 0) currentRPM = 0;
    }
    // Convertimos RPM a grados para la rotación 3D
    rotorAngle += (currentRPM * 6) * delta; 
    rotor.setAttribute("rotation", `0 ${rotorAngle} 0`);
}

/* ===========================================================
      SISTEMA DE PARTÍCULAS (MIGRACIÓN A LA PARED)
=========================================================== */
const PARTICLES_COUNT = 450; 
const DRUM_MAX_RADIUS = 0.29; // Radio interno del tambor
let particles = [];

function createParticles() {
    const container = document.getElementById("particles1");
    particles = [];
    
    for (let i = 0; i < PARTICLES_COUNT; i++) {
        const p = document.createElement("a-sphere");
        
        // Distribuimos las partículas aleatoriamente dentro del tambor
        const angle = Math.random() * Math.PI * 2;
        // Empiezan más cerca del centro
        const r = 0.02 + Math.random() * 0.15; 
        const y = (Math.random() * 0.38) - 0.19; // Altura dentro del tambor
        
        const pSize = 0.003 + Math.random() * 0.003;
        
        p.setAttribute("radius", pSize);
        p.setAttribute("color", "#d4af37");
        
        // Coordenadas Cartesianas
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        
        p.object3D.position.set(x, y, z);
        container.appendChild(p);
        
        particles.push({
            entity: p,
            angle: angle,
            r: r,
            y: y,
            state: "free"
        });
    }
}

function updateParticles(delta) {
    particles.forEach(p => {
        if (running && p.state === "free") {
            // Migración Radial: El radio 'r' aumenta alejándose del centro
            // Multiplicamos por 20 para hacer el efecto visualmente perceptible
            p.r += process.sedimentationVelocity * delta * 20; 
            
            // Límite de colisión con la pared del tambor
            if (p.r >= DRUM_MAX_RADIUS) {
                p.r = DRUM_MAX_RADIUS;
                p.state = "sedimented"; // Se pegan a la pared
            }
        }
        
        // Actualizamos las coordenadas X y Z basadas en el nuevo radio 'r'
        const x = Math.cos(p.angle) * p.r;
        const z = Math.sin(p.angle) * p.r;
        p.entity.object3D.position.set(x, p.y, z);
    });
}

function resetParticles() {
    particles.forEach(p => {
        p.r = 0.02 + Math.random() * 0.15;
        p.state = "free";
    });
}

// Sliders y Botones
btnStart.addEventListener("click", () => { running = true; startTimer(); });
btnPause.addEventListener("click", () => { running = false; stopTimer(); });
btnReset.addEventListener("click", () => {
    running = false;
    currentRPM = 0;
    rotorAngle = 0;
    rotor.setAttribute("rotation", "0 0 0");
    resetParticles();
    resetTimer();
});

document.getElementById("rpmSlider").addEventListener("input", (e) => {
    targetRPM = Number(e.target.value);
    document.getElementById("rpmValue").textContent = targetRPM + " RPM";
});
document.getElementById("radiusSlider").addEventListener("input", (e) => {
    process.radius = Number(e.target.value);
    document.getElementById("radiusValue").textContent = process.radius.toFixed(2) + " m";
});
document.getElementById("densitySlider").addEventListener("input", (e) => {
    process.densityDifference = Number(e.target.value);
    document.getElementById("densityValue").textContent = process.densityDifference + " kg/m³";
});
document.getElementById("particleSlider").addEventListener("input", (e) => {
    process.particleDiameter = Number(e.target.value);
    document.getElementById("particleValue").textContent = process.particleDiameter + " μm";
});
document.getElementById("viscositySlider").addEventListener("input", (e) => {
    process.viscosity = Number(e.target.value);
    document.getElementById("viscosityValue").textContent = process.viscosity.toFixed(1) + " cP";
});

/* ===========================================================
      CONTROL TÁCTIL (ROTACIÓN LIBRE 360)
=========================================================== */
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const centrifugeContainer = document.getElementById("centrifuge");

function startDrag(e) {
    if (e.target.closest('#dashboard') || e.target.closest('#floatingButtons') || e.target.closest('#infoModal')) return;
    isDragging = true;
    previousMousePosition = { x: e.touches ? e.touches[0].clientX : e.clientX, y: e.touches ? e.touches[0].clientY : e.clientY };
}

function stopDrag() { isDragging = false; }

function drag(e) {
    if (!isDragging || !markerDetected) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaMove = { x: clientX - previousMousePosition.x, y: clientY - previousMousePosition.y };
    const currentRotation = centrifugeContainer.getAttribute("rotation");
    
    centrifugeContainer.setAttribute("rotation", {
        x: currentRotation.x + deltaMove.y * 0.5,
        y: currentRotation.y + deltaMove.x * 0.5,
        z: currentRotation.z
    });

    previousMousePosition = { x: clientX, y: clientY };
}

document.addEventListener("mousedown", startDrag);
document.addEventListener("mouseup", stopDrag);
document.addEventListener("mousemove", drag);
document.addEventListener("touchstart", startDrag, { passive: false });
document.addEventListener("touchend", stopDrag);
document.addEventListener("touchmove", drag, { passive: false });

// Loop de Animación
let previousTime = performance.now();
function animate(now) {
    const delta = (now - previousTime) / 1000;
    previousTime = now;
    
    calculatePhysics();
    updateRotor(delta);
    updateParticles(delta);
    updateDashboard();
    
    requestAnimationFrame(animate);
}

window.addEventListener("load", () => {
    createParticles();
    calculatePhysics();
    updateDashboard();
    requestAnimationFrame(animate);
});
