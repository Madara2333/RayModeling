
import Shape from "../../geometry/Shape.js";
import LaserSource from "../../optics/LaserSource.js";
import Lens from "../../optics/Lens.js";
import Ray from "../../geometry/Ray.js";
import Mirror from "../../optics/Mirror.js";
import OpticalFilter from "../../optics/OpticalFilter.js";
import Sensor from "../../optics/Sensor.js";

export default class EditorInspector {
    constructor(container, scene) {
        this.container = container;
        this.scene = scene;
        this.object = null;

        this.container?.addEventListener(
            "change",
            (event) => this.handleChange(event)
        );
        this.container?.addEventListener("click", (event) => {
            const preset = event.target.closest("[data-wavelength-preset]");
            if (!preset || !(this.object instanceof LaserSource)) return;

            this.object.setMode("monochromatic");
            this.object.setWavelength(Number(preset.dataset.wavelengthPreset));
            this.render();
        });
    }

    setObject(object) {
        this.object = object;
        this.render();
    }

    refresh() {
        if (!this.container || !this.object) return;

        const inputs = this.container.querySelectorAll(
            "[data-property]"
        );

        for (const input of inputs) {
            if (input === document.activeElement) continue;

            const value = this.getPropertyValue(
                input.dataset.property
            );

            if (value !== undefined) {
                input.value = value;
            }
        }

        const wavelengthLabel = this.container.querySelector(
            '[data-value="wavelength"]'
        );

        if (wavelengthLabel) {
            wavelengthLabel.textContent =
                `${Math.round(this.object.wavelength)} нм`;
        }

        const divergenceLabel = this.container.querySelector(
            '[data-value="divergence"]'
        );

        if (divergenceLabel) {
            divergenceLabel.textContent =
                `${this.object.divergence.toFixed(2)}°`;
        }

        const measurements = this.container.querySelector("[data-sensor-measurements]");
        if (measurements && this.object instanceof Sensor) {
            const values = this.object.getMeasurements();
            measurements.textContent = `${values.rays} лучей · суммарная мощность ${values.power.toFixed(3)}${values.minWavelength === null ? "" : ` · ${Math.round(values.minWavelength)}–${Math.round(values.maxWavelength)} нм`}`;
        }

        if (this.object instanceof Lens) {
            const measurement = this.getLensMeasurement(this.object);
            const incidence = this.container.querySelector('[data-lens-measurement="incidence"]');
            const refraction = this.container.querySelector('[data-lens-measurement="refraction"]');
            const count = this.container.querySelector('[data-lens-measurement="count"]');
            if (incidence) incidence.textContent = measurement ? `${measurement.incidence.toFixed(2)}°` : "—";
            if (refraction) refraction.textContent = measurement ? (measurement.refraction === null ? "полное отражение" : `${measurement.refraction.toFixed(2)}°`) : "—";
            if (count) count.textContent = String(measurement?.rays || 0);
        }

        if (this.object instanceof LaserSource) {
            const measurement = this.getSourceRefractionMeasurement(this.object);
            const angle = this.container.querySelector("[data-source-refraction]");
            const count = this.container.querySelector("[data-source-refraction-count]");
            if (angle) angle.textContent = measurement ? (measurement.totalInternal ? "полное внутреннее отражение" : `${measurement.angle.toFixed(2)}°`) : "на пути нет стекла";
            if (count) count.textContent = measurement ? `${measurement.rays} пересечений` : "0 пересечений";
            const beamWidth = this.container.querySelector("[data-beam-width]");
            if (beamWidth) beamWidth.textContent = `Ширина параллельного пучка: ${this.object.beamWidth || 0}`;
        }

        const colorPreview = this.container.querySelector(
            ".inspector__color-preview"
        );

        if (colorPreview) {
            colorPreview.style.backgroundColor =
                this.getWavelengthColor(this.object.wavelength);
        }
        const samplesLabel = this.container.querySelector("[data-spectrum-samples]");
        if (samplesLabel) samplesLabel.textContent = `Число компонент спектра: ${this.object.spectrumSamples}`;
        const rayCountLabel = this.container.querySelector("[data-ray-count]");
        if (rayCountLabel) rayCountLabel.textContent = `Число лучей в пучке: ${this.object.rayCount || 9}`;
    }

