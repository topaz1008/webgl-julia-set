'use strict';

// GL Stuff
var gl = null,
    canvas = null,
    glProgram = null,
    vertexPositionAttribute = null,
    vertexBuffer = null,
    indexBuffer = null;

// Uniform locations
var juliaConstantUniform = null,
    zoomUniform = null,
    offsetUniform = null,
    colorShiftUniform = null;

var PHASE_SHIFT = 1;

// Application data
var totalTime = 0,
    lastTime = Date.now(),
    viewWidth = 1000,
    viewHeight = 1000,
    zoom = 1.5,
    // juliaConstant = [0.020684506619481454, -0.6443928795012865],
    juliaConstant = [0.0, 0.0],
    offset = [0.0, 0.0],
    isPaused = false,
    colorShiftDirection = 1,
    colorShift = 0;

init();
render();

function init() {
    canvas = document.getElementById('main');

    canvas.width = viewWidth;
    canvas.height = viewHeight;

    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        return alert('WebGL is not supported on this browser.');
    }

    var shaders = compileShaders([
        'vs-copy-position',
        'fs-julia'
    ]);

    createProgram(shaders);

    // Get uniform locations
    juliaConstantUniform = gl.getUniformLocation(glProgram, 'u_JuliaConstant');
    zoomUniform = gl.getUniformLocation(glProgram, 'u_Zoom');
    offsetUniform = gl.getUniformLocation(glProgram, 'u_Offset');
    colorShiftUniform = gl.getUniformLocation(glProgram, 'u_ColorShift');

    // Create geometry
    createScreenQuad();

    // Get and enable vertex position attribute
    vertexPositionAttribute = gl.getAttribLocation(glProgram, 'a_VertexPosition');
    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set viewport and enable depth test
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
}

function render(/*time*/) {
    var deltaTime = (Date.now() - lastTime) / 1000;

    // Ping-pong colorShift between 0 and 1
    if (colorShift >= 1.0) {
        colorShiftDirection = -1;

    } else if (colorShift <= 0) {
        colorShiftDirection = 1;
    }

    // Animate colors and the julia constant
    if (!isPaused) {
        totalTime += deltaTime;
        colorShift += (deltaTime * colorShiftDirection) * 0.25;

        juliaConstant[0] = Math.cos(totalTime * 0.15 + PHASE_SHIFT) * 0.6;
        juliaConstant[1] = Math.sin(totalTime * 0.1 + PHASE_SHIFT) * 0.75;
    }

    // Set uniforms
    gl.uniform2fv(juliaConstantUniform, juliaConstant);
    gl.uniform1f(zoomUniform, zoom);
    gl.uniform2fv(offsetUniform, offset);
    gl.uniform1f(colorShiftUniform, colorShift);

    // Clear and draw
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);

    lastTime = Date.now();

    requestAnimationFrame(render);
}

function compileShaders(ids) {
    var element, i, result = {};

    function getShaderType(element) {
        return ((element.getAttribute('type') === 'x-shader/x-fragment') ?
            gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
    }

    function isValidContentType(element) {
        return element.getAttribute('type') === 'x-shader/x-fragment' ||
            element.getAttribute('type') === 'x-shader/x-vertex';
    }

    function createShader(source, type) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Could not compile shader: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    for (i = 0; i < ids.length; i++) {
        element = document.getElementById(ids[i]);
        if (!element || !isValidContentType(element)) {
            throw new Error('Element with id "' + ids[i]
                + '" could not be found or is not a valid shader content type.');
        }

        result[ids[i]] = createShader(element.innerText, getShaderType(element));
    }

    return result;
}

function createProgram(shaders) {
    var id;

    glProgram = gl.createProgram();

    // Attach all shaders
    // TODO: Shaders have no defined order of attachment
    for (id in shaders) {
        if (shaders.hasOwnProperty(id)) {
            gl.attachShader(glProgram, shaders[id]);
        }
    }

    gl.linkProgram(glProgram);

    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
        throw new Error('Could not link program: ' + gl.getProgramInfoLog(glProgram));
    }

    gl.useProgram(glProgram);
}

function createScreenQuad() {
    var positions = new Float32Array([
        0.0, 0.0, 0.0,   // Middle
        -1.0, -1.0, 0.0, // Bottom left
        1.0, -1.0, 0.0,  // Bottom right
        1.0, 1.0, 0.0,   // Upper right
        -1.0, 1.0, 0.0   // Upper left
    ]);

    // Draw 4 triangles to create the quad
    var indices = new Uint16Array([
        0, 1, 2, // Bottom
        0, 2, 3, // Right
        0, 3, 4, // Up
        0, 4, 1  // Left
    ]);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
}
