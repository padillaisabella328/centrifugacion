/* ===========================================================
   GEMELO DIGITAL DE CENTRIFUGACIÓN - SEPARACIÓN DIFERENCIAL
=========================================================== */

let running = false;
let markerDetected = false;
let rotorAngle = 0;
let currentRPM = 0;
let targetRPM = 450;
let elapsedTime = 0;
let timerInterval = null;
const gravity = 9.81;

let process = {
    radius : 0.30,
    densityDifference : 800,
    particleDiameter : 40,
    viscosity : 1.0, 
    omega : 0,
    factorG : 0,
    nominalAcceleration : 0,
    nominalStokesVelocity : 0,
    reynoldsParticle : 0,
    flowRegime : "Laminar",
    cakeThickness: 0 
};

let PARTICLES_COUNT = 350; 
let DRUM_MAX_RADIUS = 0.29; 
const MAX_CAKE_THICKNESS = 0.04; 
let particles = [];
const rho_fluid = 1000; 

const rotor = document.getElementById("rotor");
const marker = document.getElementById("hiroMarker");
const loader = document.getElementById("loader");
const loaderProgress = document.getElementById("loaderProgress");
const dashboard = document.getElementById("dashboard");

const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");
const btnInfo = document.getElementById("btnInfo");
const btnMenu = document.getElementById("btnMenu");

const statusLed = document.getElementById("statusLed");
const statusText = document.getElementById("statusText");
const timer = document.getElementById("timer");

function updateDashboard() {
    const omegaEl = document.getElementById("omegaValue");
    const gEl = document.getElementById("gValue");
    const velEl = document.getElementById("velocityValue");
    const reyEl = document.getElementById("reynoldsValue");
    const regEl = document.getElementById("regimeValue");
    const cakeEl = document.getElementById("cakeValue");

    if (omegaEl) omegaEl.textContent = process.omega.toFixed(1);
    if (gEl) gEl.textContent = process.factorG.toFixed(0);
    if (velEl) velEl.textContent = (process.nominalStokesVelocity * 1000).toFixed(2);
    
    if (reyEl) {
        let reFormat = process.reynoldsParticle < 0.01 ? process.reynoldsParticle.toExponential(2) : process.reynoldsParticle.toFixed(3);
        reyEl.textContent = reFormat;
    }
    
    if (regEl) {
        regEl.textContent = process.flowRegime;
        if(process.flowRegime === "Laminar") regEl.style.color = "#32d26b";
        else if(process.flowRegime === "Transición") regEl.style.color = "#ffc107";
        else regEl.style.color = "#ff4545";
    }

    if (cakeEl) cakeEl.textContent = (process.cakeThickness * 1000).toFixed(1);
}

let load = 0;
const loaderAnimation = setInterval(() => {
    load += Math.random() * 12;
    if (load >= 100) {
        load = 100;
        clearInterval(loaderAnimation);
        setTimeout(() => { loader.style.opacity = "0"; setTimeout(() => loader.style.display = "none", 600); }, 300);
    }
    if (loaderProgress) loaderProgress.style.width = load + "%";
}, 60);

if (document.getElementById("dashboardHandle")) document.getElementById("dashboardHandle").addEventListener("click", () => dashboard.classList.toggle("open"));
if (btnMenu) btnMenu.addEventListener("click", () => dashboard.classList.toggle("open"));

const infoModal = document.getElementById("infoModal");
if (btnInfo) btnInfo.onclick = () => infoModal.style.display = "flex";
if (document.getElementById("closeInfo")) document.getElementById("closeInfo").onclick = () => infoModal.style.display = "none";
window.onclick = (e) => { if(e.target === infoModal) infoModal.style.display = "none"; };

