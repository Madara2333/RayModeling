import OpticalSegment from "./OpticalSegment.js";

export default class Mirror extends OpticalSegment {
    constructor(position, angle = 90, length = 180) {
        super(position, angle, length);
        this.tag = "mirror";
    }

    draw(ctx) {
        this.drawLine(ctx, "#9fb5c8", 10);
        this.drawLine(ctx, "#e7f1fa", 3);
    }
}
