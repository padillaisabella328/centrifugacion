/* ========================================================= */
/*          SIMULADOR DE CENTRIFUGACIÓN AR                   */
/*                     app.js                                */
/* ========================================================= */

"use strict";

/* ========================================================= */
/*                 VARIABLES GLOBALES                        */
/* ========================================================= */

const rpmSlider = document.getElementById("rpmSlider");
const radiusSlider = document.getElementById("radiusSlider");
const densitySlider = document.getElementById("densitySlider");
const particleSlider = document.getElementById("particleSlider");
const viscositySlider = document.getElementById("viscositySlider");

const rpmValue = document.getElementById("rpmValue");
const radiusValue = document.getElementById("radiusValue");
const densityValue = document.getElementById("densityValue");
const particleValue = document.getElementById("particleValue");
const viscosityValue = document.getElementById("viscosityValue");

const omegaValue = document.getElementById("omegaValue");
const gValue = document.getElementById("gValue");
const forceValue = document.getElementById("forceValue");
const velocityValue = document.getElementById("velocityValue");
const accelerationValue = document.getElementById("accelerationValue");
const powerValue = document.getElementById("powerValue");

const efficiencyFill = document.getElementById("efficiencyFill");
const efficiencyText = document.getElementById("efficiencyText");

const statusText = document.getElementById("statusText");
const statusLed = document.getElementById("statusLed");

const loader = document.getElementById("loader");
const progressFill = document.getElementById("progressFill");

const markerOverlay = document.getElementById("markerOverlay");

const rotor = document.getElementById("rotor");
const hiroMarker = document.getElementById("hiroMarker");

const particleSystem = document.getElementById("particleSystem");

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");

const timerElement = document.getElementById("timer");

/* ========================================================= */
/*                  VARIABLES DE SIMULACIÓN                  */
/* ========================================================= */

let rpm = 450;

let radius = 0.30;

let densityDifference = 800;

let particleDiameter = 40;

let viscosity = 1.0;

let omega = 0;

let factorG = 0;

let migrationVelocity = 0;

let centrifugalForce = 0;

let efficiency = 0;

let running = false;

let markerVisible = false;

let rotationAngle = 0;

let timerSeconds = 0;

let timerInterval = null;

const gravity = 9.81;

/* ========================================================= */
/*                BARRA DE CARGA                             */
/* ========================================================= */

let load = 0;

const loaderAnimation = setInterval(() => {

    load += 2;

    progressFill.style.width = load + "%";

    if(load >= 100){

        clearInterval(loaderAnimation);

        setTimeout(()=>{

            loader.style.opacity = "0";

            loader.style.pointerEvents = "none";

        },400);

    }

},40);

/* ========================================================= */
/*                ACTUALIZAR SLIDERS                         */
/* ========================================================= */

function updateSliderLabels(){

    rpmValue.textContent =
        rpmSlider.value + " RPM";

    radiusValue.textContent =
        Number(radiusSlider.value).toFixed(2) + " m";

    densityValue.textContent =
        densitySlider.value + " kg/m³";

    particleValue.textContent =
        particleSlider.value + " μm";

    viscosityValue.textContent =
        Number(viscositySlider.value).toFixed(1);

}
/* ========================================================= */
/*              CÁLCULOS DE LA SIMULACIÓN                    */
/* ========================================================= */

function calculateProcess(){

    rpm = Number(rpmSlider.value);

    radius = Number(radiusSlider.value);

    densityDifference = Number(densitySlider.value);

    particleDiameter = Number(particleSlider.value) * 1e-6;

    viscosity = Number(viscositySlider.value) / 1000;

    /* -------------------------------------- */
    /* Velocidad angular                      */
    /* -------------------------------------- */

    omega = (2 * Math.PI * rpm) / 60;

    /* -------------------------------------- */
    /* Factor G                              */
    /* -------------------------------------- */

    factorG =
        (omega * omega * radius) / gravity;

    /* -------------------------------------- */
    /* Aceleración centrífuga                 */
    /* -------------------------------------- */

    const acceleration =
        omega * omega * radius;

    /* -------------------------------------- */
    /* Masa aproximada de partícula           */
    /* -------------------------------------- */

    const particleDensity = 2500;

    const volume =
        (4 / 3) *
        Math.PI *
        Math.pow(particleDiameter / 2, 3);

    const mass =
        particleDensity *
        volume;

    /* -------------------------------------- */
    /* Fuerza centrífuga                      */
    /* -------------------------------------- */

    centrifugalForce =
        mass *
        acceleration;

    /* -------------------------------------- */
    /* Velocidad de sedimentación             */
    /* Ley de Stokes                          */
    /* -------------------------------------- */

    migrationVelocity =
        (
            Math.pow(particleDiameter,2) *
            densityDifference *
            omega *
            omega *
            radius
        ) /
        (
            18 *
            viscosity
        );

    /* -------------------------------------- */
    /* Eficiencia estimada                    */
    /* -------------------------------------- */

    efficiency =
        Math.min(
            100,
            (
                factorG /
                1200
            ) *
            100
        );

    updateDashboard(
        acceleration
    );

}