if (marker) {
    marker.addEventListener("markerFound", () => {
        markerDetected = true;
        if (statusText) statusText.textContent = "Tambor detectado";
        if (statusLed) {
            statusLed.style.background = "#32d26b";
            statusLed.style.boxShadow = "0 0 18px #32d26b";
        }
    });
    marker.addEventListener("markerLost", () => {
        markerDetected = false;
        if (statusText) statusText.textContent = "Buscando marcador";
        if (statusLed) {
            statusLed.style.background = "#ff4545";
            statusLed.style.boxShadow = "0 0 18px #ff4545";
        }
    });
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedTime++;
        const h = Math.floor(elapsedTime / 3600);
        const m = Math.floor((elapsedTime % 3600) / 60);
        const s = elapsedTime % 60;
        if (timer) timer.textContent = String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
    }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }
function resetTimer() { elapsedTime = 0; if (timer) timer.textContent = "00:00:00"; }

function calculatePhysics() {
    process.omega = 2 * Math.PI * (targetRPM / 60);
    process.nominalAcceleration = process.radius * process.omega * process.omega;
    process.factorG = process.nominalAcceleration / gravity;
    
    const dp_meters = process.particleDiameter * 1e-6;
    const mu_pascales = process.viscosity * 0.001; 

    process.nominalStokesVelocity = (process.densityDifference * process.nominalAcceleration * Math.pow(dp_meters, 2)) / (18 * mu_pascales);
    process.reynoldsParticle = (rho_fluid * process.nominalStokesVelocity * dp_meters) / mu_pascales;

    if (process.reynoldsParticle < 0.2) process.flowRegime = "Laminar";
    else if (process.reynoldsParticle < 500) process.flowRegime = "Transición";
    else process.flowRegime = "Turbulento";
}

const ACCELERATION = 250;
function updateRotor(delta) {
    if (currentRPM < targetRPM) {
        currentRPM += ACCELERATION * delta;
        if (currentRPM > targetRPM) currentRPM = targetRPM;
    } else if (currentRPM > targetRPM) {
        currentRPM -= ACCELERATION * delta;
        if (currentRPM < targetRPM) currentRPM = targetRPM;
    }
    rotorAngle += (currentRPM * 6) * delta; 
    if (rotor) rotor.setAttribute("rotation", `0 ${rotorAngle} 0`);
}

function createParticles() {
    const container = document.getElementById("particles1");
    if (!container) return;
    
    container.innerHTML = "";
    particles = [];
    const currentScale = process.particleDiameter / 40;

    for (let i = 0; i < PARTICLES_COUNT; i++) {
        const p = document.createElement("a-sphere");
        const isTypeA = i % 2 === 0; 
        
        const angle = Math.random() * Math.PI * 2;
        const r = 0.02 + Math.random() * (DRUM_MAX_RADIUS - 0.1); 
        const y = (Math.random() * 0.38) - 0.19; 
        
        // CORRECCIÓN: Partículas pesadas (Rojas) claramente más grandes que las ligeras (Moradas)
        const baseSize = isTypeA ? 0.007 : 0.0025;
        const color = isTypeA ? "#ff5252" : "#a855f7"; 
        const cakeColor = isTypeA ? "#991b1b" : "#4c1d95"; 
        
        p.setAttribute("radius", baseSize * currentScale);
        p.setAttribute("color", color);
        p.setAttribute("metalness", "0.2"); 
        
        p.object3D.position.set(Math.cos(angle)*r, y, Math.sin(angle)*r);
        container.appendChild(p);
        
        particles.push({
            entity: p,
            type: isTypeA ? 'A' : 'B',
            baseSize: baseSize,
            originalColor: color,
            cakeColor: cakeColor,
            angle: angle,
            r: r,
            y: y,
            state: "free"
        });
    }
}

