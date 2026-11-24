
import IdGenerator from "../engine/IdGenerator.js";

export default class Path {
    constructor() {
        this.rays = [];
        this.id = IdGenerator.NewId();
        this.wavelength = 550;
        this.intensity = 1;
    }

    add(ray) {
        ray.pathId = this.id;
        this.rays.push(ray);
    }
}