/* ========================================================= */
/*              ACTUALIZAR INTERFAZ                          */
/* ========================================================= */

function updateDashboard(acceleration){

    omegaValue.textContent =
        omega.toFixed(2);

    gValue.textContent =
        factorG.toFixed(0);

    forceValue.textContent =
        (
            centrifugalForce *
            1000000000
        ).toFixed(2);

    velocityValue.textContent =
        (
            migrationVelocity *
            1000
        ).toFixed(2);

    accelerationValue.textContent =
        acceleration.toFixed(1);

    powerValue.textContent =
        efficiency.toFixed(0);

    efficiencyFill.style.width =
        efficiency + "%";

    efficiencyText.textContent =
        efficiency.toFixed(0) + " %";

}

/* ========================================================= */
/*              EVENTOS DE LOS SLIDERS                       */
/* ========================================================= */

rpmSlider.addEventListener("input",()=>{

    updateSliderLabels();

    calculateProcess();

});

radiusSlider.addEventListener("input",()=>{

    updateSliderLabels();

    calculateProcess();

});

densitySlider.addEventListener("input",()=>{

    updateSliderLabels();

    calculateProcess();

});

particleSlider.addEventListener("input",()=>{

    updateSliderLabels();

    calculateProcess();

});

viscositySlider.addEventListener("input",()=>{

    updateSliderLabels();

    calculateProcess();

});

/* ========================================================= */
/*             INICIALIZACIÓN                                */
/* ========================================================= */

updateSliderLabels();

calculateProcess();
/* ========================================================= */
/*          ANIMACIÓN DEL ROTOR                              */
/* ========================================================= */

function animateRotor(){

    if(running && markerVisible){

        rotationAngle += rpm * 0.12;

        rotor.setAttribute(
            "rotation",
            "0 " + rotationAngle + " 0"
        );

    }

    requestAnimationFrame(animateRotor);

}

animateRotor();

/* ========================================================= */
/*              SISTEMA DE PARTÍCULAS                        */
/* ========================================================= */

const particles = [];

const NUMBER_OF_PARTICLES = 80;

function createParticles(){

    for(let i=0;i<NUMBER_OF_PARTICLES;i++){

        const particle =
            document.createElement("a-sphere");

        particle.setAttribute("radius","0.008");

        particle.setAttribute(
            "color",
            Math.random()>0.5 ?
            "#00d8ff":
            "#ffbb00"
        );

        particle.setAttribute(
            "opacity",
            "0.9"
        );

        particle.setAttribute(
            "metalness",
            "0.15"
        );

        particleSystem.appendChild(
            particle
        );

        particles.push({

            element:particle,

            angle:Math.random()*Math.PI*2,

            radius:Math.random()*0.05,

            height:(Math.random()-0.5)*0.35,

            speed:0.005+Math.random()*0.01,

            phase:Math.random()*Math.PI*2

        });

    }

}

createParticles();

/* ========================================================= */
/*          ACTUALIZACIÓN DE PARTÍCULAS                      */
/* ========================================================= */

