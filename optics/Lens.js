import Vector2D from "../geometry/Vector2D.js";
import Intersection from "../geometry/Intersection.js";
import Material from "./Material.js";

export default class Lens {
    constructor({
        edgePosition1,
        edgePosition2,
        deepth = 0,
        focusLength = 150,
        material = new Material()
    }) {
        // Основные параметры
        this.edgePosition1 = new Vector2D(
            edgePosition1.x,
            edgePosition1.y
        );

        this.edgePosition2 = new Vector2D(
            edgePosition2.x,
            edgePosition2.y
        );

        this.deepth = deepth;
        this.focusLength = focusLength;
        this.material = material;

        // Производная геометрия
        this.position = new Vector2D();
        this.direction = new Vector2D(1, 0);
        this.width = 0;

        this.radius = 0;
        this.delta = 0;
        this.angles = [];

        this.updateGeometry();
    }

    // Пересчитывает положение и размеры по крайним точкам
    updatePosition() {
        const p1 = this.edgePosition1;
        const p2 = this.edgePosition2;

        this.position.x = (p1.x + p2.x) / 2;
        this.position.y = (p1.y + p2.y) / 2;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        this.width = Math.sqrt(dx * dx + dy * dy);

        if (this.width === 0) {
            throw new Error("Lens edge points cannot coincide");
        }

        // Направление оптической оси перпендикулярно краям
        this.direction.x = -dy / this.width;
        this.direction.y = dx / this.width;
    }

    // Пересчитывает геометрию линзы
    updateGeometry() {
        this.updatePosition();
        this.setRadius();
        this.setDelta();
        this.setAngles();
    }

    setCurvatureFromHandle(point) {
        // Вектор от центра линзы к курсору
        const dx = point.x - this.position.x;
        const dy = point.y - this.position.y;

        // Проекция на оптическую ось.
        // Берём модуль, чтобы обе ручки работали одинаково.
        const projectedDistance = Math.abs(
            dx * this.direction.x +
            dy * this.direction.y
        );

        // Радиус окружности по теореме Пифагора
        const halfWidth = this.width / 2;

        this.radius = Math.sqrt(
            projectedDistance * projectedDistance +
            halfWidth * halfWidth
        );

        // Пересчитываем фокусное расстояние
        this.focusLength = this.radius / (
            2 * (this.material.n - 1)
        );

        this.setDelta();
        this.setAngles();
    }

    // Радиус вычисляется из фокусного расстояния
    setRadius() {
        const n = this.material.n;

        if (!Number.isFinite(n) || n <= 1) {
            throw new Error(
                "Lens refractive index must be greater than 1"
            );
        }

        if (!Number.isFinite(this.focusLength) || this.focusLength <= 0) {
            throw new Error(
                "Lens focal length must be greater than 0"
            );
        }

        const minRadius = this.width / 2 + 0.0001;

        this.radius = Math.max(
            2 * this.focusLength * (n - 1),
            minRadius
        );

        // Если радиус пришлось увеличить,
        // корректируем фокусное расстояние
        this.focusLength = this.radius / (2 * (n - 1));
    }

    // Вычисляет смещение центров окружностей
    setDelta() {
        const halfWidth = this.width / 2;

        this.delta = Math.sqrt(
            this.radius * this.radius -
            halfWidth * halfWidth
        );
    }

    // Вычисляет углы дуг
    setAngles() {
        const angle = Math.atan2(
            this.direction.y,
            this.direction.x
        );

        const alpha = Math.asin(
            Math.min(1, this.width / (2 * this.radius))
        );

        this.angles[0] = angle - alpha;
        this.angles[1] = angle + alpha;

        this.angles[2] = angle - alpha + Math.PI;
        this.angles[3] = angle + alpha + Math.PI;
    }

    // Изменение одной из крайних точек
    setEdgePosition(index, point) {
        const target = index === 0
            ? this.edgePosition1
            : this.edgePosition2;

        target.x = point.x;
        target.y = point.y;

        this.updateGeometry();
    }

    // Изменение фокусного расстояния
    setFocusLength(value) {
        this.focusLength = value;
        this.updateGeometry();
    }

