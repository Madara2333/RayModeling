import Shape from "../../geometry/Shape.js";
import Lens from "../../optics/Lens.js";
import LaserSource from "../../optics/LaserSource.js";

export default class EditorOverlay {
    constructor(camera) {
        this.camera = camera;
        this.handleRadius = 6;
    }

    draw(ctx, editor) {
        if (
            editor.isCreatingShape &&
            editor.creationPoints.length > 0
        ) {
            this.drawCreationPreview(ctx, editor.creationPoints);
        }

        const object = editor.selectedObject;
        if (!object) return;

        if (object instanceof Lens) {
            this.drawLensSelection(ctx, object);
            return;
        }

        if (object instanceof Shape) {
            this.drawShapeSelection(ctx, object);
        }

        if (object.isSegment) {
            const [a, b] = object.endpoints();
            const start = this.camera.worldToScreen(a);
            const end = this.camera.worldToScreen(b);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.restore();
        }

        if (object instanceof LaserSource) {
            this.drawLaserSourceSelection(ctx, object);
            return;
        }
    }

    drawLaserSourceSelection(ctx, source) {
        ctx.save();
        
        const position = this.camera.worldToScreen(source.position);
        ctx.beginPath();
        ctx.arc(position.x, position.y, 50, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        const sliderPosition = {
            x: position.x + source.direction.x * 50,
            y: position.y + source.direction.y * 50
        }
        this.drawCross(ctx, position);
        this.drawPoint(ctx, sliderPosition);
        
        ctx.restore();
    }

    drawLensSelection(ctx, lens) {
        ctx.save();
        this._drawLensContur(ctx, lens);
        this._drawLensPoints(ctx, lens);
        ctx.restore();
    }

    _drawLensContur(ctx, lens) {
        const delta = lens.delta * this.camera.zoom;
        const radius = lens.radius * this.camera.zoom;
        const position = this.camera.worldToScreen(lens.position);
        
        ctx.beginPath();
        ctx.arc(
          position.x - lens.direction.x * delta,
          position.y - lens.direction.y * delta,
          radius,
          lens.angles[0],
          lens.angles[1]
        );

        ctx.arc(
          position.x + lens.direction.x * delta,
          position.y + lens.direction.y * delta,
          radius,
          lens.angles[2],
          lens.angles[3],
        );

        ctx.closePath();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    _drawLensPoints(ctx, lens) {
        const delta = lens.delta;
        const direction = lens.direction;
        const position = lens.position;

        const f1 = {
            x: position.x + direction.x * delta,
            y: position.y + direction.y * delta
        };
        const f2 = {
            x: position.x - direction.x * delta,
            y: position.y - direction.y * delta
        };
        const edge1 = {
            x: position.x - direction.y * lens.width/2,
            y: position.y + direction.x * lens.width/2,
        }
        const edge2 = {
            x: position.x + direction.y * lens.width/2,
            y: position.y - direction.x * lens.width/2,
        }
        const center = {
            x: position.x,
            y: position.y,
        }
        
        for (const point of [f1, f2, edge1, edge2]) {
            const pointPosition = this.camera.worldToScreen(point);
            this.drawPoint(ctx, pointPosition);
        }
        this.drawCross(ctx, this.camera.worldToScreen(center));
    }

    drawShapeSelection(ctx, shape) {
        if (shape.points.length === 0) return;

        ctx.save();
        ctx.beginPath();

        const first = this.camera.worldToScreen(shape.points[0]);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < shape.points.length; i++) {
            const point = this.camera.worldToScreen(shape.points[i]);
            ctx.lineTo(point.x, point.y);
        }

        ctx.closePath();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        for (const point of shape.points) {
            const pointPosition = this.camera.worldToScreen(point);
            this.drawPoint(ctx, pointPosition);
        }

        ctx.restore();
    }

    drawCreationPreview(ctx, points) {
        ctx.save();

        const firstPointPositon = this.camera.worldToScreen(points[0]);

        ctx.beginPath();
        ctx.moveTo(firstPointPositon.x, firstPointPositon.y);

        for (let i = 1; i < points.length; i++) {
            const point = this.camera.worldToScreen(points[i]);
            ctx.lineTo(point.x, point.y);
        }

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        this.drawPoint(ctx, firstPointPositon);
        ctx.restore();
    }

    drawPoint(ctx, position) {
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawCross(ctx, position) {
        const x = position.x;
        const y = position.y;

        ctx.beginPath();
        ctx.moveTo(x + 10.5, y + 10.5);
        ctx.lineTo(x - 10.5, y - 10.5);
        ctx.moveTo(x - 10.5, y + 10.5);
        ctx.lineTo(x + 10.5, y - 10.5);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 10, y + 10);
        ctx.lineTo(x - 10, y - 10);
        ctx.moveTo(x - 10, y + 10);
        ctx.lineTo(x + 10, y - 10);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
