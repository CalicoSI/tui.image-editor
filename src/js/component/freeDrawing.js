/**
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 * @fileoverview Free drawing module, Set brush
 */
import fabric from 'fabric/dist/fabric.require';
import Component from '../interface/component';
import consts from '../consts';

const events = consts.eventNames;

/**
 * FreeDrawing
 * @class FreeDrawing
 * @param {Graphics} graphics - Graphics instance
 * @extends {Component}
 * @ignore
 */
class FreeDrawing extends Component {
    constructor(graphics) {
        super(consts.componentNames.FREE_DRAWING, graphics);

        /**
         * Brush width
         * @type {number}
         */
        this.width = 12;

        /**
         * fabric.Color instance for brush color
         * @type {fabric.Color}
         */
        this.oColor = new fabric.Color('rgba(0, 0, 0, 0.5)');

        this.isPencilMode = false;

        this.isEraseMode = false;

        this.pointerArray = [];
        this.pointerSearchIndex = 0;

        this._listeners = {
            mousedown: this._onFabricMouseDown.bind(this),
            mousemove: this._onFabricMouseMove.bind(this),
            mouseup: this._onFabricMouseUp.bind(this),
            objectchanged: this._onFabricObjectAddedModifiedRemoved.bind(this)
        };

        this._local = {
            isTransparent: this._isTransparent.bind(this),
            startEraserMode: this._startEraserMode.bind(this)
        };

        fabric.Canvas.prototype._onMouseDownInDrawingMode = function(e) {
            // console.log('_onMouseDownInDrawingMode touch?:', e.touches);
            if (e.touches && e.touches.length > 1) {
                return;
            }
            this._isCurrentlyDrawing = true;
            this.discardActiveObject(e).renderAll();
            if (this.clipTo) {
                fabric.util.clipContext(this, this.contextTop);
            }
            const pointer = this.getPointer(e);
            this.freeDrawingBrush.onMouseDown(pointer);
            this._handleEvent(e, 'down');
        };
    }

    /**
     * Start free drawing mode
     * @param {{width: ?number, color: ?string}} [setting] - Brush width & color
     */
    start(setting) {
        const canvas = this.getCanvas();

        this.setBrush(setting);
        this.isPencilMode = (this.oColor.getAlpha() > 0);
        canvas.on({
            'mouse:down': this._listeners.mousedown
        });
        if (this.isPencilMode) {
            canvas.isDrawingMode = true;
        } else {
            canvas.defaultCursor = 'crosshair';
            canvas.hoverCursor = 'crosshair';
            canvas.selection = false;
            canvas.forEachObject(obj => {
                obj.set({
                    evented: false,
                    perPixelTargetFind: false,
                    selectable: false,
                    hasControls: false,
                    hasBorders: false
                });
            });
        }
        canvas.on({
            'object:added': this._listeners.objectchanged,
            'object:modified': this._listeners.objectchanged,
            'object:removed': this._listeners.objectchanged
        });
    }

    /**
     * Set brush
     * @param {{width: ?number, color: ?string}} [setting] - Brush width & color
     */
    setBrush(setting) {
        const brush = this.getCanvas().freeDrawingBrush;

        setting = setting || {};
        this.width = setting.width || this.width;
        if (setting.color) {
            this.oColor = new fabric.Color(setting.color);
        }
        brush.width = this.width;
        brush.color = this.oColor.toRgba();
    }

    /**
     * End free drawing mode
     */
    end() {
        const canvas = this.getCanvas();
        canvas.off('mouse:down', this._listeners.mousedown);
        if (this.isPencilMode) {
            canvas.isDrawingMode = false;
        } else {
            canvas.defaultCursor = 'default';
            canvas.selection = true;
        }
        canvas.off({
            'object:added': this._listeners.objectchanged,
            'object:modified': this._listeners.objectchanged,
            'object:removed': this._listeners.objectchanged
        });
    }

