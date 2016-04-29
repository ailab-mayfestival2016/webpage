requirejs.config({
    baseUrl: 'js',
    paths: {
        three: 'third-party/threejs/three',
        DeviceOrientationControls: 'third-party/threejs/DeviceOrientationControls',
        OrbitControls: 'third-party/threejs/OrbitControls',
        StereoEffect: 'third-party/threejs/StereoEffect',
        SPE: 'third-party/SPE',
    },
    shim: {
        DeviceOrientationControls: {
            deps: ['three']
        },
        OrbitControls: {
            deps: ['three']
        },
        StereoEffect: {
            deps: ['three']
        },
        SPE: {
            deps: ['three']
        },
/*        backbone: {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        underscore: {
            exports: '_'
        }*/
    }
});

