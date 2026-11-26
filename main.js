import Shape from "./geometry/Shape.js";
import Vector2D from "./geometry/Vector2D.js";
import Material from "./optics/Material.js";
import App from "./engine/App.js?v=audit1126b";
import LaserSource from "./optics/LaserSource.js";
import Lens from "./optics/Lens.js";
import Mirror from "./optics/Mirror.js";
import OpticalFilter from "./optics/OpticalFilter.js";
import Sensor from "./optics/Sensor.js";
import EditorController from "./engine/EditorController.js?v=audit1126b";
import { saveScene, loadScene as restoreScene } from "./engine/SceneSerializer.js?v=audit1126b";


const canvas = document.querySelector("#work-canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1280;
canvas.height = 1280 * 3/4;

const fixedDt = 1 / 60;
let accumulator = 0;
let previousTime = 0;

const app = new App(canvas, ctx);
const editor = new EditorController(app, canvas);

app.rendering.setEditor(editor);


const glass = () => new Material({
    color: "rgba(120, 185, 214, 0.42)",
    n: 1.52,
    dispersion: 0.008
});

const sceneSelect = document.querySelector("#scene-presets");
const sceneStatus = document.querySelector("#scene-name");
const zoomLabel = document.querySelector("#zoom-label");
const workspace = document.querySelector("#scene");
const lessonContent = document.querySelector("#lesson-content");

function createSource(mode = "monochromatic", wavelength = 550) {
    const source = new LaserSource(new Vector2D(160, 480), new Vector2D(1, 0), 1);
    source.divergence = 0;
    source.setMode(mode);
    source.setWavelength(wavelength);
    return source;
}

function createParallelSource(mode = "monochromatic", wavelength = 550, width = 240) {
    const source = createSource(mode, wavelength);
    source.beamWidth = width;
    source.rayCount = 17;
    return source;
}

function createLens(x, focusLength = 420, height = 500) {
    return new Lens({
        edgePosition1: new Vector2D(x, 480 + height / 2),
        edgePosition2: new Vector2D(x, 480 - height / 2),
        focusLength,
        material: glass()
    });
}

function createPrism() {
    const prism = new Shape(glass());
    prism.addPoint(700, 220);
    prism.addPoint(500, 700);
    prism.addPoint(900, 700);
    return prism;
}

function createGlassBlock() {
    const block = new Shape(glass());
    block.addPoint(500, 300);
    block.addPoint(800, 550);
    block.addPoint(1000, 550);
    block.addPoint(700, 300);
    return block;
}

const sceneFactories = {
    focus: {
        name: "Фокусировка линзой",
        intro: "На линзу падает параллельный пучок. Собирающая линза сводит лучи в фокус — точку на главной оптической оси.",
        observe: "До линзы лучи идут параллельно, после неё сходятся к одной точке.",
        why: "Чем сильнее искривлены поверхности линзы, тем короче её фокусное расстояние.",
        try: "Переключись в редактор и измени фокусное расстояние линзы. Точка сбора лучей переместится.",
        build() {
            app.scene.addSource(createParallelSource("monochromatic", 550, 300));
            app.scene.addObject(createLens(660, 420, 540));
        }
    },
    refraction: {
        name: "Преломление в стекле",
        intro: "На границе двух материалов свет меняет скорость, поэтому меняет и направление. Это явление называется преломлением.",
        observe: "Сравни направление параллельных лучей до стекла и после выхода из него.",
        why: "В редакторе у источника отдельно показаны направление падающего луча и измеренный угол преломления.",
        try: "В редакторе выбери синий (450 нм), затем красный (650 нм) свет и сравни угол преломления.",
        build() {
            app.scene.addSource(createParallelSource("monochromatic", 450, 120));
            app.scene.addObject(createGlassBlock());
        }
    },
    reflection: {
        name: "Отражение от зеркала",
        intro: "Свет отражается от зеркала, сохраняя угол относительно перпендикуляра к поверхности.",
        observe: "Параллельный пучок меняет направление на зеркале.",
        why: "Закон отражения: угол падения равен углу отражения. Оба угла отсчитываются от нормали — перпендикуляра к зеркалу.",
        try: "Поверни зеркало в редакторе и проследи, как изменится направление отражённого пучка.",
        build() {
            app.scene.addSource(createParallelSource("monochromatic", 532, 180));
            app.scene.addObject(new Mirror(new Vector2D(650, 480), 45, 420));
        }
    },
    spectrum: {
        name: "Дисперсия света",
        intro: "Белый свет — это смесь волн разной длины. В стекле каждая длина волны преломляется на свой угол.",
        observe: "После призмы лучи расходятся веером: от красного до фиолетового.",
        why: "Это явление называется дисперсией. Красный свет отклоняется слабее, фиолетовый — сильнее.",
        try: "Выбери монохроматический свет и сравни отдельно красный и синий лучи.",
        build() {
            app.scene.addSource(createParallelSource("white", 550, 100));
            app.scene.addObject(createPrism());
        }
    },
    filter: {
        name: "Как работает фильтр",
        intro: "Спектральный фильтр пропускает только выбранные длины волн, а остальные поглощает.",
        observe: "За фильтром остаётся только часть белого спектра. Датчик показывает, сколько лучей прошло.",
        why: "Датчик — это экран-приёмник: он останавливает лучи и измеряет их количество и суммарную мощность.",
        try: "В редакторе выбери фильтр и измени границы диапазона. Затем сравни показания датчика.",
        sensorNote: "Датчик стоит за фильтром и служит экраном: он считает прошедшие лучи и их суммарную мощность.",
        build() {
            const source = createParallelSource("white", 550, 180);
            source.position.x = 130;
            app.scene.addSource(source);
            app.scene.addObject(new OpticalFilter(new Vector2D(560, 480), 90, 520, 500, 600));
            app.scene.addObject(new Sensor(new Vector2D(980, 480), 90, 600));
        }
    }
};

function showLesson(preset, key) {
    lessonContent.innerHTML = `
        <div class="lesson-card__number">ОПЫТ</div>
        <h3>${preset.name}</h3>
        <p>${preset.intro}</p>
        <div class="lesson-card__section"><strong>Наблюдай</strong><span>${preset.observe}</span></div>
        ${preset.why ? `<div class="lesson-card__section"><strong>Почему?</strong><span>${preset.why}</span></div>` : ""}
        ${key === "refraction" ? `<div class="lesson-card__section lesson-card__section--try"><strong>Сравни цвета</strong><div class="lesson-card__buttons"><button type="button" data-lesson-wavelength="450">Синий · 450 нм</button><button type="button" data-lesson-wavelength="650">Красный · 650 нм</button></div><output class="lesson-card__result" id="lesson-refraction-result">Угол преломления: рассчитывается…</output></div>` : ""}
        ${preset.sensorNote ? `<div class="lesson-card__section lesson-card__section--sensor"><strong>Зачем датчик?</strong><span>${preset.sensorNote}</span><output id="lesson-sensor-result">Датчик считает лучи после фильтра…</output></div>` : ""}
        <div class="lesson-card__section lesson-card__section--try"><strong>Попробуй</strong><span>${preset.try}</span></div>
    `;
}

function showLoadedScene(name) {
    lessonContent.innerHTML = `
        <div class="lesson-card__number">СВОЯ СХЕМА</div>
        <h3>Загруженная схема</h3>
        <p>Схема открыта. Выбирай элементы на поле, чтобы менять их параметры. Перетащи элемент мышью, чтобы переместить его.</p>
        <div class="lesson-card__section"><strong>Подсказка</strong><span>Чтобы удалить выбранный элемент, нажми Delete или Backspace. Сохраняй изменения кнопкой «Сохранить».</span></div>
    `;
    lessonContent.querySelector("h3").textContent = name || "Загруженная схема";
}

function loadScene(name) {
    const preset = sceneFactories[name];
    if (!preset) return;

    app.scene.objects.length = 0;
    app.scene.sources.length = 0;
    app.scene.clearRays();
    editor.selectedObject = null;
    editor.setTool("select");
    editor.refreshInspector();
    preset.build();
    app.rendering.lastSceneSignature = null;
    sceneStatus.textContent = preset.name;
    showLesson(preset, name);
}

sceneSelect.addEventListener("change", () => loadScene(sceneSelect.value));
loadScene("focus");

const appRoot = document.querySelector(".app");
const modeToggle = document.querySelector("#mode-toggle");
modeToggle.addEventListener("click", () => {
    const learning = appRoot.classList.toggle("learning-mode");
    modeToggle.textContent = learning ? "Редактор" : "Обучение";
    if (learning) editor.setTool("select");
    document.querySelector("#panel-eyebrow").textContent = learning ? "ОПЫТ ПО ФИЗИКЕ" : "СВОЙСТВА СЦЕНЫ";
    document.querySelector("#panel-title").textContent = learning ? "Что происходит?" : "Параметры";
});

document.querySelector("#save-scene").addEventListener("click", () => {
    const data = saveScene(app, sceneStatus.textContent || "Моя схема");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "raymodeling-scene.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const sceneFileInput = document.querySelector("#scene-file");
document.querySelector("#open-scene").addEventListener("click", () => sceneFileInput.click());
sceneFileInput.addEventListener("change", async () => {
    const file = sceneFileInput.files?.[0];
    if (!file) return;
    try {
        const name = restoreScene(app, editor, JSON.parse(await file.text()));
        app.rendering.lastSceneSignature = null;
        sceneSelect.querySelector('option[value="loaded-scene"]')?.remove();
        const customOption = new Option(name, "loaded-scene", true, true);
        sceneSelect.add(customOption);
        sceneStatus.textContent = name;
        showLoadedScene(name);
    } catch (error) {
        window.alert(error.message || "Не удалось открыть схему");
    } finally {
        sceneFileInput.value = "";
    }
});

function updateZoomLabel() {
    zoomLabel.textContent = `${Math.round(app.camera.zoom * 100)}%`;
    const origin = app.camera.worldToScreen(new Vector2D(0, 0));
    workspace.style.setProperty("--grid-size", `${22 * app.camera.zoom}px`);
    workspace.style.backgroundPosition = `${origin.x}px ${origin.y}px`;
}

document.querySelector("#zoom-in").addEventListener("click", () => {
    app.camera.zoomBy(1.2);
    updateZoomLabel();
});
document.querySelector("#zoom-out").addEventListener("click", () => {
    app.camera.zoomBy(1 / 1.2);
    updateZoomLabel();
});
document.querySelector("#toggle-grid").addEventListener("click", (event) => {
    const visible = event.currentTarget.getAttribute("aria-pressed") === "true";
    event.currentTarget.setAttribute("aria-pressed", String(!visible));
    workspace.classList.toggle("grid-hidden", visible);
});
document.querySelector("#fit-scene").addEventListener("click", () => {
    const points = [];
    for (const source of app.scene.sources) points.push(source.position);
    for (const object of app.scene.objects) {
        if (object.edgePosition1) points.push(object.edgePosition1, object.edgePosition2);
        else if (object.isSegment) points.push(...object.endpoints());
        else if (object.points) points.push(...object.points);
    }
    if (!points.length) return;
    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    app.camera.position.x = (minX + maxX) / 2;
    app.camera.position.y = (minY + maxY) / 2;
    app.camera.setZoom(Math.min(
        (canvas.width - 120) / Math.max(maxX - minX, 120),
        (canvas.height - 120) / Math.max(maxY - minY, 120)
    ));
    updateZoomLabel();
});

function updateLessonReadout() {
    const output = document.querySelector("#lesson-sensor-result");
    const sensor = app.scene.objects.find(object => object.tag === "sensor");
    if (output && sensor) {
        const values = sensor.getMeasurements();
        const text = `На датчик попало ${values.rays} лучей. Суммарная мощность: ${values.power.toFixed(3)}.`;
        if (output.textContent !== text) output.textContent = text;
    }

    const refraction = document.querySelector("#lesson-refraction-result");
    const source = app.scene.sources[0];
    if (refraction && source) {
        const measurement = editor.inspector.getSourceRefractionMeasurement(source);
        refraction.textContent = measurement
            ? `λ = ${Math.round(source.wavelength)} нм · угол преломления: ${measurement.totalInternal ? "полное отражение" : `${measurement.angle.toFixed(2)}°`}`
            : `λ = ${Math.round(source.wavelength)} нм · поставь стекло на пути луча`;
    }
}

lessonContent.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lesson-wavelength]");
    if (!button) return;
    const source = app.scene.sources[0];
    if (!source) return;
    source.setMode("monochromatic");
    source.setWavelength(Number(button.dataset.lessonWavelength));
    updateLessonReadout();
});



function mainLoop(timestamp) {
	const dt = Math.min((timestamp - previousTime) / 1000, 0.1);

	previousTime = timestamp;
	accumulator += dt;

	while (accumulator >= fixedDt) {
		app.update(fixedDt);
		accumulator -= fixedDt;
	}

	app.draw();
	updateLessonReadout();
	updateZoomLabel();
	requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);
