export default class Rendering {
    constructor(canvas, ctx, rayTracer, camera) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.rayTracer = rayTracer;
    this.camera = camera;
    this.editor = null;
    this.lastSceneSignature = null;
    }

    setEditor(editor) {
        this.editor = editor;
    }

    draw(scene) {
        const ctx = this.ctx;

        // Tracing is the expensive part of rendering. Recompute it only when
        // optical objects or sources have changed, rather than on every frame.
        const signature = this.getSceneSignature(scene);
        if (signature !== this.lastSceneSignature) {
            for (const object of scene.objects) {
                if (object.tag === "sensor") object.measurements = [];
            }
            for (const source of scene.sources) {
                this.rayTracer.tracePath(source);
            }
            this.lastSceneSignature = signature;
            this.editor?.refreshInspector();
        }

        ctx.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        ctx.save();
        this.camera.apply(ctx);

        // 1. Обычные объекты сцены.
        for (const object of scene.objects) {
            object.draw(ctx);
        }

        // 2. Все световые лучи смешиваются как свет.
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (const ray of scene.rays) {
            ray.draw(ctx);
        }

        for (const source of scene.sources) {
            for (const ray of source.rayPath.rays) {
                ray.draw(ctx);
            }
        }

        ctx.restore();

        // 3. Источники поверх световых линий.
        for (const source of scene.sources) {
            source.draw(ctx);
        }

        ctx.restore();

        // 4. Редакторская графика в экранных координатах.
        if (this.editor) {
            this.editor.drawOverlay(ctx);
        }
    }

    getSceneSignature(scene) {
        const objects = scene.objects.map((object) => {
            const material = object.material
                ? [object.material.n, object.material.dispersion, object.material.color]
                : [];

            if (object.edgePosition1 && object.edgePosition2) {
                return ["lens", object.edgePosition1.x, object.edgePosition1.y,
                    object.edgePosition2.x, object.edgePosition2.y,
                    object.deepth, object.focusLength, ...material];
            }

            if (object.isSegment) {
                return [object.tag, object.position.x, object.position.y,
                    object.angle, object.length, object.minWavelength, object.maxWavelength];
            }

            return ["shape", ...(object.points || []).flatMap((point) => [point.x, point.y]), ...material];
        });

        const sources = scene.sources.map((source) => [
            source.position.x, source.position.y,
            source.direction.x, source.direction.y,
            source.power, source.divergence, source.rayCount || 9,
            ...(source.spectrum || []).flatMap((component) => [component.wavelength, component.intensity])
        ]);

        return JSON.stringify([objects, sources]);
    }
}
