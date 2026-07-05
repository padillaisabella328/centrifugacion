/* ===========================================================
      SIMULADOR DE CENTRIFUGACIÓN EN REALIDAD AUMENTADA
=========================================================== */

/* ===========================================================
                    VARIABLES GLOBALES
=========================================================== */

let running = false;

let markerDetected = false;

let rotorAngle = 0;

let currentRPM = 0;

let targetRPM = 450;

let elapsedTime = 0;

let timerInterval = null;

const gravity = 9.81;

/* ===========================================================
                  PARÁMETROS DEL PROCESO
=========================================================== */

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

/* ===========================================================
                  ELEMENTOS DEL DOM
=========================================================== */

const rotor =
document.getElementById("rotor");

const marker =
document.getElementById("hiroMarker");

const loader =
document.getElementById("loader");

const loaderProgress =
document.getElementById("loaderProgress");

const dashboard =
document.getElementById("dashboard");

const dashboardHandle =
document.getElementById("dashboardHandle");

/* ===========================================================
                    BOTONES
=========================================================== */

const btnStart =
document.getElementById("btnStart");

const btnPause =
document.getElementById("btnPause");

const btnReset =
document.getElementById("btnReset");

const btnInfo =
document.getElementById("btnInfo");

const btnMenu =
document.getElementById("btnMenu");

/* ===========================================================
                    INDICADORES
=========================================================== */

const statusLed =
document.getElementById("statusLed");

const statusText =
document.getElementById("statusText");

const timer =
document.getElementById("timer");

/* ===========================================================
                    SLIDERS
=========================================================== */

const rpmSlider =
document.getElementById("rpmSlider");

const radiusSlider =
document.getElementById("radiusSlider");

const densitySlider =
document.getElementById("densitySlider");

const particleSlider =
document.getElementById("particleSlider");

const viscositySlider =
document.getElementById("viscositySlider");

/* ===========================================================
                  VALORES DE LOS SLIDERS
=========================================================== */

const rpmValue =
document.getElementById("rpmValue");

const radiusValue =
document.getElementById("radiusValue");

const densityValue =
document.getElementById("densityValue");

const particleValue =
document.getElementById("particleValue");

const viscosityValue =
document.getElementById("viscosityValue");

/* ===========================================================
                TARJETAS DE RESULTADOS
=========================================================== */

const omegaValue =
document.getElementById("omegaValue");

const gValue =
document.getElementById("gValue");

const forceValue =
document.getElementById("forceValue");

const velocityValue =
document.getElementById("velocityValue");

const accelerationValue =
document.getElementById("accelerationValue");

const powerValue =
document.getElementById("powerValue");
/* ===========================================================
                    LOADER
=========================================================== */

let load = 0;

const loaderAnimation = setInterval(() => {

    load += Math.random() * 8;

    if (load >= 100) {

        load = 100;

        clearInterval(loaderAnimation);

        setTimeout(() => {

            loader.style.opacity = "0";

            setTimeout(() => {

                loader.style.display = "none";

            },600);

        },300);

    }

    loaderProgress.style.width = load + "%";

},80);

/* ===========================================================
                    DASHBOARD
=========================================================== */

dashboardHandle.addEventListener("click",()=>{

    dashboard.classList.toggle("open");

});

btnMenu.addEventListener("click",()=>{

    dashboard.classList.toggle("open");

});

/* ===========================================================
                MODAL INFORMACIÓN
=========================================================== */

const infoModal=document.getElementById("infoModal");

const closeInfo=document.getElementById("closeInfo");

btnInfo.onclick=()=>{

    infoModal.style.display="flex";

}

closeInfo.onclick=()=>{

    infoModal.style.display="none";

}

window.onclick=(e)=>{

    if(e.target===infoModal){

        infoModal.style.display="none";

    }

}

/* ===========================================================
            DETECCIÓN DEL MARCADOR HIRO
=========================================================== */

marker.addEventListener("markerFound",()=>{

    markerDetected=true;

    statusText.textContent="Marcador Hiro detectado";

    statusLed.style.background="#32d26b";

    statusLed.style.boxShadow="0 0 18px #32d26b";

});

marker.addEventListener("markerLost",()=>{

    markerDetected=false;

    statusText.textContent="Buscando marcador Hiro";

    statusLed.style.background="#ff4545";

    statusLed.style.boxShadow="0 0 18px #ff4545";

});

/* ===========================================================
                TEMPORIZADOR
=========================================================== */

function startTimer(){

    clearInterval(timerInterval);

    timerInterval=setInterval(()=>{

        elapsedTime++;

        const h=Math.floor(elapsedTime/3600);

        const m=Math.floor((elapsedTime%3600)/60);

        const s=elapsedTime%60;

        timer.textContent=

        String(h).padStart(2,"0")+":"+

        String(m).padStart(2,"0")+":"+

        String(s).padStart(2,"0");

    },1000);

}

function stopTimer(){

    clearInterval(timerInterval);

}

function resetTimer(){

    elapsedTime=0;

    timer.textContent="00:00:00";

}
/* ===========================================================
                ACELERACIÓN DEL ROTOR
=========================================================== */

const ACCELERATION = 250;

const DECELERATION = 320;

function updateRotor(delta){

    if(running){

        if(currentRPM < targetRPM){

            currentRPM += ACCELERATION * delta;

            if(currentRPM > targetRPM){

                currentRPM = targetRPM;

            }

        }

    }else{

        if(currentRPM > 0){

            currentRPM -= DECELERATION * delta;

            if(currentRPM < 0){

                currentRPM = 0;

            }

        }

    }

    rotorAngle += currentRPM * 6 * delta;

    rotor.setAttribute(

        "rotation",

        `0 ${rotorAngle} 0`

    );

}

