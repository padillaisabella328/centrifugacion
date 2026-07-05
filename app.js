/* ===========================================================
      SIMULADOR DEL FENÓMENO DE CENTRIFUGACIÓN
=========================================================== */

let running = false;
let markerDetected = false;
let rotorAngle = 0;
let currentRPM = 0;
let targetRPM = 450;
let elapsedTime = 0;
let timerInterval = null;
const gravity = 9.81;

// Parámetros termodinámicos y físicos
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
const pellet = document.getElementById("pellet");

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

// Loader
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

// Menús y Modal
dashboardHandle.addEventListener("click", () => dashboard.classList.toggle("open"));
btnMenu.addEventListener("click", () => dashboard.classList.toggle("open"));

const infoModal = document.getElementById("infoModal");
btnInfo.onclick = () => infoModal.style.display = "flex";
document.getElementById("closeInfo").onclick = () => infoModal.style.display = "none";
window.onclick = (e) => { if(e.target === infoModal) infoModal.style.display = "none"; };

// Marcador AR
marker.addEventListener("markerFound", () => {
    markerDetected = true;
    statusText.textContent = "Volumen detectado";
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

// Física Básica
function calculatePhysics() {
    process.omega = 2 * Math.PI * (targetRPM / 60);
    process.acceleration = process.radius * process.omega * process.omega;
    process.factorG = process.acceleration / gravity;
    process.centrifugalForce = process.densityDifference * process.acceleration * 1e-9;
    
    // Ley de Stokes
    process.sedimentationVelocity = 
        (process.densityDifference * process.acceleration * Math.pow(process.particleDiameter * 1e-6, 2)) / 
        (18 * process.viscosity * 0.001);
        
    process.efficiency = Math.min(100, process.factorG / 12);
}

// Aceleración visual del brazo
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
    
    // Giramos lentamente para no marear al usuario y que aprecie el fenómeno radial
    rotorAngle += (currentRPM * 0.2) * delta;
    rotor.setAttribute("rotation", `0 ${rotorAngle} 0`);
}

/* ===========================================================
      SISTEMA DE PARTÍCULAS (MIGRACIÓN RADIAL)
=========================================================== */
const PARTICLES_COUNT = 300; // Alta densidad para formar el pellet
let particles = [];
let pelletHeight = 0;
const MAX_PELLET_HEIGHT = 0.05; 

function createParticles() {
    const container = document.getElementById("particles1");
    particles = [];
    
    for (let i = 0; i < PARTICLES_COUNT; i++) {
        const p = document.createElement("a-sphere");
        
        // Distribuir en el interior del cilindro (altura de -0.11 a 0.11)
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.035;
        const y = (Math.random() * 0.22) - 0.11; 
        
        // Tamaños variados para simular heterogeneidad
        const pSize = 0.0015 + Math.random() * 0.0015;
        
        p.setAttribute("radius", pSize);
        p.setAttribute("color", "#d4af37");
        p.object3D.position.set(Math.cos(angle)*radius, y, Math.sin(angle)*radius);
        
        container.appendChild(p);
        
        particles.push({
            entity: p,
            localX: Math.cos(angle)*radius,
            localY: y,
            localZ: Math.sin(angle)*radius,
            state: "free"
        });
    }
}

function updateParticles(delta) {
    let sedimentedCount = 0;
    
    particles.forEach(p => {
        if (running && p.state === "free") {
            // Migración hacia el fondo del tubo (el fondo es Y negativo por la rotación del tubo a -90z)
            // Se escala la velocidad matemática para que sea visualmente apreciable en segundos
            const migrationRate = process.sedimentationVelocity * delta * 15; 
            p.localY -= migrationRate;
            
            // Límite de colisión con el fondo o con el pellet en crecimiento
            const bottomLimit = -0.115 + pelletHeight;
            
            if (p.localY <= bottomLimit) {
                p.localY = bottomLimit;
                p.state = "sedimented";
                p.entity.setAttribute("visible", "false"); // Se oculta al integrarse al pellet
            }
        }
        
        if(p.state === "sedimented") {
            sedimentedCount++;
        } else {
            p.entity.object3D.position.set(p.localX, p.localY, p.localZ);
        }
    });

    // Crecimiento volumétrico del Pellet sólido
    if (running) {
        const targetPelletHeight = (sedimentedCount / PARTICLES_COUNT) * MAX_PELLET_HEIGHT;
        pelletHeight += (targetPelletHeight - pelletHeight) * 0.1; // Interpolación suave
        
        pellet.setAttribute("height", pelletHeight);
        // Desplazamiento del centroide del cilindro mientras crece
        pellet.setAttribute("position", `0 ${-0.115 + (pelletHeight/2)} 0`);
    }
}

function resetParticles() {
    pelletHeight = 0;
    pellet.setAttribute("height", "0");
    
    particles.forEach(p => {
        p.localY = (Math.random() * 0.22) - 0.11;
        p.state = "free";
        p.entity.setAttribute("visible", "true");
    });
}

// Botones y Sliders
btnStart.addEventListener("click", () => { if(!markerDetected) return; running = true; startTimer(); });
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

// Loop
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