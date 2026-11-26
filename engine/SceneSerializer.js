import Vector2D from "../geometry/Vector2D.js";
import Shape from "../geometry/Shape.js";
import Material from "../optics/Material.js";
import LaserSource from "../optics/LaserSource.js";
import Lens from "../optics/Lens.js";
import Mirror from "../optics/Mirror.js";
import OpticalFilter from "../optics/OpticalFilter.js";
import Sensor from "../optics/Sensor.js";

const materialData = (material) => ({
    color: material?.color || "#9bb8c8",
    n: material?.n || 1.5,
    dispersion: material?.dispersion || 0
});

export function saveScene(app, name = "Моя оптическая схема") {
    const objects = app.scene.objects.map((object) => {
        if (object instanceof Lens) return {
            type: "lens", edgePosition1: object.edgePosition1,
            edgePosition2: object.edgePosition2, focusLength: object.focusLength,
            deepth: object.deepth, material: materialData(object.material)
        };
        if (object instanceof Mirror) return {
            type: "mirror", position: object.position, angle: object.angle, length: object.length
        };
        if (object instanceof OpticalFilter) return {
            type: "filter", position: object.position, angle: object.angle, length: object.length,
            minWavelength: object.minWavelength, maxWavelength: object.maxWavelength
        };
        if (object instanceof Sensor) return {
            type: "sensor", position: object.position, angle: object.angle, length: object.length
        };
        if (object instanceof Shape) return {
            type: "shape", points: object.points, material: materialData(object.material)
        };
        return null;
    }).filter(Boolean);

    const sources = app.scene.sources.map((source) => ({
        position: source.position,
        direction: source.direction,
        power: source.power,
        mode: source.mode,
        wavelength: source.wavelength,
        spectrumSamples: source.spectrumSamples,
        divergence: source.divergence,
        rayCount: source.rayCount || 9,
        beamWidth: source.beamWidth || 0
    }));

    return {
        format: "raymodeling-scene",
        version: 1,
        name,
        camera: { x: app.camera.position.x, y: app.camera.position.y, zoom: app.camera.zoom },
        objects,
        sources
    };
}

export function loadScene(app, editor, data) {
    if (!data || data.format !== "raymodeling-scene" || !Array.isArray(data.objects) || !Array.isArray(data.sources)) {
        throw new Error("Файл не похож на схему RayModeling");
    }

    const objects = data.objects.map((item) => {
        if (item.type === "lens") return new Lens({
            edgePosition1: new Vector2D(item.edgePosition1.x, item.edgePosition1.y),
            edgePosition2: new Vector2D(item.edgePosition2.x, item.edgePosition2.y),
            focusLength: Math.max(1, Number(item.focusLength) || 300),
            deepth: Math.max(0, Number(item.deepth) || 0),
            material: new Material(item.material)
        });
        if (["mirror", "filter", "sensor"].includes(item.type)) {
            const position = new Vector2D(Number(item.position.x) || 0, Number(item.position.y) || 0);
            const angle = Number.isFinite(Number(item.angle)) ? Number(item.angle) : 90;
            const args = [position, angle, Math.max(1, Number(item.length) || 180)];
            if (item.type === "mirror") return new Mirror(...args);
            if (item.type === "filter") return new OpticalFilter(...args, Number(item.minWavelength) || 500, Number(item.maxWavelength) || 600);
            return new Sensor(...args);
        }
        if (item.type === "shape" && Array.isArray(item.points)) {
            const shape = new Shape(new Material(item.material));
            for (const point of item.points) shape.addPoint(Number(point.x) || 0, Number(point.y) || 0);
            return shape;
        }
        throw new Error(`Неизвестный тип элемента: ${item.type}`);
    });

    const sources = data.sources.map((item) => {
        const directionX = Number(item.direction.x);
        const directionY = Number(item.direction.y);
        const source = new LaserSource(
            new Vector2D(Number(item.position.x) || 0, Number(item.position.y) || 0),
            new Vector2D(Number.isFinite(directionX) ? directionX : 1, Number.isFinite(directionY) ? directionY : 0),
            Math.max(0, Math.min(1, Number(item.power) || 0))
        );
        source.setSpectrumSamples(item.spectrumSamples || 24);
        source.setMode(["white", "monochromatic", "rgb"].includes(item.mode) ? item.mode : "monochromatic");
        source.setWavelength(Number(item.wavelength) || 550);
        source.divergence = Math.max(0, Math.min(2, Number(item.divergence) || 0));
        source.rayCount = Math.max(3, Math.min(31, Number(item.rayCount) || 9));
        source.beamWidth = Math.max(0, Math.min(600, Number(item.beamWidth) || 0));
        return source;
    });

    app.scene.objects = objects;
    app.scene.sources = sources;
    app.scene.clearRays();
    if (data.camera) {
        app.camera.position = new Vector2D(Number(data.camera.x) || 0, Number(data.camera.y) || 0);
        app.camera.setZoom(Number(data.camera.zoom) || 1);
    }
    editor.selectedObject = null;
    editor.setTool("select");
    editor.refreshInspector();
    return data.name || "Моя оптическая схема";
}
