
import Vector2D from "../../geometry/Vector2D.js";
import Shape from "../../geometry/Shape.js";
import Material from "../../optics/Material.js";
import LaserSource from "../../optics/LaserSource.js";
import Lens from "../../optics/Lens.js";
import Mirror from "../../optics/Mirror.js";
import OpticalFilter from "../../optics/OpticalFilter.js";
import Sensor from "../../optics/Sensor.js";

export default class EditorCreation {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.currentMatrial = new Material();
        this.isCreatingShape = false;
        this.creationPoints = [];
        this.minPointDistance = 3;
        this.closePointRadius = 15;
    }

    createSource(position) {
        const source = new LaserSource(
            position.clone(),
            new Vector2D(1, 0)
        );
        this.scene.addSource(source);
        return source;
    }

    createLens(position, material = new Material()) {
        const lens = new Lens({
            edgePosition1: new Vector2D(position.x, position.y + 100),
            edgePosition2: new Vector2D(position.x, position.y - 100),
            focusLength: 300,
            deepth: 0,
            material: material
        });

        this.scene.addObject(lens);
        return lens;
    }

    createSegment(ElementType, position, angle = 90, length = 180, ...options) {
        const element = new ElementType(position.clone(), angle, length, ...options);
        this.scene.addObject(element);
        return element;
    }

    createMirror(position) { return this.createSegment(Mirror, position); }
    createFilter(position) { return this.createSegment(OpticalFilter, position, 90, 180, 500, 600); }
    createSensor(position) { return this.createSegment(Sensor, position); }

    handleShapePointerDown(screenPosition, worldPosition) {
        if (!this.isCreatingShape) {
            this.isCreatingShape = true;
            this.creationPoints = [worldPosition.clone()];
            return null;
        }

        const firstPoint = this.creationPoints[0];
        const firstPointScreen =
            this.camera.worldToScreen(firstPoint);

        const dx = screenPosition.x - firstPointScreen.x;
        const dy = screenPosition.y - firstPointScreen.y;

        if (
            this.creationPoints.length >= 3 &&
            dx * dx + dy * dy <= this.closePointRadius ** 2
        ) {
            return this.finishShapeCreation();
        }

        const lastPoint =
            this.creationPoints[this.creationPoints.length - 1];

        const distance = Math.hypot(
            worldPosition.x - lastPoint.x,
            worldPosition.y - lastPoint.y
        );

        if (distance < this.minPointDistance) {
            return null;
        }

        this.creationPoints.push(worldPosition.clone());
        return null;
    }

    finishShapeCreation() {
        if (this.creationPoints.length < 3) {
            return null;
        }

        const material = this.currentMatrial;
        const shape = new Shape(material);

        for (const point of this.creationPoints) {
            shape.addPoint(point.x, point.y);
        }

        this.scene.addObject(shape);
        this.cancelShapeCreation();

        return shape;
    }

    cancelShapeCreation() {
        this.isCreatingShape = false;
        this.creationPoints = [];
    }
}