    _isTransparent(ctx, x, y, tolerance) {
        // If tolerance is > 0 adjust start coords to take into account.
        // If moves off Canvas fix to 0
        if (tolerance > 0) {
            if (x > tolerance) {
                x -= tolerance;
            } else {
                x = 0;
            }
            if (y > tolerance) {
                y -= tolerance;
            } else {
                y = 0;
            }
        }

        let _isTransparent = true, i, temp,
            imageData = ctx.getImageData(x, y, (tolerance * 2) || 1, (tolerance * 2) || 1);
        const l = imageData.data.length;

        // Split image data - for tolerance > 1, pixelDataSize = 4;
        for (i = 3; i < l; i += 4) {
            temp = imageData.data[i];
            _isTransparent = temp <= 0;
            if (_isTransparent === false) {
                break; // Stop if colour found
            }
        }

        imageData = null;

        return _isTransparent;
    }

    _startEraserMode() {
        const arrayLen = this.pointerArray.length;
        if (!this.isEraseMode && this.pointerSearchIndex < arrayLen) {
            return;
        }
        const eraseTargets = [];
        const canvas = this.getCanvas();
        const context = canvas.getContext('2d');

        for (this.pointerSearchIndex; this.pointerSearchIndex < arrayLen; this.pointerSearchIndex += 1) {
            const pointEnd = new fabric.Point(this.pointerArray[this.pointerSearchIndex].x,
                this.pointerArray[this.pointerSearchIndex].y);
            let pointStart = pointEnd;
            if (this.pointerSearchIndex !== 0) {
                pointStart = new fabric.Point(this.pointerArray[this.pointerSearchIndex - 1].x,
                    this.pointerArray[this.pointerSearchIndex - 1].y);
            }
            const movedX = Math.abs(pointEnd.x - pointStart.x);
            const movedY = Math.abs(pointEnd.y - pointStart.y);
            const distanceFromPrevPoint = Math.sqrt(((movedX * movedX) + (movedY * movedY)));
            const directionX = (pointEnd.x > pointStart.x ? -1 : 1);
            const directionY = (pointEnd.y > pointStart.y ? -1 : 1);
            // canvasの座標が透明化を判定
            for (let i = 0; i <= distanceFromPrevPoint; i += 3) {
                const checkX = pointEnd.x +
                    (distanceFromPrevPoint ? (i / distanceFromPrevPoint * movedX * directionX) : 0);
                const checkY = pointEnd.y +
                    (distanceFromPrevPoint ? (i / distanceFromPrevPoint * movedY * directionY) : 0);
                if (!this._local.isTransparent(context, checkX, checkY, 0)) {
                    canvas.forEachObject(obj => {
                        if (eraseTargets.indexOf(obj) < 0) {
                            if (!canvas.isTargetTransparent(obj, checkX, checkY)) {
                                eraseTargets.push(obj);
                            }
                        }
                    });
                }
            }
        }
        if (eraseTargets.length) {
            canvas.remove(...eraseTargets);
        }
        setTimeout(this._local.startEraserMode, 50);
    }

    _onFabricMouseDown(fEvent) {
        const canvas = this.getCanvas();
        if (this.isPencilMode) {
            // prevent multitouch
        } else {
            this.isEraseMode = true;
            this.isEraseModeLastUpdate = false;
            const pointer = canvas.getPointer(fEvent.e);
            this.pointerArray = [];
            this.pointerSearchIndex = 0;
            this.pointerArray.push(pointer);
            this._startEraserMode();
            canvas.on({
                'mouse:move': this._listeners.mousemove,
                'mouse:up': this._listeners.mouseup
            });
        }
    }

    _onFabricMouseMove(fEvent) {
        const canvas = this.getCanvas();
        if (this.isPencilMode) {
            // do nothing
        } else {
            this.pointerArray.push(canvas.getPointer(fEvent.e));
        }
    }

    /**
     * Mouseup event handler in fabric canvas
     * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event object
     * @private
     */
    _onFabricMouseUp() {
        const canvas = this.getCanvas();
        if (this.isPencilMode) {
            //
        } else {
            this.isEraseMode = false;
            canvas.off({
                'mouse:move': this._listeners.mousemove,
                'mouse:up': this._listeners.mouseup
            });
        }
    }

    _onFabricObjectAddedModifiedRemoved() {
        this.graphics.fire(events.OBJECT_CHANGED, null);
    }
}

module.exports = FreeDrawing;
