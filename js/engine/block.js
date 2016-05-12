define(['three', 'engine/utils'], function (_, UTILS) {
    var block_class = function(block_material, opts) {
        this.block_mesh = new THREE.Mesh(new THREE.Geometry, block_material.clone());
        this.circuit_mesh = new THREE.Mesh();
        this.block_mesh.scale.x = UTILS.BLOCK_SCALE_FACTOR;
        this.block_mesh.scale.y = UTILS.BLOCK_SCALE_FACTOR;
        this.block_mesh.scale.z = UTILS.BLOCK_SCALE_FACTOR;
        this.block_mesh.rotation.x = Math.PI/2;
        this.sh = opts.shift;
        this.freq = opts.frequency;
        this.amp = opts.amplitude;
        this.meshes = 0;
    }
    block_class.prototype.move = function(x, y) {
        if (this.block_mesh && this.circuit_mesh) {
            this.block_mesh.position.x = x;
            this.block_mesh.position.y = y;
            this.circuit_mesh.position.copy(this.block_mesh.position);
        }
    }
    block_class.prototype.rotate = function(x, y, z) {
        if (this.block_mesh && this.circuit_mesh) {
            this.block_mesh.rotation.x = x;
            this.block_mesh.rotation.y = y;
            this.block_mesh.rotation.z = z;
            this.circuit_mesh.rotation.copy(this.block_mesh.rotation);
        }
    }
    block_class.prototype.scale = function(x, y, z) {
        if (this.block_mesh && this.circuit_mesh) {
            this.block_mesh.scale.x = x;
            this.block_mesh.scale.y = y;
            this.block_mesh.scale.z = z;
            this.circuit_mesh.scale.copy(this.block_mesh.scale);
        }
    }

    block_class.prototype.block_material = function(mat_callback) {
        if (this.block_mesh) {
            mat_callback(this.block_mesh.material);
        }
    }

    block_class.prototype.circuit_material = function(mat_callback) {
        if (this.block_mesh) {
            mat_callback(this.block_mesh.material);
        }
    }

    block_class.prototype.animate = function(elapsedTime) {
        if (!this.deadTime) {
            this.block_mesh.position.z = UTILS.BLOCK_Z + this.amp * Math.sin(elapsedTime / this.freq + this.sh);
            this.circuit_mesh.position.z = this.block_mesh.position.z;
            this.circuit_mesh.material.uniforms.time.value = elapsedTime;
        } else {
            if (!this.block_mesh.opacity) {
                this.block_mesh.opacity = this.block_mesh.material.opacity;
            }
            this.block_mesh.position.z -= (elapsedTime - this.deadTime) * (elapsedTime - this.deadTime);
            this.circuit_mesh.position.z = this.block_mesh.position.z;
            this.circuit_mesh.material.uniforms.color_on.value.copy(this.circuit_mesh.material.uniforms.color_off.value);
            this.block_mesh.material.opacity = Math.max(0, this.block_mesh.opacity - (elapsedTime - Math.min(elapsedTime, this.deadTime + 1.0))/2.0);
            this.circuit_mesh.material.uniforms.color_off.value.setW(Math.max(0, 1 - (elapsedTime - Math.min(elapsedTime, this.deadTime + 1.0))/2.0));
        }
    }
    return block_class;
});