    // Смена материала с сохранением геометрии
    setMaterial(material) {
        const currentRadius = this.radius;

        if (!material || !Number.isFinite(material.n) || material.n <= 1) {
            throw new Error(
                "Lens material must have a refractive index greater than 1"
            );
        }

        this.material = material;

        // Сохраняем радиус, пересчитываем фокусное расстояние
        this.focusLength = currentRadius / (2 * (material.n - 1));

        this.updateGeometry();
    }

    setRefractiveIndex(value) {
        if (!Number.isFinite(value) || value <= 1) {
            throw new Error("Lens refractive index must be greater than 1");
        }

        const currentRadius = this.radius;
        this.material.n = value;
        this.focusLength = currentRadius / (2 * (value - 1));
        this.updateGeometry();
    }

    checkIntersection(A, B, circle, ray, t) {
        if (t <= 0) {
            return new Intersection();
        }

        const cA = new Vector2D(
            A.x - circle.x,
            A.y - circle.y
        );

        const cB = new Vector2D(
            B.x - circle.x,
            B.y - circle.y
        );

        const I = new Vector2D(
            ray.origin.x + ray.direction.x * t,
            ray.origin.y + ray.direction.y * t
        );

        const cI = new Vector2D(
            I.x - circle.x,
            I.y - circle.y
        );

        if (
            Vector2D.vec(cI, cA) <= 0 &&
            Vector2D.vec(cI, cB) >= 0
        ) {
            cI.normalize();

            return new Intersection(
                { x: 0, y: 0 },
                cI,
                t,
                null
            );
        }

        return new Intersection();
    }

    getSideIntersection(ray, positive) {
        let A = new Vector2D(
            this.position.x + this.direction.y * this.width / 2,
            this.position.y - this.direction.x * this.width / 2
        );

        let B = new Vector2D(
            this.position.x - this.direction.y * this.width / 2,
            this.position.y + this.direction.x * this.width / 2
        );

        const circle = new Vector2D();

        if (positive) {
            circle.x = this.position.x + this.direction.x * this.delta;
            circle.y = this.position.y + this.direction.y * this.delta;

            [A, B] = [B, A];
        } else {
            circle.x = this.position.x - this.direction.x * this.delta;
            circle.y = this.position.y - this.direction.y * this.delta;
        }

        const dx = ray.direction.x;
        const dy = ray.direction.y;

        const ox = ray.origin.x;
        const oy = ray.origin.y;

        const R = this.radius;

        const b = 2 * (
            (ox - circle.x) * dx +
            (oy - circle.y) * dy
        );

        const c =
            (ox - circle.x) ** 2 +
            (oy - circle.y) ** 2 -
            R * R;

        const D = b * b - 4 * c;

        if (D < 0) {
            return new Intersection();
        }

        const sqrtD = Math.sqrt(D);

        const t1 = (-b + sqrtD) / 2;
        const t2 = (-b - sqrtD) / 2;

        const intersection1 = this.checkIntersection(
            A, B, circle, ray, t1
        );

        const intersection2 = this.checkIntersection(
            A, B, circle, ray, t2
        );

        return intersection1.distance < intersection2.distance
            ? intersection1
            : intersection2;
    }

    getIntersection(ray) {
        const intersection1 = this.getSideIntersection(ray, true);
        const intersection2 = this.getSideIntersection(ray, false);

        const closestIntersection =
            intersection1.distance < intersection2.distance
                ? intersection1
                : intersection2;

        const intersectionPoint = {
            x: ray.origin.x +
                ray.direction.x * closestIntersection.distance,
            y: ray.origin.y +
                ray.direction.y * closestIntersection.distance
        };

        const normal = closestIntersection.normal;

        if (normal) {
            const dotProduct = Vector2D.dot(
                ray.direction,
                normal
            );

            if (dotProduct > 0) {
                normal.x *= -1;
                normal.y *= -1;
            }
        }

        return new Intersection(
            intersectionPoint,
            normal,
            closestIntersection.distance,
            this
        );
    }

    draw(ctx) {
        ctx.beginPath();

        ctx.arc(
            this.position.x - this.direction.x * this.delta,
            this.position.y - this.direction.y * this.delta,
            this.radius,
            this.angles[0],
            this.angles[1]
        );

        ctx.arc(
            this.position.x + this.direction.x * this.delta,
            this.position.y + this.direction.y * this.delta,
            this.radius,
            this.angles[2],
            this.angles[3]
        );

        ctx.closePath();

        ctx.fillStyle = this.material.color;
        ctx.fill();
    }
}
