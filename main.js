import Shape from "./geometry/Shape.js";
import Vector2D from "./geometry/Vector2D.js";
import Material from "./optics/Material.js";
import App from "./engine/App.js";
import LaserSource from "./optics/LaserSource.js";
import Lens from "./optics/Lens.js";
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

const sceneFactories = {
    focus: {
        name: "Фокусировка линзой",
        build() {
            app.scene.addSource(createSource("monochromatic", 550));
            app.scene.addObject(createLens(660, 420, 540));
        }
    },
    spectrum: {
        name: "Белый свет и призма",
        build() {
            app.scene.addSource(createSource("white"));
            app.scene.addObject(createPrism());
        }
    },
    wavelengths: {
        name: "Цветные лучи",
        build() {
            for (const [y, wavelength] of [[350, 450], [480, 550], [610, 650]]) {
                const source = createSource("monochromatic", wavelength);
                source.position.y = y;
                app.scene.addSource(source);
            }
            app.scene.addObject(createLens(850, 520, 600));
        }
    },
    system: {
        name: "Система из двух линз",
        build() {
            app.scene.addSource(createSource("monochromatic", 532));
            app.scene.addObject(createLens(470, 350, 500));
            app.scene.addObject(createLens(900, 500, 500));
        }
    }
};

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
    sceneStatus.textContent = preset.name;
}

sceneSelect.addEventListener("change", () => loadScene(sceneSelect.value));
loadScene("focus");

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
