/**
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 * @fileoverview Free drawing module, Set brush
 */
import fabric from 'fabric/dist/fabric.require';
import Component from '../interface/component';
import consts from '../consts';

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

        this._listeners = {
            mousedown: this._onFabricMouseDown.bind(this),
            mouseover: this._onFabricMouseOver.bind(this),
            mouseout: this._onFabricMouseOut.bind(this),
            mouseup: this._onFabricMouseUp.bind(this)
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
        if (this.isPencilMode) {
            canvas.isDrawingMode = true;
        } else {
            canvas.defaultCursor = 'crosshair';
            canvas.hoverCursor = 'crosshair';
            canvas.selection = false;
            canvas.forEachObject(obj => {
                obj.set({
                    // evented: false,
                    perPixelTargetFind: true,
                    selectable: false,
                    hasControls: false,
                    hasBorders: false
                });
            });
            canvas.on({
                'mouse:down': this._listeners.mousedown
            });
        }
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
        if (this.isPencilMode) {
            canvas.isDrawingMode = false;
        } else {
            canvas.defaultCursor = 'default';
            canvas.selection = true;
            // canvas.forEachObject(obj => {
            //     obj.set({
            //         evented: true
            //     });
            // });
            canvas.off('mouse:down', this._listeners.mousedown);
        }
    }

    /**
     * Mousedown event handler in fabric canvas
     * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event object
     * @private
     */
    _onFabricMouseDown(fEvent) {
        const canvas = this.getCanvas();
        if (fEvent.target) {
            canvas.remove(fEvent.target);
        }
        canvas.on({
            'mouse:up': this._listeners.mouseup,
            'mouse:over': this._listeners.mouseover,
            'mouse:out': this._listeners.mouseout
        });
    }

    _onFabricMouseOver(fEvent) {
        const canvas = this.getCanvas();
        if (fEvent.target) {
            canvas.remove(fEvent.target);
        }
    }

    _onFabricMouseOut(fEvent) {
        const canvas = this.getCanvas();
        if (fEvent.target) {
            canvas.remove(fEvent.target);
        }
    }

    /**
     * Mouseup event handler in fabric canvas
     * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event object
     * @private
     */
    _onFabricMouseUp() {
        const canvas = this.getCanvas();
        canvas.off({
            'mouse:up': this._listeners.mouseup,
            'mouse:over': this._listeners.mouseover,
            'mouse:out': this._listeners.mouseout
        });
    }
}

module.exports = FreeDrawing;
