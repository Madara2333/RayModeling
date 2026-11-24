
import Shape from "../../geometry/Shape.js";
import LaserSource from "../../optics/LaserSource.js";
import Lens from "../../optics/Lens.js";

export default class EditorTransform {
    constructor(editor, camera, canvas) {
        this.editor = editor;
        this.camera = camera;
        this.canvas = canvas;

        this.draggingVertex = false;
        this.draggedVertexIndex = -1;

        this.draggingLensHandle = false;
        this.draggedLensHandle = null;
        this.draggingLaserDirection = false;

        this.draggingObject = false;
        this.dragStartPointer = null;
        this.dragStartPosition = null;
        this.dragStartPoints = null;
        this.dragStartEdgePositions = null;

        this.selectedObject = null;
    }

    // Начало перетаскивания вершины или ручки линзы
    startVertexDrag(object, screenPosition, event = null) {
        if (object instanceof Lens) {
            const handle = this._findLensHandleAtScreenPosition(
                object,
                screenPosition
            );

            if (!handle) return false;

            this.draggingLensHandle = true;
            this.draggedLensHandle = handle;
            this.selectedObject = object;

        } else if (object instanceof LaserSource) {
            if (!this._findLaserDirectionHandleAtScreenPosition(
                object,
                screenPosition
            )) {
                return false;
            }

            this.draggingLaserDirection = true;
            this.selectedObject = object;

        } else if (object instanceof Shape) {
            const index = this._findVertexAtScreenPosition(
                object,
                screenPosition
            );

            if (index === -1) return false;

            this.draggingVertex = true;
            this.draggedVertexIndex = index;
            this.selectedObject = object;

        } else {
            return false;
        }

        if (event) {
            this.canvas.setPointerCapture(event.pointerId);
        }

        return true;
    }
    
    _findLaserDirectionHandleAtScreenPosition(source, screenPosition) {
        const handleRadius = 8;
        const circleRadius = 50;

        const center = this.camera.worldToScreen(source.position);

        const handlePosition = {
            x: center.x + source.direction.x * circleRadius,
            y: center.y + source.direction.y * circleRadius
        };

        const dx = screenPosition.x - handlePosition.x;
        const dy = screenPosition.y - handlePosition.y;

        return dx * dx + dy * dy <= handleRadius ** 2;
    }

    // Поиск ручки линзы
    _findLensHandleAtScreenPosition(lens, screenPosition) {
        const handleRadius = 8;

        const position = lens.position;
        const direction = lens.direction;
        const delta = lens.delta;

        const handles = [
            {
                type: "focus",
                position: {
                    x: position.x + direction.x * delta,
                    y: position.y + direction.y * delta
                }
            },
            {
                type: "focus",
                position: {
                    x: position.x - direction.x * delta,
                    y: position.y - direction.y * delta
                }
            },
            {
                type: "edge",
                index: 0,
                position: lens.edgePosition1
            },
            {
                type: "edge",
                index: 1,
                position: lens.edgePosition2
            }
        ];

        for (const handle of handles) {
            const screenPoint = this.camera.worldToScreen(
                handle.position
            );

            const dx = screenPosition.x - screenPoint.x;
            const dy = screenPosition.y - screenPoint.y;

            if (dx * dx + dy * dy <= handleRadius ** 2) {
                return handle;
            }
        }

        return null;
    }

    // Поиск вершины Shape
    _findVertexAtScreenPosition(shape, screenPosition) {
        const handleRadius = 8;

        for (let i = 0; i < shape.points.length; i++) {
            const screenPoint = this.camera.worldToScreen(
                shape.points[i]
            );

            const dx = screenPosition.x - screenPoint.x;
            const dy = screenPosition.y - screenPoint.y;

            if (dx * dx + dy * dy <= handleRadius ** 2) {
                return i;
            }
        }

        return -1;
    }

    // Перемещение вершины Shape
    _moveSelectedVertex(worldPosition) {
        const object = this.selectedObject;
        const index = this.draggedVertexIndex;

        if (!(object instanceof Shape)) return;

        if (index < 0 || index >= object.points.length) {
            return;
        }

        object.points[index].x = worldPosition.x;
        object.points[index].y = worldPosition.y;

        this.editor.refreshInspector();
    }