/* ===========================================================
                CÁLCULOS DEL PROCESO
=========================================================== */

function calculatePhysics(){

    process.omega=

    2*Math.PI*(targetRPM/60);

    process.acceleration=

    process.radius*

    process.omega*

    process.omega;

    process.factorG=

    process.acceleration/

    gravity;

    process.centrifugalForce=

    process.densityDifference*

    process.acceleration*

    1e-9;

    process.sedimentationVelocity=

    (

        process.densityDifference*

        process.acceleration*

        Math.pow(process.particleDiameter*1e-6,2)

    )/

    (

        18*

        process.viscosity*

        0.001

    );

    process.efficiency=

    Math.min(

        100,

        process.factorG/

        12

    );

}

/* ===========================================================
                ACTUALIZAR DASHBOARD
=========================================================== */

function updateDashboard(){

    omegaValue.textContent=

    process.omega.toFixed(1);

    gValue.textContent=

    process.factorG.toFixed(0);

    forceValue.textContent=

    process.centrifugalForce.toFixed(2);

    velocityValue.textContent=

    (

        process.sedimentationVelocity*1000

    ).toFixed(2);

    accelerationValue.textContent=

    process.acceleration.toFixed(0);

    powerValue.textContent=

    process.efficiency.toFixed(0)+" %";

}
/* ===========================================================
                    SISTEMA DE PARTÍCULAS
=========================================================== */

const particleGroups = [];

const PARTICLES_PER_TUBE = 120;

/* ===========================================================
                CREAR PARTÍCULAS
=========================================================== */

function createParticles(){

    for(let tube=1;tube<=4;tube++){

        const container=document.getElementById(

            "particles"+tube

        );

        const particles=[];

        for(let i=0;i<PARTICLES_PER_TUBE;i++){

            const p=document.createElement("a-sphere");

            const angle=Math.random()*Math.PI*2;

            const radius=Math.random()*0.015;

            const y=(Math.random()-0.5)*0.09;

            p.setAttribute("radius",0.0035);

            p.setAttribute("color","#ffd54f");

            p.object3D.position.set(

                Math.cos(angle)*radius,

                y,

                Math.sin(angle)*radius

            );

            container.appendChild(p);

            particles.push({

                entity:p,

                angle:angle,

                radius:radius,

                y:y,

                state:"free"

            });

        }

        particleGroups.push(particles);

    }

}

/* ===========================================================
            ACTUALIZAR SEDIMENTACIÓN
=========================================================== */

function updateParticles(delta){

    particleGroups.forEach(group=>{

        group.forEach(p=>{

            /* velocidad de migración */

            if(running){

                if(p.state==="free"){

                    p.radius+=

                    process.sedimentationVelocity*

                    delta*

                    0.03;

                    if(p.radius>=0.022){

                        p.radius=0.022;

                        p.state="sediment";

                    }

                }

            }

            /* siguen girando con el tubo */

            p.angle+=

            process.omega*

            delta;

            p.entity.object3D.position.set(

                Math.cos(p.angle)*p.radius,

                p.y,

                Math.sin(p.angle)*p.radius

            );

        });

    });

}

/* ===========================================================
                REINICIAR PARTÍCULAS
=========================================================== */

function resetParticles(){

    particleGroups.forEach(group=>{

        group.forEach(p=>{

            p.radius=Math.random()*0.015;

            p.angle=Math.random()*Math.PI*2;

            p.y=(Math.random()-0.5)*0.09;

            p.state="free";

        });

    });

}
/* ===========================================================
                    EVENTOS DE BOTONES
=========================================================== */

btnStart.addEventListener("click",()=>{

    if(!markerDetected) return;

    running=true;

    startTimer();

});

btnPause.addEventListener("click",()=>{

    running=false;

    stopTimer();

});

btnReset.addEventListener("click",()=>{

    running=false;

    currentRPM=0;

    rotorAngle=0;

    rotor.setAttribute(

        "rotation",

        "0 0 0"

    );

    resetParticles();

    resetTimer();

});

/* ===========================================================
                    EVENTOS SLIDERS
=========================================================== */

rpmSlider.addEventListener("input",()=>{

    targetRPM=Number(rpmSlider.value);

    rpmValue.textContent=

    targetRPM+" RPM";

});

radiusSlider.addEventListener("input",()=>{

    process.radius=

    Number(radiusSlider.value);

    radiusValue.textContent=

    process.radius.toFixed(2)+" m";

});

densitySlider.addEventListener("input",()=>{

    process.densityDifference=

    Number(densitySlider.value);

    densityValue.textContent=

    process.densityDifference+

    " kg/m³";

});

particleSlider.addEventListener("input",()=>{

    process.particleDiameter=

    Number(particleSlider.value);

    particleValue.textContent=

    process.particleDiameter+

    " μm";

});

viscositySlider.addEventListener("input",()=>{

    process.viscosity=

    Number(viscositySlider.value);

    viscosityValue.textContent=

    process.viscosity.toFixed(1)+

    " cP";

});

/* ===========================================================
                    LOOP PRINCIPAL
=========================================================== */

let previousTime=performance.now();

function animate(now){

    const delta=

    (now-previousTime)/1000;

    previousTime=now;

    calculatePhysics();

    updateRotor(delta);

    updateParticles(delta);

    updateDashboard();

    requestAnimationFrame(

        animate

    );

}

requestAnimationFrame(

    animate

);

/* ===========================================================
                    INICIALIZACIÓN
=========================================================== */

window.addEventListener(

    "load",

    ()=>{

        createParticles();

        calculatePhysics();

        updateDashboard();

    }

);

/* ===========================================================
                    FIN DEL APP.JS
=========================================================== */