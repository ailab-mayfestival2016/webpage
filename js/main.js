define(['engine/block', 'engine/scene', 'engine/utils'], function (block_class, arcanoid_scene, UTILS) {
    var scene = new arcanoid_scene();

    var map = [];
    for (var i = 0; i < 100; i++) {
        map.push({
            x: i % 10,
            y: Math.floor(i / 10),
            color: UTILS.PCB_COLORS[UTILS.randi(0, UTILS.PCB_COLORS.length)]
        })
    }
    scene.init_controls();
    scene.init_environment_default();
    scene.init_blocks(map);
    scene.load_geometry();
    scene.create_particle_system();
    scene.animate();
});