define(['engine/block', 'engine/scene', 'engine/utils'], function (block_class, arcanoid_scene, UTILS) {
    var scene = new arcanoid_scene();

    var map = [];
    for (var i = 0; i < 16; i++) {
        map.push({
            x: (i % 4)* 70 - 100,
            y: 200 + (Math.floor(i / 4))* 70,
            color: UTILS.PCB_COLORS[UTILS.randi(0, UTILS.PCB_COLORS.length)]
        })
    }
    scene.camera.position.set(0, -600, 200);
    scene.controls = new THREE.OrbitControls(scene.camera, scene.element);
    scene.controls.rotateUp(Math.PI / 4);
    scene.controls.target.set(//0, 300, 0);
    /**/UTILS.CENTER[0],
        UTILS.CENTER[1],
        UTILS.CENTER[2]
    );//*/

    scene.init_environment_default();
    scene.set_environment("");
    scene.init_blocks(map);
    scene.load_geometry();
    scene.create_particle_system();
    scene.animate();
});