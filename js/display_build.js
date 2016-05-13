{
    name: 'display',
    out: 'build/display.js',
    paths: {
        three: 'third-party/threejs/three',
        DeviceOrientationControls: 'third-party/threejs/DeviceOrientationControls',
        OrbitControls: 'third-party/threejs/OrbitControls',
        StereoEffect: 'third-party/threejs/StereoEffect',
        SPE: 'third-party/SPE',
        TrackballControls: 'three.js/examples/js/controls/TrackballControls',
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
        TrackballControls: {
            deps: ['three']
        }
    }
}

