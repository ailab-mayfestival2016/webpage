define([], function () {
    var UTILS = {};
    UTILS.PCB_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    UTILS.PCB_DARKEN_FACTOR = 5;
    UTILS.BLOCK_SIZE = 13;
    UTILS.BLOCK_SCALE_FACTOR = 0.1;

    /* MISC */
    UTILS.hexToRgb = function (hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new THREE.Vector4(
            parseInt(result[1], 16) / 255.0,
            parseInt(result[2], 16) / 255.0,
            parseInt(result[3], 16) / 255.0,
            1.0
        ) : null;
    }

    UTILS.randi = function (min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    return UTILS;
});