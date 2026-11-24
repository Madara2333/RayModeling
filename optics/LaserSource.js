
import Path from "../geometry/Path.js";

export default class LaserSource {
    constructor(position, direction, power = 1) {
        this.position = position;

        direction.normalize();
        this.direction = direction;

        this.power = power;

        // Режим: white или monochromatic
        this.mode = "white";

        // Длина волны для монохроматического режима
        this.wavelength = 550;

        // Угол расходимости (пока только параметр)
        this.divergence = 0;

        this.spectrum = this.createWhiteSpectrum(42);
        this.rayPath = new Path();
    }

    createWhiteSpectrum(count) {
        const minWavelength = 380;
        const maxWavelength = 780;
        const spectrum = [];

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);

            spectrum.push({
                wavelength:
                    minWavelength +
                    (maxWavelength - minWavelength) * t,
                intensity: 1 / count
            });
        }

        return spectrum;
    }

    setMode(mode) {
        if (mode !== "white" && mode !== "monochromatic") {
            return;
        }

        this.mode = mode;
        this.updateSpectrum();
    }

    setWavelength(wavelength) {
        this.wavelength = Math.max(
            380,
            Math.min(780, wavelength)
        );

        if (this.mode === "monochromatic") {
            this.updateSpectrum();
        }
    }

    updateSpectrum() {
        if (this.mode === "white") {
            this.spectrum = this.createWhiteSpectrum(42);
        } else {
            this.spectrum = [{
                wavelength: this.wavelength,
                intensity: 1
            }];
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(
            this.position.x - this.direction.x * 10,
            this.position.y - this.direction.y * 10
        );
        ctx.strokeStyle = "#646464";
        ctx.lineWidth = 30;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(
            this.position.x - this.direction.x * 10,
            this.position.y - this.direction.y * 10
        );
        ctx.lineTo(
            this.position.x - this.direction.x * 60,
            this.position.y - this.direction.y * 60
        );
        ctx.strokeStyle = "#323232";
        ctx.lineWidth = 26;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(
            this.position.x - this.direction.x * 60,
            this.position.y - this.direction.y * 60
        );
        ctx.lineTo(
            this.position.x - this.direction.x * 70,
            this.position.y - this.direction.y * 70
        );
        ctx.strokeStyle = "#646464";
        ctx.lineWidth = 30;
        ctx.stroke();
    }
}