    getWavelengthColor(wavelength) {
        const color = Ray.wavelengthToRGB(wavelength);
        return `rgb(${color.r}, ${color.g}, ${color.b})`;
    }

    getPropertyValue(property) {
        const object = this.object;

        if (property === "wavelength") return object.wavelength;
        if (property === "divergence") return object.divergence;

        if (property === "position.x") return object.position.x;
        if (property === "position.y") return object.position.y;

        if (property === "power") return object.power;
        if (property === "beamWidth") return object.beamWidth;

        if (property === "angle" && object.direction) {
            return this.getDirectionAngle(object);
        }

        if (property === "deepth") return object.deepth;
        if (property === "focusLength") return object.focusLength;

        if (property === "edgePosition1.x") {
            return object.edgePosition1.x;
        }
        if (property === "edgePosition1.y") {
            return object.edgePosition1.y;
        }
        if (property === "edgePosition2.x") {
            return object.edgePosition2.x;
        }
        if (property === "edgePosition2.y") {
            return object.edgePosition2.y;
        }

        if (property === "color") return object.material?.color;
        if (property === "n") return object.material?.n;
        if (property === "dispersion") {
            return object.material?.dispersion;
        }

        if (object.isSegment) {
            if (property === "position.x") return object.position.x;
            if (property === "position.y") return object.position.y;
            if (property === "angle") return object.angle;
            if (property === "length") return object.length;
            if (property === "minWavelength") return object.minWavelength;
            if (property === "maxWavelength") return object.maxWavelength;
        }

        const pointMatch = property.match(
            /^points\.(\d+)\.(x|y)$/
        );

        if (pointMatch && object instanceof Shape) {
            const index = Number(pointMatch[1]);
            const axis = pointMatch[2];

            return object.points[index]?.[axis];
        }

        return undefined;
    }

    getDirectionAngle(source) {
        const radians = Math.atan2(
            source.direction.y,
            source.direction.x
        );

        return radians * 180 / Math.PI;
    }

    getLensMeasurement(lens) {
        const interactions = this.object && this.object === lens
            ? this._rayPaths().filter(ray => ray.interaction && ray.intersection.object === lens)
            : [];
        if (!interactions.length) return null;
        const incidence = interactions.reduce((sum, ray) => sum + ray.interaction.incidenceAngle, 0) / interactions.length;
        const transmitted = interactions.filter(ray => ray.interaction.refractionAngle !== null);
        const refraction = transmitted.length
            ? transmitted.reduce((sum, ray) => sum + ray.interaction.refractionAngle, 0) / transmitted.length
            : null;
        return { incidence, refraction, rays: interactions.length };
    }

    _rayPaths() {
        return (this.scene?.sources || []).flatMap(source => source.rayPath?.rays || []);
    }

    getSourceRefractionMeasurement(source) {
        const interactions = (source.rayPath?.rays || [])
            .filter(ray => ray.interaction && ray.intersection.object?.material);
        if (!interactions.length) return null;
        // Show the angle inside glass at the entering surface, where wavelength
        // changes the measured direction. The exit surface bends the ray back.
        const enteringGlass = interactions.filter(ray => ray.interaction.n2 > ray.interaction.n1);
        const measured = enteringGlass.length ? enteringGlass : interactions;
        const transmitted = measured.filter(ray => ray.interaction.refractionAngle !== null);
        if (!transmitted.length) return { angle: null, rays: interactions.length, totalInternal: true };
        const angle = transmitted.reduce((sum, ray) => sum + ray.interaction.refractionAngle, 0) / transmitted.length;
        return { angle, rays: transmitted.length, totalInternal: false };
    }

