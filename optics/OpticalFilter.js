import OpticalSegment from "./OpticalSegment.js";

export default class OpticalFilter extends OpticalSegment {
    constructor(position, angle = 90, length = 180, minWavelength = 500, maxWavelength = 600) {
        super(position, angle, length);
        this.tag = "filter";
        this.minWavelength = minWavelength;
        this.maxWavelength = maxWavelength;
    }

    draw(ctx) {
        this.drawLine(ctx, "rgba(89, 219, 204, 0.35)", 14);
        this.drawLine(ctx, "#69d8cb", 4);
    }
}
