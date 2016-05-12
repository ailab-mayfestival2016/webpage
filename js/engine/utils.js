define([], function () {
    var UTILS = {};
    UTILS.PCB_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    UTILS.PCB_DARKEN_FACTOR = 5;
    UTILS.BLOCK_SIZE = 13;
    UTILS.BLOCK_SCALE_FACTOR = 0.5;
    UTILS.BLOCK_Z = 100.0;
    UTILS.CENTER = [0.0, 100.0, 100.0];
    UTILS.DEFAULT_TRANSPARENCY = 0.7;

    UTILS.LOWRES_TEXTURES = {
        block_normals: 'resources/textures/block_normals.png',
        block_occlusion: 'resources/textures/block_occlusion.png',
        pcb: 'resources/textures/pcb.png',
        pcb_gradient: 'resources/textures/pcb_gradient.png',
        spark: 'resources/textures/spark.jpg',
        explosion: 'resources/textures/sprite-explosion2.png'
    };

    UTILS.HIRES_TEXTURES = {
        block_normals: 'resources/textures/block_normals_hires.png',
        block_occlusion: 'resources/textures/block_occlusion_hires.png',
        pcb: 'resources/textures/pcb_hires.png',
        pcb_gradient: 'resources/textures/pcb_gradient.png',
        spark: 'resources/textures/spark.jpg',
        explosion: 'resources/textures/sprite-explosion2.png'
    };

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