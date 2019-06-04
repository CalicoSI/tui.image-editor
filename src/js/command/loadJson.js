/**
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 * @fileoverview Load a background (main) image
 */
import commandFactory from '../factory/command';
import consts from '../consts';
import Promise from 'core-js/library/es6/promise';

const {commandNames} = consts;

const command = {
    name: commandNames.LOAD_JSON,

    /**
     * Load a objects from json
     * @param {Graphics} graphics - Graphics instance
     * @param {string} json - Canvas json
     * @returns {Promise}
     */
    execute(graphics, json) {
        return new Promise(resolve => {
            const canvas = graphics.getCanvas();
            this.undoData.objects = graphics.removeAll();

            canvas.loadFromJSON(json, () => {
                canvas.renderAll.bind(canvas);
                canvas.renderAll();
                resolve();
            });
        });
    },

    /**
     * @param {Graphics} graphics - Graphics instance
     * @returns {Promise}
     */
    undo(graphics) {
        graphics.add(this.undoData.objects);

        return Promise.resolve();
    }
};

commandFactory.register(command);

module.exports = command;