    render() {
        if (!this.container) return;

        if (!this.object) {
            this.container.innerHTML = `
                <div class="inspector__empty">
                    <strong>Объект не выбран</strong>
                    Выберите источник, линзу или форму на рабочей области, чтобы посмотреть и изменить её параметры.
                </div>
            `;
            return;
        }

        if (this.object instanceof LaserSource) {
            this.renderLaserSource();
            return;
        }

        if (this.object instanceof Lens) {
            this.renderLens();
            return;
        }

        if (this.object.isSegment) {
            this.renderSegment();
            return;
        }

        if (this.object instanceof Shape) {
            this.renderShape();
            return;
        }

        this.container.innerHTML = `
            <div class="inspector__empty">
                <strong>Параметры недоступны</strong>
                Для этого типа объекта пока нет настроек.
            </div>
        `;
    }

    renderSegment() {
        const object = this.object;
        const isFilter = object instanceof OpticalFilter;
        const isSensor = object instanceof Sensor;
        const title = object instanceof Mirror ? "Зеркало" : isFilter ? "Спектральный фильтр" : "Датчик";
        const details = isSensor
            ? `<p class="inspector__note">Датчик — экран-приёмник: останавливает лучи в месте установки и считает их количество и суммарную мощность.</p><div class="inspector__property"><span>Измерения</span><span data-sensor-measurements>0 лучей · суммарная мощность 0.000</span></div>`
            : isFilter
                ? `<h3 class="inspector__title">Диапазон пропускания</h3>
                    <label class="inspector__field"><span>От, нм</span><input type="number" min="380" max="780" data-property="minWavelength" value="${object.minWavelength}"></label>
                    <label class="inspector__field"><span>До, нм</span><input type="number" min="380" max="780" data-property="maxWavelength" value="${object.maxWavelength}"></label>`
                : `<p class="inspector__note">Отражает падающий луч.</p>`;
        this.container.innerHTML = `
            <section class="inspector__section">
                <div class="inspector__object-heading"><span class="inspector__object-icon" aria-hidden="true">${isSensor ? "▤" : isFilter ? "▥" : "／"}</span><div><strong>${title}</strong><small>Оптический элемент</small></div></div>
                ${details}
                <h3 class="inspector__title">Положение и размер</h3>
                <label class="inspector__field"><span>Координата X</span><input type="number" data-property="position.x" value="${object.position.x}" step="1"></label>
                <label class="inspector__field"><span>Координата Y</span><input type="number" data-property="position.y" value="${object.position.y}" step="1"></label>
                <label class="inspector__field"><span>Угол</span><input type="number" data-property="angle" value="${object.angle}" step="1"></label>
                <label class="inspector__field"><span>Длина</span><input type="number" data-property="length" value="${object.length}" min="1" step="1"></label>
            </section>`;
        this.refresh();
    }

    
    renderLaserSource() {
        const source = this.object;

        this.container.innerHTML = `
            <section class="inspector__section">
                <div class="inspector__object-heading">
                    <span class="inspector__object-icon" aria-hidden="true">✳</span>
                    <div><strong>Источник света</strong><small>Лазер</small></div>
                </div>
                <h3 class="inspector__title">Излучение</h3>
                <label class="inspector__field inspector__field--stacked">
                    <span>Режим</span>
                    <select data-property="mode" aria-label="Режим излучения">
                        <option value="white" ${source.mode === "white" ? "selected" : ""}>Белый свет — весь спектр</option>
                        <option value="monochromatic" ${source.mode === "monochromatic" ? "selected" : ""}>Один цвет — одна длина волны</option>
                        <option value="rgb" ${source.mode === "rgb" ? "selected" : ""}>Три цвета RGB — для сравнения</option>
                    </select>
                </label>

                ${source.mode === "white" ? `<label class="inspector__field inspector__field--stacked"><span data-spectrum-samples>Число компонент спектра: ${source.spectrumSamples}</span><input type="range" min="6" max="42" step="1" value="${source.spectrumSamples}" data-property="spectrumSamples"></label>` : ""}

                <div class="inspector__field inspector__field--stacked" ${source.mode !== "monochromatic" ? "hidden" : ""}>
                    <label class="inspector__value-label" for="laser-wavelength">
                        Длина волны <output data-value="wavelength">${Math.round(source.wavelength)} нм</output>
                    </label>
                    <div class="inspector__range-row">
                        <input id="laser-wavelength" type="range" min="380" max="780" step="1" value="${source.wavelength}" data-property="wavelength" aria-label="Длина волны">
                        <span class="inspector__color-preview" style="background-color:${this.getWavelengthColor(source.wavelength)}" aria-hidden="true"></span>
                    </div>
                    <div class="inspector__wavelength-presets" aria-label="Частые длины волн">
                        <button type="button" data-wavelength-preset="450" title="Синий свет, 450 нм">450 нм</button>
                        <button type="button" data-wavelength-preset="532" title="Зелёный свет, 532 нм">532 нм</button>
                        <button type="button" data-wavelength-preset="650" title="Красный свет, 650 нм">650 нм</button>
                    </div>
                    <div class="inspector__range-scale"><span>380 нм</span><span>780 нм</span></div>
                </div>
                ${source.mode === "white" ? '<p class="inspector__note">Белый свет состоит из набора длин волн 380–780 нм. Призма показывает их разложение.</p>' : ""}
                ${source.mode === "rgb" ? '<p class="inspector__note">Рисует три отдельных луча — красный, зелёный и синий. Это режим сравнения цветов, а не сплошной спектр белого света.</p>' : ""}
                ${source.mode === "monochromatic" ? '<p class="inspector__note">Угол источника задаёт направление до элемента. Угол преломления после стекла показан ниже.</p>' : ""}
            </section>

            <section class="inspector__section">
                <h3 class="inspector__title">Параметры луча</h3>
                <label class="inspector__field"><span>Мощность</span><input type="number" min="0" max="1" step="0.01" value="${source.power}" data-property="power" aria-label="Мощность"></label>
                <label class="inspector__field"><span>Угол источника</span><input type="number" step="1" value="${this.getDirectionAngle(source).toFixed(1)}" data-property="angle" aria-label="Угол направления источника в градусах"></label>
                <div class="inspector__property"><span>Угол преломления</span><span data-source-refraction>на пути нет стекла</span></div>
                <div class="inspector__property"><span>Учтено</span><span data-source-refraction-count>0 пересечений</span></div>
                <div class="inspector__field inspector__field--stacked">
                    <label class="inspector__value-label" for="laser-divergence">
                        Расходимость <output data-value="divergence">${source.divergence.toFixed(2)}°</output>
                    </label>
                    <input id="laser-divergence" type="range" min="0" max="2" step="0.05" value="${source.divergence}" data-property="divergence" aria-label="Расходимость луча">
                    <div class="inspector__range-scale"><span>0°</span><span>2°</span></div>
                </div>
                <label class="inspector__field inspector__field--stacked"><span data-ray-count>Число лучей в пучке: ${source.rayCount || 9}</span><input type="range" min="3" max="31" step="2" value="${source.rayCount || 9}" data-property="rayCount" aria-label="Число лучей в пучке"></label>
                <label class="inspector__field inspector__field--stacked"><span data-beam-width>Ширина параллельного пучка: ${source.beamWidth || 0}</span><input type="range" min="0" max="600" step="10" value="${source.beamWidth || 0}" data-property="beamWidth" aria-label="Ширина параллельного пучка"></label>
            </section>

            <section class="inspector__section">
                <h3 class="inspector__title">Положение</h3>
                <label class="inspector__field"><span>Координата X</span><input type="number" step="1" value="${source.position.x}" data-property="position.x" aria-label="Координата X"></label>
                <label class="inspector__field"><span>Координата Y</span><input type="number" step="1" value="${source.position.y}" data-property="position.y" aria-label="Координата Y"></label>
            </section>
        `;
    }


