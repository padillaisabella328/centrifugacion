/* ===========================================================
      SIMULADOR DE CENTRÍFUGA (DOS TIPOS DE PARTÍCULAS)
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

function updateDashboard() {
    document.getElementById("omegaValue").textContent = process.omega.toFixed(1);
    document.getElementById("gValue").textContent = process.factorG.toFixed(0);
    document.getElementById("forceValue").textContent = process.centrifugalForce.toFixed(2);
    document.getElementById("velocityValue").textContent = (process.sedimentationVelocity * 1000).toFixed(2);
    document.getElementById("accelerationValue").textContent = process.acceleration.toFixed(0);
    document.getElementById("powerValue").textContent = process.efficiency.toFixed(0) + " %";
}

let load = 0;
const loaderAnimation = setInterval(() => {
    load += Math.random() * 12;
    if (load >= 100) {
        load = 100;
        clearInterval(loaderAnimation);
        setTimeout(() => { loader.style.opacity = "0"; setTimeout(() => loader.style.display = "none", 600); }, 300);
    }
    loaderProgress.style.width = load + "%";
}, 60);

dashboardHandle.addEventListener("click", () => dashboard.classList.toggle("open"));
btnMenu.addEventListener("click", () => dashboard.classList.toggle("open"));

const infoModal = document.getElementById("infoModal");
btnInfo.onclick = () => infoModal.style.display = "flex";
document.getElementById("closeInfo").onclick = () => infoModal.style.display = "none";
window.onclick = (e) => { if(e.target === infoModal) infoModal.style.display = "none"; };

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

function calculatePhysics() {
    process.omega = 2 * Math.PI * (targetRPM / 60);
    process.acceleration = process.radius * process.omega * process.omega;
    process.factorG = process.acceleration / gravity;
    process.centrifugalForce = process.densityDifference * process.acceleration * 1e-9;
    
    process.sedimentationVelocity = (process.densityDifference * process.acceleration * Math.pow(process.particleDiameter * 1e-6, 2)) / (18 * process.viscosity * 0.001);
    process.efficiency = Math.min(100, process.factorG / 12);
}

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
    rotorAngle += (currentRPM * 6) * delta; 
    rotor.setAttribute("rotation", `0 ${rotorAngle} 0`);
}

/* ===========================================================
      SISTEMA DIFERENCIAL DE PARTÍCULAS
=========================================================== */
const PARTICLES_COUNT = 300; 
let DRUM_MAX_RADIUS = 0.29; // Ahora es variable para poder cambiarla
let particles = [];

function createParticles() {
    const container = document.getElementById("particles1");
    particles = [];
    
    for (let i = 0; i < PARTICLES_COUNT; i++) {
        const p = document.createElement("a-sphere");
        
        // Alternar entre tipo A (Rojas/Grandes) y Tipo B (Moradas/Pequeñas)
        const isTypeA = i % 2 === 0; 
        
        const angle = Math.random() * Math.PI * 2;
        const r = 0.02 + Math.random() * (DRUM_MAX_RADIUS - 0.1); 
        const y = (Math.random() * 0.38) - 0.19; 
        
        // Tamaños base visuales
        const baseSize = isTypeA ? 0.006 : 0.0035;
        // Colores de alto contraste
        const color = isTypeA ? "#ff3333" : "#7a28cb"; 
        
        p.setAttribute("radius", baseSize);
        p.setAttribute("color", color);
        
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        
        p.object3D.position.set(x, y, z);
        container.appendChild(p);
        
        particles.push({
            entity: p,
            type: isTypeA ? 'A' : 'B',
            baseSize: baseSize,
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
            // Las rojas (Tipo A) viajan al 100% de la velocidad, las moradas (Tipo B) al 35%
            const speedMultiplier = p.type === 'A' ? 1.0 : 0.35;
            p.r += (process.sedimentationVelocity * speedMultiplier) * delta * 20; 
            
            if (p.r >= DRUM_MAX_RADIUS) {
                p.r = DRUM_MAX_RADIUS;
                p.state = "sedimented"; 
            }
        }
        
        const x = Math.cos(p.angle) * p.r;
        const z = Math.sin(p.angle) * p.r;
        p.entity.object3D.position.set(x, p.y, z);
    });
}

function resetParticles() {
    particles.forEach(p => {
        p.r = 0.02 + Math.random() * (DRUM_MAX_RADIUS - 0.1);
        p.state = "free";
    });
}

/* ===========================================================
      EVENTOS DE INTERFAZ Y ESCALADO 3D DILÁMICO
=========================================================== */
// Botón Play sin candado de cámara para que pruebes tranquilo
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

// ESCALADO DEL RADIO
document.getElementById("radiusSlider").addEventListener("input", (e) => {
    process.radius = Number(e.target.value);
    document.getElementById("radiusValue").textContent = process.radius.toFixed(2) + " m";
    
    // Cambiamos el tamaño físico de las piezas del tambor en el 3D
    document.getElementById("drumWall").setAttribute("radius", process.radius);
    document.getElementById("drumBase").setAttribute("radius", process.radius);
    document.getElementById("drumRing").setAttribute("radius", process.radius);
    
    // El fluido es un poquito más pequeño que el cristal
    DRUM_MAX_RADIUS = process.radius - 0.01;
    document.getElementById("fluid").setAttribute("radius", DRUM_MAX_RADIUS);
    
    // Si al encoger el radio hay partículas por fuera, las metemos a la fuerza
    particles.forEach(p => {
        if (p.r > DRUM_MAX_RADIUS) p.r = DRUM_MAX_RADIUS;
    });
});

document.getElementById("densitySlider").addEventListener("input", (e) => {
    process.densityDifference = Number(e.target.value);
    document.getElementById("densityValue").textContent = process.densityDifference + " kg/m³";
});

// ESCALADO DE LAS PARTÍCULAS
document.getElementById("particleSlider").addEventListener("input", (e) => {
    process.particleDiameter = Number(e.target.value);
    document.getElementById("particleValue").textContent = process.particleDiameter + " μm";
    
    // Factor de escala (40 es nuestro valor por defecto)
    const scaleFactor = process.particleDiameter / 40;
    
    // Actualizamos el radio 3D de todas las esferas
    particles.forEach(p => {
        p.entity.setAttribute("radius", p.baseSize * scaleFactor);
    });
});

document.getElementById("viscositySlider").addEventListener("input", (e) => {
    process.viscosity = Number(e.target.value);
    document.getElementById("viscosityValue").textContent = process.viscosity.toFixed(1) + " cP";
});

/* ===========================================================
      CONTROL TÁCTIL (ROTACIÓN LIBRE)
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
    if (!isDragging) return; // Quitamos el bloqueo del marcador aquí también
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