function updateEngineeringParticles(delta) {
    if (PARTICLES_COUNT === 0) return; 
    
    let sedimentedCount = 0;
    
    const n_exponent = process.reynoldsParticle < 0.2 ? 4.65 : 2.5;
    const vFree = process.nominalStokesVelocity * Math.pow((1 - 0.05), n_exponent);
    const vDense = process.nominalStokesVelocity * Math.pow((1 - 0.45), n_exponent);
    
    const omegaSq = process.omega * process.omega;
    const nomAccel = process.nominalAcceleration;
    const currentRadiusLimit = DRUM_MAX_RADIUS - process.cakeThickness;

    particles.forEach(p => {
        if (p.state === "free") {
            const localAcceleration = omegaSq * p.r;
            const positionCorrection = nomAccel > 0 ? (localAcceleration / nomAccel) : 0;
            const hinderedVelocity = (p.r > currentRadiusLimit - 0.02) ? vDense : vFree;
            
            // CORRECCIÓN FÍSICA VISUAL: Las rojas viajan al 100%, las moradas al 3% (flotan en el fluido)
            const sizeMultiplier = p.type === 'A' ? 1.0 : 0.03;
            
            p.r += (hinderedVelocity * sizeMultiplier * positionCorrection) * delta * 25; 
            
            // Solo forman parte de la "Torta" sólida las que alcanzan el radio límite
            if (p.r >= currentRadiusLimit) {
                p.r = currentRadiusLimit;
                p.state = "cake"; 
                const mesh = p.entity.getObject3D('mesh');
                if (mesh && mesh.material) mesh.material.color.set(p.cakeColor);
            }
        }
        
        if (p.state === "cake") {
            sedimentedCount++;
            p.r = currentRadiusLimit; 
        }

        p.entity.object3D.position.set(Math.cos(p.angle) * p.r, p.y, Math.sin(p.angle) * p.r);
    });

    // La torta ahora crece basada únicamente en la masa de las partículas pesadas sedimentadas
    process.cakeThickness = (sedimentedCount / (PARTICLES_COUNT / 2)) * MAX_CAKE_THICKNESS;
    // Límite de seguridad visual
    if (process.cakeThickness > MAX_CAKE_THICKNESS) process.cakeThickness = MAX_CAKE_THICKNESS;
}

function resetParticles() {
    process.cakeThickness = 0;
    particles.forEach(p => {
        p.r = 0.02 + Math.random() * (DRUM_MAX_RADIUS - 0.1);
        p.state = "free";
        const mesh = p.entity.getObject3D('mesh');
        if (mesh && mesh.material) mesh.material.color.set(p.originalColor);
        p.entity.object3D.position.set(Math.cos(p.angle) * p.r, p.y, Math.sin(p.angle) * p.r);
    });
}

if (btnStart) btnStart.addEventListener("click", () => { running = true; startTimer(); });
if (btnPause) btnPause.addEventListener("click", () => { running = false; stopTimer(); });
if (btnReset) {
    btnReset.addEventListener("click", () => {
        running = false;
        currentRPM = 0;
        rotorAngle = 0;
        if (rotor) rotor.setAttribute("rotation", "0 0 0");
        resetParticles();
        resetTimer();
        updateDashboard();
    });
}

if (document.getElementById("rpmSlider")) {
    document.getElementById("rpmSlider").addEventListener("input", (e) => {
        targetRPM = Number(e.target.value);
        document.getElementById("rpmValue").textContent = targetRPM + " RPM";
    });
}

if (document.getElementById("radiusSlider")) {
    document.getElementById("radiusSlider").addEventListener("input", (e) => {
        process.radius = Number(e.target.value);
        document.getElementById("radiusValue").textContent = process.radius.toFixed(2) + " m";
        
        const dWall = document.getElementById("drumWall");
        const dBase = document.getElementById("drumBase");
        const dRing = document.getElementById("drumRing");
        const fld = document.getElementById("fluid");

        if (dWall) dWall.setAttribute("radius", process.radius);
        if (dBase) dBase.setAttribute("radius", process.radius);
        if (dRing) dRing.setAttribute("radius", process.radius);
        
        DRUM_MAX_RADIUS = process.radius - 0.01;
        if (fld) fld.setAttribute("radius", DRUM_MAX_RADIUS);
        
        particles.forEach(p => { if (p.r > DRUM_MAX_RADIUS) p.r = DRUM_MAX_RADIUS; });
    });
}