    renderLens() {
        const lens = this.object;
        const material = lens.material;
        const measurement = this.getLensMeasurement(lens);

        this.container.innerHTML = `
            <section class="inspector__section">
                <div class="inspector__object-heading">
                    <span class="inspector__object-icon" aria-hidden="true">◖</span>
                    <div><strong>Линза</strong><small>Оптический элемент</small></div>
                </div>

                <h3 class="inspector__title">
                    Край 1
                </h3>

                <label class="inspector__field">
                    <span>X</span>
                    <input
                        type="number"
                        data-property="edgePosition1.x"
                        value="${lens.edgePosition1.x}"
                        step="1"
                    >
                </label>

                <label class="inspector__field">
                    <span>Y</span>
                    <input
                        type="number"
                        data-property="edgePosition1.y"
                        value="${lens.edgePosition1.y}"
                        step="1"
                    >
                </label>

                <h3 class="inspector__title">
                    Край 2
                </h3>

                <label class="inspector__field">
                    <span>X</span>
                    <input
                        type="number"
                        data-property="edgePosition2.x"
                        value="${lens.edgePosition2.x}"
                        step="1"
                    >
                </label>

                <label class="inspector__field">
                    <span>Y</span>
                    <input
                        type="number"
                        data-property="edgePosition2.y"
                        value="${lens.edgePosition2.y}"
                        step="1"
                    >
                </label>

                <h3 class="inspector__title">
                    Геометрия
                </h3>

                <label class="inspector__field">
                    <span>Толщина</span>
                    <input
                        type="number"
                        data-property="deepth"
                        value="${lens.deepth}"
                        min="0"
                        step="1"
                    >
                </label>

                <label class="inspector__field">
                    <span>Фокусное расстояние</span>
                    <input
                        type="number"
                        data-property="focusLength"
                        value="${lens.focusLength}"
                        min="0.01"
                        step="1"
                    >
                </label>

                <div class="inspector__property"><span>Угол падения</span><span data-lens-measurement="incidence">${measurement ? `${measurement.incidence.toFixed(2)}°` : "—"}</span></div>
                <div class="inspector__property"><span>Угол преломления</span><span data-lens-measurement="refraction">${measurement ? (measurement.refraction === null ? "полное отражение" : `${measurement.refraction.toFixed(2)}°`) : "—"}</span></div>
                <div class="inspector__property"><span>Учтено лучей</span><span data-lens-measurement="count">${measurement?.rays || 0}</span></div>

                <h3 class="inspector__title">
                    Материал
                </h3>

                <label class="inspector__field">
                    <span>Цвет</span>
                    <input
                        type="color"
                        data-property="color"
                        value="${material.color}"
                    >
                </label>

                <label class="inspector__field">
                    <span>n</span>
                    <input
                        type="number"
                        data-property="n"
                        value="${material.n}"
                        min="1.01"
                        step="0.01"
                    >
                </label>

                <label class="inspector__field">
                    <span>Дисперсия</span>
                    <input
                        type="number"
                        data-property="dispersion"
                        value="${material.dispersion}"
                        step="0.001"
                    >
                </label>
            </section>
        `;
    }