function updateParticles(){

    if(!markerVisible){

        requestAnimationFrame(updateParticles);

        return;

    }

    particles.forEach(p=>{

        if(running){

            p.angle +=
                p.speed *
                (rpm/400);

            p.radius +=
                migrationVelocity *
                0.0007;

            if(p.radius>0.24){

                p.radius=0.02;

                p.height=(Math.random()-0.5)*0.35;

            }

        }

        const x=
            Math.cos(p.angle)*
            p.radius;

        const z=
            Math.sin(p.angle)*
            p.radius;

        const y=
            p.height+
            Math.sin(
                p.angle*3+
                p.phase
            )*0.02;

        p.element.setAttribute(
            "position",
            `${x} ${y} ${z}`
        );

    });

    requestAnimationFrame(
        updateParticles
    );

}

updateParticles();

/* ========================================================= */
/*            CRONÓMETRO                                     */
/* ========================================================= */

function formatTime(seconds){

    const h=
    String(
        Math.floor(seconds/3600)
    ).padStart(2,"0");

    const m=
    String(
        Math.floor(
            (seconds%3600)/60
        )
    ).padStart(2,"0");

    const s=
    String(
        seconds%60
    ).padStart(2,"0");

    return `${h}:${m}:${s}`;

}

function startTimer(){

    clearInterval(
        timerInterval
    );

    timerInterval=
    setInterval(()=>{

        timerSeconds++;

        timerElement.textContent=
        formatTime(
            timerSeconds
        );

    },1000);

}

function stopTimer(){

    clearInterval(
        timerInterval
    );

}

function resetTimer(){

    stopTimer();

    timerSeconds=0;

    timerElement.textContent=
    "00:00:00";

}
/* ========================================================= */
/*             DETECCIÓN DEL MARCADOR HIRO                   */
/* ========================================================= */

hiroMarker.addEventListener("markerFound",()=>{

    markerVisible = true;

    markerOverlay.style.display = "none";

    statusText.textContent =
    "MARCADOR DETECTADO";

    statusLed.style.background =
    "#32d26b";

    statusLed.style.boxShadow =
    "0 0 18px #32d26b";

});

hiroMarker.addEventListener("markerLost",()=>{

    markerVisible = false;

    statusText.textContent =
    "BUSCANDO MARCADOR";

    statusLed.style.background =
    "#ff4545";

    statusLed.style.boxShadow =
    "0 0 18px #ff4545";

    markerOverlay.style.display =
    "flex";

});

/* ========================================================= */
/*              BOTÓN INICIAR                                */
/* ========================================================= */

startButton.addEventListener("click",()=>{

    if(!markerVisible){

        alert(
            "Primero detecte el marcador Hiro."
        );

        return;

    }

    running = true;

    startTimer();

    statusText.textContent =
    "CENTRÍFUGA EN OPERACIÓN";

    statusLed.style.background =
    "#32d26b";

    statusLed.style.boxShadow =
    "0 0 18px #32d26b";

});

/* ========================================================= */
/*              BOTÓN DETENER                                */
/* ========================================================= */

stopButton.addEventListener("click",()=>{

    running = false;

    stopTimer();

    statusText.textContent =
    "CENTRÍFUGA DETENIDA";

    statusLed.style.background =
    "#ffbb00";

    statusLed.style.boxShadow =
    "0 0 18px #ffbb00";

});

/* ========================================================= */
/*              BOTÓN REINICIAR                              */
/* ========================================================= */

resetButton.addEventListener("click",()=>{

    running = false;

    stopTimer();

    resetTimer();

    rotationAngle = 0;

    rotor.setAttribute(
        "rotation",
        "0 0 0"
    );

    rpmSlider.value = 450;

    radiusSlider.value = 0.30;

    densitySlider.value = 800;

    particleSlider.value = 40;

    viscositySlider.value = 1.0;

    updateSliderLabels();

    calculateProcess();

    statusText.textContent =
    "SISTEMA REINICIADO";

    statusLed.style.background =
    "#00d8ff";

    statusLed.style.boxShadow =
    "0 0 18px #00d8ff";

});

/* ========================================================= */
/*                PANTALLA COMPLETA                          */
/* ========================================================= */

document
.getElementById("fullscreenButton")
.addEventListener("click",()=>{

    if(!document.fullscreenElement){

        document.documentElement
        .requestFullscreen();

    }else{

        document.exitFullscreen();

    }

});

/* ========================================================= */
/*            PANEL COLAPSABLE                               */
/* ========================================================= */

const dashboard =
document.getElementById(
    "dashboard"
);

const collapseButton =
document.getElementById(
    "collapseButton"
);

