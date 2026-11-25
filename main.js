import Shape from "./geometry/Shape.js";
import Vector2D from "./geometry/Vector2D.js";
import Material from "./optics/Material.js";
import App from "./engine/App.js";
import LaserSource from "./optics/LaserSource.js";
import Lens from "./optics/Lens.js";
import Mirror from "./optics/Mirror.js";
import OpticalFilter from "./optics/OpticalFilter.js";
import Sensor from "./optics/Sensor.js";
import EditorController from "./engine/EditorController.js";
import { saveScene, loadScene as restoreScene } from "./engine/SceneSerializer.js";


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
    prism.addPoint(600, 250);
    prism.addPoint(850, 480);
    prism.addPoint(600, 710);
    return prism;
}

function createGlassBlock() {
    const block = new Shape(glass());
    block.addPoint(500, 300);
    block.addPoint(760, 250);
    block.addPoint(820, 650);
    block.addPoint(560, 700);
    return block;
}

function createDivergingSource(wavelength = 550, divergence = 1.2) {
    const source = createSource("monochromatic", wavelength);
    source.divergence = divergence;
    source.rayCount = 13;
    return source;
}

const sceneFactories = {
    focus: {
        name: "Фокусировка линзой",
        intro: "Линза меняет направление лучей. Собирающая линза направляет их к одной точке — фокусу.",
        observe: "Лучики после линзы сходятся рядом друг с другом.",
        try: "В режиме редактора выбери линзу и измени её форму или фокусное расстояние.",
        build() {
            app.scene.addSource(createDivergingSource(550, 1.4));
            app.scene.addObject(createLens(660, 420, 540));
        }
    },
    refraction: {
        name: "Преломление в стекле",
        intro: "При переходе из воздуха в стекло свет меняет скорость и направление. Это называется преломлением.",
        observe: "Посмотри, как луч меняет направление на входе в стекло и при выходе из него.",
        try: "Измени длину волны источника и сравни, насколько отклоняется луч.",
        build() {
            app.scene.addSource(createSource("monochromatic", 532));
            app.scene.addObject(createGlassBlock());
        }
    },
    reflection: {
        name: "Отражение от зеркала",
        intro: "Зеркало отражает свет. Угол, под которым луч падает на поверхность, равен углу отражения.",
        observe: "Падающий пучок меняет направление после встречи с наклонным зеркалом.",
        try: "В редакторе поверни зеркало и посмотри, куда направится отражённый свет.",
        build() {
            app.scene.addSource(createDivergingSource(532, 1.2));
            app.scene.addObject(new Mirror(new Vector2D(650, 480), 45, 420));
        }
    },
    spectrum: {
        name: "Белый свет и призма",
        intro: "Белый свет состоит из волн разной длины. В стекле они преломляются немного по-разному.",
        observe: "После призмы белый луч распадается на цветные лучи — спектр.",
        try: "Выбери сцену с фильтром, чтобы пропускать только часть спектра.",
        build() {
            app.scene.addSource(createSource("white"));
            app.scene.addObject(createPrism());
        }
    },
    filter: {
        name: "Как работает фильтр",
        intro: "Цветной фильтр пропускает свет только в заданном диапазоне длин волн, а остальные цвета поглощает.",
        observe: "Белый спектр сужается до диапазона, который пропускает фильтр.",
        try: "В редакторе выбери фильтр и измени границы пропускания.",
        build() {
            const source = createSource("white");
            source.position.x = 130;
            app.scene.addSource(source);
            app.scene.addObject(new OpticalFilter(new Vector2D(560, 480), 90, 520, 500, 600));
            app.scene.addObject(new Sensor(new Vector2D(980, 480), 90, 600));
        }
    }
};

function showLesson(preset) {
    lessonContent.innerHTML = `
        <div class="lesson-card__number">ОПЫТ</div>
        <h3>${preset.name}</h3>
        <p>${preset.intro}</p>
        <div class="lesson-card__section"><strong>Наблюдай</strong><span>${preset.observe}</span></div>
        <div class="lesson-card__section lesson-card__section--try"><strong>Попробуй</strong><span>${preset.try}</span></div>
    `;
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
    showLesson(preset);
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


function mainLoop(timestamp) {
	const dt = Math.min((timestamp - previousTime) / 1000, 0.1);

	previousTime = timestamp;
	accumulator += dt;

	while (accumulator >= fixedDt) {
		app.update(fixedDt);
		accumulator -= fixedDt;
	}

	app.draw();
	updateZoomLabel();
	requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);