    // Перемещение ручки Lens
    _moveSelectedLensHandle(worldPosition) {
        const lens = this.selectedObject;
        const handle = this.draggedLensHandle;

        if (!(lens instanceof Lens) || !handle) return;

        if (handle.type === "edge") {
            lens.setEdgePosition(
                handle.index,
                worldPosition
            );
        }

        if (handle.type === "focus") {
            lens.setCurvatureFromHandle(worldPosition);
        }

        this.editor.refreshInspector();
    }

    _moveSelectedLaserDirection(screenPosition) {
        const source = this.selectedObject;

        if (!(source instanceof LaserSource)) return;

        const center = this.camera.worldToScreen(source.position);

        const dx = screenPosition.x - center.x;
        const dy = screenPosition.y - center.y;

        const length = Math.hypot(dx, dy);

        if (length < 0.001) return;

        source.direction.x = dx / length;
        source.direction.y = dy / length;

        this.editor.refreshInspector();
    }

    // Начало перемещения объекта
    startObjectDrag(object, worldPosition, event) {
        this.selectedObject = object;
        this.draggingObject = true;
        this.dragStartPointer = worldPosition.clone();

        if (object instanceof Lens) {
            this.dragStartEdgePositions = [
                {
                    x: object.edgePosition1.x,
                    y: object.edgePosition1.y
                },
                {
                    x: object.edgePosition2.x,
                    y: object.edgePosition2.y
                }
            ];
        } else if (object instanceof LaserSource) {
            this.dragStartPosition = object.position.clone();
        } else if (object instanceof Shape) {
            this.dragStartPoints = object.points.map(point => ({
                x: point.x,
                y: point.y
            }));
        } else {
            this.endDrag();
            return false;
        }

        // this.canvas.setPointerCapture(event.pointerId);
        return true;
    }

    // Перемещение объекта целиком
    _moveSelectedObject(worldPosition) {
        const object = this.selectedObject;

        if (!object || !this.dragStartPointer) return;

        const dx = worldPosition.x - this.dragStartPointer.x;
        const dy = worldPosition.y - this.dragStartPointer.y;

        if (object instanceof Lens) {
            object.edgePosition1.x =
                this.dragStartEdgePositions[0].x + dx;

            object.edgePosition1.y =
                this.dragStartEdgePositions[0].y + dy;

            object.edgePosition2.x =
                this.dragStartEdgePositions[1].x + dx;

            object.edgePosition2.y =
                this.dragStartEdgePositions[1].y + dy;

            object.updateGeometry();

        } else if (object instanceof LaserSource) {
            object.position.x = this.dragStartPosition.x + dx;
            object.position.y = this.dragStartPosition.y + dy;

        } else if (object instanceof Shape) {
            for (let i = 0; i < object.points.length; i++) {
                object.points[i].x =
                    this.dragStartPoints[i].x + dx;

                object.points[i].y =
                    this.dragStartPoints[i].y + dy;
            }
        }

        this.editor.refreshInspector();
    }

    handlePointerMove(worldPosition) {
        if (this.draggingLensHandle) {
            this._moveSelectedLensHandle(worldPosition);
            return true;
        }

        if (this.draggingLaserDirection) {
            const screenPosition = this.camera.worldToScreen(
                worldPosition
            );

            this._moveSelectedLaserDirection(screenPosition);
            return true;
        }

        if (this.draggingVertex) {
            this._moveSelectedVertex(worldPosition);
            return true;
        }

        if (this.draggingObject) {
            this._moveSelectedObject(worldPosition);
            return true;
        }

        return false;
    }

    endDrag() {
        this.draggingVertex = false;
        this.draggedVertexIndex = -1;

        this.draggingLensHandle = false;
        this.draggedLensHandle = null;
        this.draggingLaserDirection = false;

        this.draggingObject = false;

        this.dragStartPointer = null;
        this.dragStartPosition = null;
        this.dragStartPoints = null;
        this.dragStartEdgePositions = null;

        this.selectedObject = null;
    }
}