    renderShape() {
        const shape = this.object;
        const material = shape.material;

        const pointsHTML = shape.points.map((point, index) => `
            <div class="inspector__point">
                <div class="inspector__point-title">
                    Точка ${index + 1}
                </div>

                <label class="inspector__field">
                    <span>X</span>
                    <input
                        type="number"
                        data-property="points.${index}.x"
                        value="${point.x}"
                        step="1"
                    >
                </label>

                <label class="inspector__field">
                    <span>Y</span>
                    <input
                        type="number"
                        data-property="points.${index}.y"
                        value="${point.y}"
                        step="1"
                    >
                </label>
            </div>
        `).join("");

        this.container.innerHTML = `
            <section class="inspector__section">
                <div class="inspector__object-heading">
                    <span class="inspector__object-icon" aria-hidden="true">◇</span>
                    <div><strong>Форма</strong><small>Оптический элемент</small></div>
                </div>

                <div class="inspector__property">
                    <span>Вершины</span>
                    <span>${shape.points.length}</span>
                </div>

                <details class="inspector__details">
                    <summary>
                        Изменить координаты
                    </summary>

                    <div class="inspector__points">
                        ${pointsHTML}
                    </div>
                </details>

                <h3 class="inspector__title">
                    Материал
                </h3>

                <label class="inspector__field">
                    <span>Цвет</span>
                    <input
                        type="color"
                        data-property="color"
                        value="${material.color}"
                    >
                </label>

                <label class="inspector__field">
                    <span>n</span>
                    <input
                        type="number"
                        data-property="n"
                        value="${material.n}"
                        min="1.01"
                        step="0.01"
                    >
                </label>

                <label class="inspector__field">
                    <span>Дисперсия</span>
                    <input
                        type="number"
                        data-property="dispersion"
                        value="${material.dispersion}"
                        step="0.001"
                    >
                </label>
            </section>
        `;
    }