collapseButton.addEventListener(
"click",()=>{

    dashboard.classList.toggle(
        "collapsed"
    );

});

/* ========================================================= */
/*                 MODAL EDUCATIVO                           */
/* ========================================================= */

const infoModal =
document.getElementById(
    "infoModal"
);

document
.getElementById("btnInfo")
.addEventListener("click",()=>{

    infoModal.style.display =
    "flex";

});

document
.getElementById("closeInfo")
.addEventListener("click",()=>{

    infoModal.style.display =
    "none";

});

window.addEventListener("click",(e)=>{

    if(e.target===infoModal){

        infoModal.style.display =
        "none";

    }

});
/* ========================================================= */
/*               EFECTOS VISUALES                            */
/* ========================================================= */

const scanRing =
document.getElementById(
    "scanRing"
);

const ledGreen =
document.getElementById(
    "ledGreen"
);

const ledRed =
document.getElementById(
    "ledRed"
);

const ledBlue =
document.getElementById(
    "ledBlue"
);

function updateEffects(){

    /* ------------------------------- */
    /* Giro del aro luminoso           */
    /* ------------------------------- */

    const angle =
    performance.now()*0.05;

    scanRing.setAttribute(
        "rotation",
        `-90 ${angle} 0`
    );

    /* ------------------------------- */
    /* Color de LEDs                   */
    /* ------------------------------- */

    if(rpm<300){

        ledGreen.setAttribute(
            "emissive",
            "#003300"
        );

        ledBlue.setAttribute(
            "emissive",
            "#00d8ff"
        );

        ledRed.setAttribute(
            "emissive",
            "#220000"
        );

    }

    else if(rpm<800){

        ledGreen.setAttribute(
            "emissive",
            "#32d26b"
        );

        ledBlue.setAttribute(
            "emissive",
            "#00d8ff"
        );

        ledRed.setAttribute(
            "emissive",
            "#220000"
        );

    }

    else{

        ledGreen.setAttribute(
            "emissive",
            "#32d26b"
        );

        ledBlue.setAttribute(
            "emissive",
            "#00d8ff"
        );

        ledRed.setAttribute(
            "emissive",
            "#ff4545"
        );

    }

    requestAnimationFrame(
        updateEffects
    );

}

updateEffects();

/* ========================================================= */
/*            GUARDAR CONFIGURACIÓN                          */
/* ========================================================= */

function saveConfiguration(){

    const config={

        rpm:rpmSlider.value,

        radius:radiusSlider.value,

        density:densitySlider.value,

        particle:particleSlider.value,

        viscosity:viscositySlider.value

    };

    localStorage.setItem(

        "centrifugeConfig",

        JSON.stringify(config)

    );

}

/* ========================================================= */
/*          CARGAR CONFIGURACIÓN                             */
/* ========================================================= */

function loadConfiguration(){

    const config=

    JSON.parse(

        localStorage.getItem(
            "centrifugeConfig"
        )

    );

    if(!config){

        return;

    }

    rpmSlider.value=config.rpm;

    radiusSlider.value=config.radius;

    densitySlider.value=config.density;

    particleSlider.value=config.particle;

    viscositySlider.value=config.viscosity;

    updateSliderLabels();

    calculateProcess();

}

loadConfiguration();

/* ========================================================= */
/*           GUARDADO AUTOMÁTICO                             */
/* ========================================================= */

[
    rpmSlider,
    radiusSlider,
    densitySlider,
    particleSlider,
    viscositySlider

].forEach(control=>{

    control.addEventListener(

        "change",

        saveConfiguration

    );

});

/* ========================================================= */
/*      VIBRACIÓN EN DISPOSITIVOS MÓVILES                    */
/* ========================================================= */

hiroMarker.addEventListener(

    "markerFound",

    ()=>{

        if(

            navigator.vibrate

        ){

            navigator.vibrate(

                120

            );

        }

    }

);

/* ========================================================= */
/*              INICIALIZACIÓN GENERAL                       */
/* ========================================================= */

window.addEventListener(

    "load",

    ()=>{

        updateSliderLabels();

        calculateProcess();

        statusText.textContent=

        "LISTO PARA ESCANEAR";

    }

);

/* ========================================================= */
/*                    FIN DEL APP.JS                         */
/* ========================================================= */