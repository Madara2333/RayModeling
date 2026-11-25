import Ray from "../geometry/Ray.js";
import Vector2D from "../geometry/Vector2D.js";
import Intersection from "../geometry/Intersection.js";

export default class RayTracer {
    static EPSILON = 1e-9;

    constructor({ scene, maxBounces = 50, minPower = 0.001 } = {}) {
        this.scene = scene;
        this.maxBounces = maxBounces;
        this.minPower = minPower;
    }

    getAndUpdateMediums(mediums, object, wavelength) {
        const objectIndex = object.material.getRefractiveIndex(wavelength);

        let n1 = 1;

        for (const medium of mediums) {
            n1 *= medium.material.getRefractiveIndex(wavelength);
        }

        const index = mediums.lastIndexOf(object);

        let n2;

        if (index !== -1) {
            n2 = n1 / objectIndex;
            mediums.splice(index, 1);
        } else {
            n2 = n1 * objectIndex;
            mediums.push(object);
        }

        return { n1, n2 };
    }

    traceRay(path, ray, mediums = []) {
        path.add(ray);

        this.findClosestIntersection(ray);

        if (
            ray.intersection.distance === Infinity ||
            ray.power < this.minPower ||
            ray.bounceCounter + 1 > this.maxBounces
        ) {
            return;
        }

        const hitObject = ray.intersection.object;
        if (hitObject?.tag === "sensor") {
            hitObject.receive(ray, ray.intersection);
            return;
        }

        if (hitObject?.tag === "mirror") {
            const reflected = this.getReflectedRay(
                ray, ray.intersection.normal, 1, 1, null
            );
            reflected.branchType = "reflection";
            reflected.parentRayId = ray.id;
            this.traceRay(path, reflected, mediums);
            return;
        }

        if (hitObject?.tag === "filter") {
            if (ray.wavelength < hitObject.minWavelength || ray.wavelength > hitObject.maxWavelength) {
                return;
            }
            const transmitted = new Ray(
                { x: ray.intersection.point.x + ray.direction.x * 1e-6,
                    y: ray.intersection.point.y + ray.direction.y * 1e-6 },
                { ...ray.direction }, ray.power, ray.bounceCounter + 1,
                ray.wavelength, ray.intensity
            );
            transmitted.branchType = "transmission";
            transmitted.parentRayId = ray.id;
            this.traceRay(path, transmitted, mediums);
            return;
        }

        const oldMediums = [...mediums];

        const { n1, n2 } = this.getAndUpdateMediums(
            mediums,
            ray.intersection.object,
            ray.wavelength
        );

        const normal = ray.intersection.normal;

        const refractedRay = this.getRefractedRay(
            ray,
            normal,
            n1,
            n2
        );

        const reflectedRay = this.getReflectedRay(
            ray, normal, n1, n2, refractedRay
        );

        this.traceRay(path, reflectedRay, oldMediums);

        if (refractedRay !== null) {
            refractedRay.power =
                ray.power * ray.intersection.transmittance; 
            reflectedRay.parentRayId = ray.id;
            reflectedRay.branchType = "reflection";
            this.traceRay(path, refractedRay, [...mediums]);
        }
    }

        
    tracePath(source) {
        source.rayPath.rays = [];

        const divergence = Math.max(
            0,
            Math.min(2, source.divergence)
        );
        
        const rayCount = divergence === 0 ? 1 : Math.max(3, Math.min(31, source.rayCount || 9));

        const offsets = Array.from(
            { length: rayCount },
            (_, i) => {
                if (rayCount === 1) return 0;

                return -divergence / 2 +
                    (divergence * i) / (rayCount - 1);
            }
        );

        const baseAngle = Math.atan2(
            source.direction.y,
            source.direction.x
        );

        for (const spectralComponent of source.spectrum) {
            for (const offset of offsets) {
                const angle = baseAngle + offset * Math.PI / 180;

                const direction = {
                    x: Math.cos(angle),
                    y: Math.sin(angle)
                };

                const ray = new Ray(
                    { x: source.position.x, y: source.position.y },
                    direction,
                    source.power * spectralComponent.intensity / offsets.length,
                    0,
                    spectralComponent.wavelength,
                    spectralComponent.intensity
                );

                this.traceRay(source.rayPath, ray, []);
            }
        }
    }

