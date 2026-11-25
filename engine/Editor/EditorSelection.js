import Shape from "../../geometry/Shape.js";
import Lens from "../../optics/Lens.js";
import LaserSource from "../../optics/LaserSource.js";

export default class EditorSelection {
    constructor(scene, editor) {
        this.scene = scene; // TODO
        this.editor = editor; 
    }

    findObjectAtPosition(position) {
        for (let i = this.scene.sources.length - 1; i >= 0; i--) {
            const source = this.scene.sources[i];

            if (this._sourceContainsPoint(source, position)) {
                return source;
            }
        }

        for (let i = this.scene.objects.length - 1; i >= 0; i--) {
            const object = this.scene.objects[i];

            if (object instanceof Lens) {
                if (this._lensContainsPoint(object, position)) {
                    return object;
                }
                continue;
            }

            if (object.isSegment && this._segmentContainsPoint(object, position)) {
                return object;
            }

            if (
                object instanceof Shape &&
                this._shapeContainsPoint(object, position)
            ) {
                return object;
            }
        }

        return null;
    }

    _segmentContainsPoint(segment, point) {
        const [a, b] = segment.endpoints();
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1,
            ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
        return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy)) < 12;
    }

    _sourceContainsPoint(source, point) {
        const dx = point.x - source.position.x;
        const dy = point.y - source.position.y;

        // // TODO
        // if (this.editor.selectedObject === source) {
        //     return (
        //         dx * dx + dy * dy <= 50
        //     );
        // }

        const cos = source.direction.x;
        const sin = source.direction.y;

        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;

        const length = 75;
        const width = 35;

        return (
            localX >= -length &&
            localX <= 0 &&
            Math.abs(localY) <= width / 2
        );
    }

    _lensContainsPoint(lens, point) {
        const radius = Math.abs(lens.radius);
        const delta = lens.delta;
        const direction = lens.direction;
        const center = lens.position;

        const center1X = center.x + direction.x * delta;
        const center1Y = center.y + direction.y * delta;

        const center2X = center.x - direction.x * delta;
        const center2Y = center.y - direction.y * delta;

        const dx1 = point.x - center1X;
        const dy1 = point.y - center1Y;

        const dx2 = point.x - center2X;
        const dy2 = point.y - center2Y;

        return (
            dx1 * dx1 + dy1 * dy1 <= radius * radius &&
            dx2 * dx2 + dy2 * dy2 <= radius * radius
        );
    }

    _shapeContainsPoint(shape, point) {
        if (shape.points.length < 3) {
            return false;
        }

        let inside = false;

        for (
            let i = 0, j = shape.points.length - 1;
            i < shape.points.length;
            j = i++
        ) {
            const a = shape.points[i];
            const b = shape.points[j];

            const intersects =
                (a.y > point.y) !== (b.y > point.y) &&
                point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

            if (intersects) {
                inside = !inside;
            }
        }

        return inside;
    }
}
