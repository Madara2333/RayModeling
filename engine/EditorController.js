import Shape from "../geometry/Shape.js";

import EditorSelection from "./Editor/EditorSelection.js";
import EditorOverlay from "./Editor/EditorOverlay.js";
import EditorInput from "./Editor/EditorInput.js";
import EditorCreation from "./Editor/EditorCreation.js";
import EditorTransform from "./Editor/EditorTransform.js";
import EditorInspector from "./Editor/EditorInspector.js?v=93fa3df";

export default class EditorController {
    constructor(app, canvas) {
        this.app = app;
        this.canvas = canvas;
        this.camera = app.camera;
        this.scene = app.scene;

        this.activeTool = "select";
        this.selectedObject = null;

        this.selection = new EditorSelection(this.scene, this);
        this.overlay = new EditorOverlay(this.camera);
        this.input = new EditorInput(this, canvas);
        this.creation = new EditorCreation(this.scene, this.camera);
        this.transform = new EditorTransform(this, this.camera, this.canvas);
        this.inspector = new EditorInspector(
            document.querySelector("#inspector-content"),
            this.scene
        );


        this._onToolClick = this._onToolClick.bind(this);

        this.toolbar = document.querySelector("#toolbar");

        this.toolbar?.addEventListener(
            "click",
            this._onToolClick
        );

        this._updateToolbar();
        this._updateInspector();
    }

    get isCreatingShape() {
        return this.creation.isCreatingShape;
    }

    get creationPoints() {
        return this.creation.creationPoints;
    }

    _onToolClick(event) {
        const button = event.target.closest("[data-tool]");

        if (!button || !this.toolbar.contains(button)) {
            return;
        }

        this.setTool(button.dataset.tool);
    }

    setTool(tool) {
        if (this.activeTool === tool) {
            return;
        }

        this._cancelShapeCreation();
        this.transform.endDrag();

        this.activeTool = tool;
        this._updateToolbar();
    }

    _updateToolbar() {
        if (!this.toolbar) {
            return;
        }

        for (const button of this.toolbar.querySelectorAll(
            "[data-tool]"
        )) {
            const active =
                button.dataset.tool === this.activeTool;

            button.classList.toggle(
                "active",
                active
            );

            button.setAttribute(
                "aria-pressed",
                String(active)
            );
        }
    }

    handlePointerDown(screenPosition, worldPosition, event) {
        switch (this.activeTool) {
            case "select":
                this._handleSelectionPointerDown(
                    screenPosition,
                    worldPosition
                );
                break;

            case "shape":
                this._handleShapeCreationPointerDown(
                    screenPosition,
                    worldPosition
                );
                break;

            case "source":
                this.creation.createSource(worldPosition);
                break;

            case "lens":
                this.creation.createLens(worldPosition);
                break;
            case "mirror":
                this.creation.createMirror(worldPosition);
                break;
            case "filter":
                this.creation.createFilter(worldPosition);
                break;
            case "sensor":
                this.creation.createSensor(worldPosition);
                break;
        }
    }

    handlePointerMove(worldPosition) {
        this.transform.handlePointerMove(worldPosition);
    }

    handlePointerUp(event) {
        if (event.button === 0 || event.type === "pointercancel") {
            this.transform.endDrag();
        }
    }

    handleKeyDown(event) {
        if (event.key === "Escape") {
            this.setTool("select");
            return;
        }

        if (event.key !== "Delete" && event.key !== "Backspace") {
            return;
        }

        const target = event.target;

        if (
            target instanceof HTMLElement &&
            (
                target.isContentEditable ||
                target.closest("input, textarea, select")
            )
        ) {
            return;
        }

        if (!this.selectedObject) return;

        event.preventDefault();
        this._deleteSelectedObject();
    }

    _handleSelectionPointerDown(
        screenPosition,
        worldPosition,
        event
    ) {
        // Сначала пробуем начать перетаскивание вершины.
        if (
            this.selectedObject &&
            this.transform.startVertexDrag(
                this.selectedObject,
                screenPosition,
                event
            )
        ) {
            return;
        }

        // Ищем объект под курсором.
        const object = this._findObjectAtPosition(worldPosition);

        if (!object) {
            this.selectedObject = null;
            this.transform.endDrag();
            this._updateInspector();
            return;
        }

        this.selectedObject = object;

        // Начинаем перемещение объекта.
        this.transform.startObjectDrag(
            object,
            worldPosition,
            event
        );

        this._updateInspector();
    }

    _findObjectAtPosition(position) {
        return this.selection.findObjectAtPosition(position);
    }

    _deleteSelectedObject() {
        const object = this.selectedObject;
        if (!object) return;

        let index = this.scene.objects.indexOf(object);

        if (index !== -1) {
            this.scene.objects.splice(index, 1);
        } else {
            index = this.scene.sources.indexOf(object);

            if (index !== -1) {
                this.scene.sources.splice(index, 1);
            } else {
                return;
            }
        }

        this.selectedObject = null;
        this.transform.endDrag();

        this._updateInspector();
    }

    _handleShapeCreationPointerDown(screenPosition, worldPosition) {
        const shape = this.creation.handleShapePointerDown(
            screenPosition,
            worldPosition
        );

        if (shape) {
            this.selectedObject = shape;
            this._updateInspector();
        }
    }

    _cancelShapeCreation() {
        this.creation.cancelShapeCreation();
    }

    _updateInspector() {
        this.inspector.setObject(this.selectedObject);
    }

    drawOverlay(ctx) {
        this.overlay.draw(ctx, this);
    }

    refreshInspector() {
        this.inspector.refresh();
    }
}
