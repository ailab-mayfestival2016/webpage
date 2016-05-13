define(['scene', 'engine/utils'], function (SCENE, UTILS) {
    SCENE.init("", false, {opaque: true, hide_debug: true});
    SCENE.scene.camera.position.set(UTILS.CENTER[0] - 200, UTILS.CENTER[1] -200, 200);
    SCENE.scene.controls = new THREE.OrbitControls(SCENE.scene.camera, SCENE.scene.element);
    SCENE.scene.controls.rotateUp(Math.PI / 4);
    SCENE.scene.controls.target.set(//0, 300, 0);
    /**/UTILS.CENTER[0],
        UTILS.CENTER[1],
        UTILS.CENTER[2]
    );//*/

    /*scene.init_environment_default();
    scene.set_environment("");
    scene.init_blocks(map);
    scene.load_geometry();
    scene.create_particle_system();
    scene.animate();*/
    //SCENE.scene.element.addEventListener('click', SCENE.scene.fullscreen.bind(SCENE.scene), false);

    SCENE.connect();
    //SCENE.test();
    SCENE.start(false);
});