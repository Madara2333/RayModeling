import OpticalSegment from "./OpticalSegment.js";

export default class Sensor extends OpticalSegment {

    constructor(position, angle = 90, length = 180) {
        super(position, angle, length);
        this.tag = "sensor";
        this.measurements = [];
    }

    receive(ray, intersection) {
        this.measurements.push({
            wavelength: ray.wavelength,
            power: ray.power,
            point: { ...intersection.point }
        });
    }

    getMeasurements() {
        const power = this.measurements.reduce((sum, item) => sum + item.power, 0);
        const wavelengths = this.measurements.map((item) => item.wavelength);
        return {
            rays: this.measurements.length,
            power,
            minWavelength: wavelengths.length ? Math.min(...wavelengths) : null,
            maxWavelength: wavelengths.length ? Math.max(...wavelengths) : null
        };
    }

    draw(ctx) {
        this.drawLine(ctx, "#f2c969", 8);
        this.drawLine(ctx, "#fff0b6", 2);
        for (const hit of this.measurements) {
            ctx.beginPath();
            ctx.arc(hit.point.x, hit.point.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#fff2bd";
            ctx.fill();
        }
    }
}
