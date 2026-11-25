import Rectangle from "./geometry/Rectangle.js";
import Ray from "./geometry/Ray.js";
import Shape from "./geometry/Shape.js";
import Vector2D from "./geometry/Vector2D.js";
import Material from "./optics/Material.js";
import Scene from "./engine/Scene.js";
import App from "./engine/App.js";
import LaserSource from "./optics/LaserSource.js";
import Lens from "./optics/Lens.js";
import EditorController from "./engine/EditorController.js";


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


function mainLoop(timestamp) {
	const dt = Math.min((timestamp - previousTime) / 1000, 0.1);

	previousTime = timestamp;
	accumulator += dt;

	while (accumulator >= fixedDt) {
		app.update(fixedDt);
		accumulator -= fixedDt;
	}

	app.draw();
	requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);
