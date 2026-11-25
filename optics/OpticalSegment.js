import Intersection from "../geometry/Intersection.js";

export default class OpticalSegment {
    constructor(position, angle = 90, length = 180) {
        this.position = position;
        this.angle = angle;
        this.length = length;
        this.isSegment = true;
    }

    endpoints() {
        const radians = this.angle * Math.PI / 180;
        const dx = Math.cos(radians) * this.length / 2;
        const dy = Math.sin(radians) * this.length / 2;
        return [
            { x: this.position.x - dx, y: this.position.y - dy },
            { x: this.position.x + dx, y: this.position.y + dy }
        ];
    }

    getIntersection(ray) {
        const [a, b] = this.endpoints();
        const sx = b.x - a.x;
        const sy = b.y - a.y;
        const denominator = ray.direction.x * sy - ray.direction.y * sx;
        if (Math.abs(denominator) < 1e-10) return null;

        const ax = a.x - ray.origin.x;
        const ay = a.y - ray.origin.y;
        const t = (ax * sy - ay * sx) / denominator;
        const u = (ax * ray.direction.y - ay * ray.direction.x) / denominator;
        if (t <= 1e-7 || u < 0 || u > 1) return null;

        let nx = -sy;
        let ny = sx;
        const normalLength = Math.hypot(nx, ny) || 1;
        nx /= normalLength;
        ny /= normalLength;
        if (nx * ray.direction.x + ny * ray.direction.y > 0) {
            nx *= -1;
            ny *= -1;
        }

        return new Intersection(
            { x: ray.origin.x + ray.direction.x * t, y: ray.origin.y + ray.direction.y * t },
            { x: nx, y: ny }, t, this
        );
    }

    drawLine(ctx, color, width = 8) {
        const [a, b] = this.endpoints();
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();
    }
}