if (document.getElementById("particleCountSlider")) {
    document.getElementById("particleCountSlider").addEventListener("input", (e) => {
        PARTICLES_COUNT = Number(e.target.value);
        document.getElementById("particleCountValue").textContent = PARTICLES_COUNT + " unidades";
        process.cakeThickness = 0; 
        createParticles(); 
    });
}

if (document.getElementById("densitySlider")) {
    document.getElementById("densitySlider").addEventListener("input", (e) => {
        process.densityDifference = Number(e.target.value);
        document.getElementById("densityValue").textContent = process.densityDifference + " kg/m³";
    });
}

if (document.getElementById("particleSlider")) {
    document.getElementById("particleSlider").addEventListener("input", (e) => {
        process.particleDiameter = Number(e.target.value);
        document.getElementById("particleValue").textContent = process.particleDiameter + " μm";
        const scaleFactor = process.particleDiameter / 40;
        particles.forEach(p => { p.entity.setAttribute("radius", p.baseSize * scaleFactor); });
    });
}

if (document.getElementById("viscositySlider")) {
    document.getElementById("viscositySlider").addEventListener("input", (e) => {
        process.viscosity = Number(e.target.value);
        document.getElementById("viscosityValue").textContent = process.viscosity.toFixed(1) + " cP";
    });
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let currentZoom = 1; 
let initialPinchDistance = null;
const centrifugeContainer = document.getElementById("centrifuge");

function startDrag(e) {
    if (e.target.closest('#dashboard') || e.target.closest('#floatingButtons') || e.target.closest('#infoModal')) return;
    if (e.touches && e.touches.length >= 2) return; 
    isDragging = true;
    previousMousePosition = { x: e.touches ? e.touches[0].clientX : e.clientX, y: e.touches ? e.touches[0].clientY : e.clientY };
}

function stopDrag(e) { 
    isDragging = false; 
    initialPinchDistance = null; 
}

function drag(e) {
    if (!centrifugeContainer) return;
    if (e.touches && e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

        if (initialPinchDistance == null) {
            initialPinchDistance = dist;
        } else {
            const delta = dist - initialPinchDistance;
            currentZoom += delta * 0.005; 
            currentZoom = Math.min(Math.max(0.4, currentZoom), 3.0); 
            centrifugeContainer.setAttribute("scale", `${currentZoom} ${currentZoom} ${currentZoom}`);
            initialPinchDistance = dist; 
        }
        return; 
    }
    if (!isDragging) return; 
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

document.addEventListener("wheel", (e) => {
    if (e.target.closest('#dashboard') || e.target.closest('#floatingButtons') || e.target.closest('#infoModal')) return;
    currentZoom += e.deltaY * -0.001;
    currentZoom = Math.min(Math.max(0.4, currentZoom), 3.0); 
    if (centrifugeContainer) centrifugeContainer.setAttribute("scale", `${currentZoom} ${currentZoom} ${currentZoom}`);
});

document.addEventListener("mousedown", startDrag);
document.addEventListener("mouseup", stopDrag);
document.addEventListener("mousemove", drag);
document.addEventListener("touchstart", startDrag, { passive: false });
document.addEventListener("touchend", stopDrag);
document.addEventListener("touchmove", drag, { passive: false });

let previousTime = performance.now();

function animate(now) {
    let delta = (now - previousTime) / 1000;
    previousTime = now;
    if (delta > 0.1) delta = 0.1; 
    calculatePhysics(); 

    if (running) {
        updateRotor(delta);
        updateEngineeringParticles(delta);
    }
    
    updateDashboard();
    requestAnimationFrame(animate);
}

window.addEventListener("load", () => {
    createParticles();
    calculatePhysics();
    updateDashboard();
    requestAnimationFrame(animate);
});
