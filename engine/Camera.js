import Vector2D from "../geometry/Vector2D.js";

export default class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.position = new Vector2D(
            canvas.width / 2,
            canvas.height / 2
        );
        this.zoom = 1;
        this.minZoom = 0.05;
        this.maxZoom = 20;
    }

    apply(ctx) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        ctx.translate(centerX, centerY);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.position.x, -this.position.y);
    }

    screenToWorld(position) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const x = (position.x - centerX) / this.zoom;
        const y = (position.y - centerY) / this.zoom;

        return new Vector2D(
            this.position.x + x,
            this.position.y + y
        );
    }

    worldToScreen(position) {
        const dx = position.x - this.position.x;
        const dy = position.y - this.position.y;

        return new Vector2D(
            this.canvas.width / 2 + dx * this.zoom,
            this.canvas.height / 2 + dy * this.zoom
        );
    }

    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }

    zoomBy(factor) {
        if (factor <= 0) return;
        this.setZoom(this.zoom * factor);
    }
}