    clear(source) {
        source.rayPath.rays = [];
    }


    getReflectedRay(ray, normal, n1, n2, refractedRay) {
        const dot = Vector2D.dot(ray.direction, normal);

        const originX =
            ray.intersection.point.x + normal.x * RayTracer.EPSILON;
        const originY =
            ray.intersection.point.y + normal.y * RayTracer.EPSILON;

        const directionX = ray.direction.x - 2 * dot * normal.x;
        const directionY = ray.direction.y - 2 * dot * normal.y;

        let reflectance = 1;

        if (refractedRay !== null) {
            let cosA;
            let cosB;

            if (dot > 0) {
                cosA = dot;
                cosB = Vector2D.dot(
                    refractedRay.direction,
                    new Vector2D(-normal.x, -normal.y)
                );
            } else {
                cosB = Vector2D.dot(
                    refractedRay.direction,
                    new Vector2D(-normal.x, -normal.y)
                );
                cosA = Vector2D.dot(
                    ray.direction,
                    new Vector2D(-normal.x, -normal.y)
                );
            }

            const denominatorS = n1 * cosA + n2 * cosB;
            const denominatorP = n2 * cosA + n1 * cosB;

            const Rs = Math.abs(denominatorS) < 1e-12
                ? 1
                : (n1 * cosA - n2 * cosB) / denominatorS;

            const Rp = Math.abs(denominatorP) < 1e-12
                ? 1
                : (n2 * cosA - n1 * cosB) / denominatorP;

            reflectance = (Rs * Rs + Rp * Rp) / 2;
        }

        ray.intersection.reflectance = reflectance;
        ray.intersection.transmittance = 1 - reflectance;

        return new Ray(
            { x: originX, y: originY },
            { x: directionX, y: directionY },
            ray.power * reflectance,
            ray.bounceCounter + 1,
            ray.wavelength,
            ray.intensity * reflectance
        );
    }

    getRefractedRay(ray, normal, n1, n2) {
        let dot = Vector2D.dot(ray.direction, normal);

        let nx = normal.x;
        let ny = normal.y;

        if (dot > 0) {
            nx = -nx;
            ny = -ny;
            dot = -dot;
        }

        const refractiveIndex = n1 / n2;

        const sinTheta1 = Math.abs(
            Vector2D.vec(ray.direction, normal)
        );

        const sinTheta2 = sinTheta1 * refractiveIndex;

        if (sinTheta2 > 1) {
            return null;
        }

        const parallelToNormal = new Vector2D(
            dot * nx,
            dot * ny
        );

        const tangent = new Vector2D(
            ray.direction.x - parallelToNormal.x,
            ray.direction.y - parallelToNormal.y
        );

        const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);

        const direction = new Vector2D(
            refractiveIndex * tangent.x - cosTheta2 * nx,
            refractiveIndex * tangent.y - cosTheta2 * ny
        );

        direction.normalize();

        const originX =
            ray.intersection.point.x - nx * RayTracer.EPSILON;
        const originY =
            ray.intersection.point.y - ny * RayTracer.EPSILON;

        return new Ray(
            { x: originX, y: originY },
            direction,
            ray.power,
            ray.bounceCounter + 1,
            ray.wavelength,
            ray.intensity
        );
    }

    findClosestIntersection(ray) {
        let closestIntersection = new Intersection();

        for (const object of this.scene.objects) {
            if (object.tag === "marker") continue;

            const intersection = object.getIntersection(ray);

            if (
                intersection === null ||
                intersection.distance === Infinity
            ) {
                continue;
            }

            if (intersection.distance < closestIntersection.distance) {
                closestIntersection = intersection;
            }
        }

        ray.intersection = closestIntersection;
    }

    processIntersection(ray, intersection) {
        // Пока не используется.
    }
}