    handleChange(event) {
        const input = event.target;
        const property = input.dataset.property;

        if (!property || !this.object) return;

        // Обработка режима источника
        if (
            this.object instanceof LaserSource &&
            property === "mode"
        ) {
            this.object.setMode(input.value);
            this.render();
            return;
        }

        const isColor = input.type === "color";
        const value = isColor ? input.value : Number(input.value);

        if (!isColor && !Number.isFinite(value)) return;

        const object = this.object;

        
        if (object instanceof LaserSource) {
            if (property === "mode") {
                object.setMode(input.value);
                this.render();
                return;
            }

            if (property === "position.x") {
                object.position.x = value;

            } else if (property === "position.y") {
                object.position.y = value;

            } else if (property === "power" && value >= 0 && value <= 1) {
                object.power = value;

            } else if (property === "angle") {
                const radians = value * Math.PI / 180;

                object.direction.x = Math.cos(radians);
                object.direction.y = Math.sin(radians);

            } else if (property === "wavelength") {
                object.setWavelength(value);

            } else if (property === "spectrumSamples") {
                object.setSpectrumSamples(value);

            } else if (property === "divergence") {
                object.divergence = Math.max(0, Math.min(2, value));
            } else if (property === "rayCount") {
                object.rayCount = Math.max(3, Math.min(31, Math.round(value)));
            } else if (property === "beamWidth") {
                object.beamWidth = Math.max(0, Math.min(600, value));
            }

            this.refresh();
            return;
        }

        if (object.isSegment) {
            if (property === "position.x") object.position.x = value;
            else if (property === "position.y") object.position.y = value;
            else if (property === "angle") object.angle = value;
            else if (property === "length" && value > 0) object.length = value;
            else if (property === "minWavelength") object.minWavelength = Math.max(380, Math.min(object.maxWavelength, value));
            else if (property === "maxWavelength") object.maxWavelength = Math.min(780, Math.max(object.minWavelength, value));
            this.refresh();
            return;
        }


        if (object instanceof Lens) {
            if (property.startsWith("edgePosition")) {
                const match = property.match(
                    /^edgePosition([12])\.(x|y)$/
                );

                if (match) {
                    const index = Number(match[1]) - 1;
                    const axis = match[2];

                    const point = index === 0
                        ? { ...object.edgePosition1 }
                        : { ...object.edgePosition2 };

                    point[axis] = value;

                    object.setEdgePosition(index, point);
                }
            } else if (property === "deepth" && value >= 0) {
                object.deepth = value;
                object.updateGeometry();
            } else if (
                property === "focusLength" &&
                value > 0
            ) {
                object.setFocusLength(value);
            } else if (property === "color") {
                object.material.color = value;
            } else if (property === "n" && value > 1) {
                object.material.n = value;
                object.updateGeometry();
            } else if (property === "dispersion") {
                object.material.dispersion = value;
            }

            this.refresh();
            return;
        }

        if (object instanceof Shape) {
            if (property === "color") {
                object.material.color = value;
            } else if (property === "n" && value > 1) {
                object.material.n = value;
            } else if (property === "dispersion") {
                object.material.dispersion = value;
            }

            const pointMatch = property.match(
                /^points\.(\d+)\.(x|y)$/
            );

            if (pointMatch) {
                const index = Number(pointMatch[1]);
                const axis = pointMatch[2];
                const point = object.points[index];

                if (point) {
                    point[axis] = value;
                }
            }
        }
    }
}
