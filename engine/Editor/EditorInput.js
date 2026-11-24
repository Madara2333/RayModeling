import Vector2D from "../../geometry/Vector2D.js";

export default class EditorInput {
    constructor(editor, canvas) {
        this.editor = editor;
        this.canvas = canvas;

        this.camera = editor.camera;

        this.isPanning = false;
        this.lastPointer = null;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);

        canvas.addEventListener("pointerdown", this._onPointerDown);
        canvas.addEventListener("pointermove", this._onPointerMove);
        canvas.addEventListener("pointerup", this._onPointerUp);
        canvas.addEventListener("pointercancel", this._onPointerUp);
        canvas.addEventListener("wheel", this._onWheel, {passive: false});
        window.addEventListener("keydown", this._onKeyDown);
    }

    _onPointerDown(event) {
        if (event.button === 1) {
            this.isPanning = true;
            this.lastPointer = this._getCanvasPosition(event);

            this.canvas.setPointerCapture(event.pointerId);
            event.preventDefault();
            return;
        }

        if (event.button !== 0) return;

        const screenPosition = this._getCanvasPosition(event);
        const worldPosition = this.camera.screenToWorld(screenPosition);

        this.editor.handlePointerDown(
            screenPosition,
            worldPosition,
            event
        );
    }

    _onPointerMove(event) {
        if (this.isPanning && this.lastPointer) {
            const current = this._getCanvasPosition(event);

            const delta = new Vector2D(
                current.x - this.lastPointer.x,
                current.y - this.lastPointer.y
            );

            delta.multiply(1 / this.camera.zoom);
            delta.rotate(this.camera.rotation);

            this.camera.position.x -= delta.x;
            this.camera.position.y -= delta.y;

            this.lastPointer = current;
            return;
        }

        const screenPosition = this._getCanvasPosition(event);
        const worldPosition = this.camera.screenToWorld(screenPosition);

        this.editor.handlePointerMove(worldPosition);
    }

    _onPointerUp(event) {
        if (event.button === 1 || event.type === "pointercancel") {
            this.isPanning = false;
            this.lastPointer = null;
        }

        this.editor.handlePointerUp(event);
    }

    _onWheel(event) {
        event.preventDefault();

        const screenPosition = this._getCanvasPosition(event);
        const worldBefore = this.camera.screenToWorld(screenPosition);
        const factor = Math.exp(-event.deltaY * 0.001);
        this.camera.zoomBy(factor);
        const worldAfter = this.camera.screenToWorld(screenPosition);
        
        this.camera.position.x += worldBefore.x - worldAfter.x;
        this.camera.position.y += worldBefore.y - worldAfter.y;
    }

    _onKeyDown(event) {
        this.editor.handleKeyDown(event);
    }

    _getCanvasPosition(event) {
        const rect = this.canvas.getBoundingClientRect();

        return new Vector2D(
            (event.clientX - rect.left) * this.canvas.width / rect.width,
            (event.clientY - rect.top) * this.canvas.height / rect.height
        );
    }
}