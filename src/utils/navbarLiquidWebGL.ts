const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const simulationShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_previous;
uniform vec2 u_texel;
uniform vec2 u_impulse;
uniform float u_impulseStrength;
uniform float u_aspect;
uniform float u_time;
uniform float u_motion;
uniform float u_energy;
uniform vec2 u_velocity;
varying vec2 v_uv;

float heightAt(vec2 textureUv) {
    return texture2D(u_previous, clamp(textureUv, 0.0, 1.0)).r * 2.0 - 1.0;
}

void main() {
    vec4 previousState = texture2D(u_previous, v_uv);
    float height = previousState.r * 2.0 - 1.0;
    float velocity = previousState.g * 2.0 - 1.0;
    float leftHeight = heightAt(v_uv - vec2(u_texel.x, 0.0));
    float rightHeight = heightAt(v_uv + vec2(u_texel.x, 0.0));
    float lowerHeight = heightAt(v_uv - vec2(0.0, u_texel.y));
    float upperHeight = heightAt(v_uv + vec2(0.0, u_texel.y));
    float laplacian = (leftHeight + rightHeight + lowerHeight + upperHeight - 4.0 * height) * 0.42;
    velocity = (velocity + laplacian) * 0.994;
    height = (height + velocity) * 0.998;

    vec2 impulseDelta = (v_uv - u_impulse) * vec2(u_aspect, 1.0);
    float impulse = exp(-dot(impulseDelta, impulseDelta) * 24.0) * u_impulseStrength;
    float directedImpulse = dot(normalize(impulseDelta + vec2(0.0001)), normalize(u_velocity + vec2(0.0001)));
    velocity += impulse * (0.30 + 0.16 * directedImpulse);
    height += impulse * 0.12;

    float slowWave = sin(u_time * 0.92 + v_uv.x * 8.0) * 0.52 + sin(u_time * 0.48 - v_uv.x * 17.0) * 0.28;
    float travelingWave = sin(u_time * 1.55 + v_uv.x * 24.0 - v_uv.y * 5.0);
    float ambient = (slowWave * 0.016 + travelingWave * 0.007) * u_motion;
    velocity += ambient * (0.55 + 0.45 * u_energy);

    float horizontalEdge = smoothstep(0.0, 0.05, v_uv.x) * (1.0 - smoothstep(0.95, 1.0, v_uv.x));
    float verticalEdge = smoothstep(0.0, 0.08, v_uv.y) * (1.0 - smoothstep(0.92, 1.0, v_uv.y));
    float edgeDamping = horizontalEdge * verticalEdge;
    velocity *= mix(0.94, 1.0, edgeDamping);
    height *= mix(0.985, 1.0, edgeDamping);

    height = clamp(height, -0.92, 0.92);
    velocity = clamp(velocity, -0.92, 0.92);
    gl_FragColor = vec4(height * 0.5 + 0.5, velocity * 0.5 + 0.5, 0.0, 1.0);
}
`;

const renderShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_height;
uniform vec2 u_resolution;
uniform vec2 u_texel;
uniform vec2 u_pointer;
uniform vec2 u_nodeCenter;
uniform vec2 u_nodeSize;
uniform float u_radius;
uniform float u_aspect;
uniform float u_time;
uniform float u_energy;
uniform float u_nodeStrength;
uniform float u_motion;
varying vec2 v_uv;

float roundedBoxDistance(vec2 point, vec2 halfSize, float radius) {
    vec2 distanceToBox = abs(point) - halfSize + radius;
    return length(max(distanceToBox, 0.0)) + min(max(distanceToBox.x, distanceToBox.y), 0.0) - radius;
}

float hashNoise(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

float smoothNoise(vec2 value) {
    vec2 integerPart = floor(value);
    vec2 fractionalPart = fract(value);
    fractionalPart = fractionalPart * fractionalPart * (3.0 - 2.0 * fractionalPart);
    float lowerLeft = hashNoise(integerPart);
    float lowerRight = hashNoise(integerPart + vec2(1.0, 0.0));
    float upperLeft = hashNoise(integerPart + vec2(0.0, 1.0));
    float upperRight = hashNoise(integerPart + vec2(1.0, 1.0));
    return mix(mix(lowerLeft, lowerRight, fractionalPart.x), mix(upperLeft, upperRight, fractionalPart.x), fractionalPart.y);
}

float heightAt(vec2 textureUv) {
    return texture2D(u_height, clamp(textureUv, 0.0, 1.0)).r * 2.0 - 1.0;
}

void main() {
    vec2 pixelPosition = (v_uv - 0.5) * u_resolution;
    float edgeDistance = roundedBoxDistance(pixelPosition, u_resolution * 0.5 - vec2(1.0), u_radius);
    float capsuleMask = 1.0 - smoothstep(-1.0, 1.5, edgeDistance);
    if (capsuleMask <= 0.001) discard;

    float centerHeight = heightAt(v_uv);
    float leftHeight = heightAt(v_uv - vec2(u_texel.x, 0.0));
    float rightHeight = heightAt(v_uv + vec2(u_texel.x, 0.0));
    float lowerHeight = heightAt(v_uv - vec2(0.0, u_texel.y));
    float upperHeight = heightAt(v_uv + vec2(0.0, u_texel.y));
    vec2 heightGradient = vec2(rightHeight - leftHeight, upperHeight - lowerHeight) * 7.0;
    vec3 waterNormal = normalize(vec3(heightGradient, 0.82));
    vec2 refractedUv = clamp(v_uv + waterNormal.xy * 0.055 + vec2(centerHeight * 0.014, 0.0), 0.0, 1.0);

    float environmentNoise = smoothNoise(refractedUv * vec2(9.0, 3.0) + vec2(u_time * 0.025, 0.0));
    vec3 upperWater = mix(vec3(0.020, 0.050, 0.100), vec3(0.090, 0.175, 0.290), refractedUv.y) + environmentNoise * 0.020;
    vec3 lowerWater = mix(vec3(0.010, 0.080, 0.160), vec3(0.095, 0.300, 0.460), refractedUv.y) + environmentNoise * 0.035;

    float distanceFromTop = 1.0 - v_uv.y;
    float slowSurfaceWave = sin(u_time * 0.72 * u_motion + refractedUv.x * 9.0) * 0.034;
    float fastSurfaceWave = sin(u_time * 1.30 * u_motion + refractedUv.x * 27.0 - refractedUv.y * 6.0) * 0.014;
    float waterSurface = 0.43 + slowSurfaceWave + fastSurfaceWave + centerHeight * 0.12;
    float waterBody = smoothstep(waterSurface - 0.020, waterSurface + 0.052, distanceFromTop);
    float surfaceDelta = (distanceFromTop - waterSurface) * 74.0;
    float surfaceLine = exp(-surfaceDelta * surfaceDelta) * 1.18;

    vec3 color = mix(upperWater, lowerWater, waterBody);
    float curvature = abs(leftHeight + rightHeight + lowerHeight + upperHeight - 4.0 * centerHeight);
    float caustic = pow(clamp(curvature * 12.0, 0.0, 1.0), 1.15) * (0.42 + 0.58 * waterBody);
    float causticBand = sin((refractedUv.x + waterNormal.x * 1.1) * 48.0 + u_time * 0.92 * u_motion + sin(refractedUv.y * 18.0 + u_time * 0.40 * u_motion) * 1.8);
    causticBand = pow(max(causticBand, 0.0), 11.0) * waterBody;
    color += vec3(0.62, 0.86, 1.0) * (caustic * 0.46 + causticBand * 0.34);
    color += vec3(0.90, 0.97, 1.0) * surfaceLine * 0.52;

    vec3 lightDirection = normalize(vec3(-0.38, 0.55, 0.74));
    float specular = pow(max(dot(waterNormal, lightDirection), 0.0), 22.0) * (0.30 + 0.55 * waterBody);
    float fresnel = pow(1.0 - max(waterNormal.z, 0.0), 1.6) * 0.46;
    vec2 pointerDelta = (v_uv - u_pointer) * vec2(u_aspect, 1.0);
    float pointerGlow = exp(-dot(pointerDelta, pointerDelta) * 24.0) * (0.10 + 0.35 * u_energy);
    vec2 nodeDelta = (v_uv - u_nodeCenter) / max(u_nodeSize, vec2(0.035, 0.20));
    float nodeGlow = exp(-dot(nodeDelta, nodeDelta) * 1.7) * u_nodeStrength;

    color += vec3(0.72, 0.86, 1.0) * (specular + fresnel + pointerGlow);
    color += vec3(0.92, 0.72, 0.48) * nodeGlow * 0.18;

    float topHighlight = 1.0 - smoothstep(0.0, 8.0, distanceFromTop * u_resolution.y);
    float innerRim = 1.0 - smoothstep(0.0, 22.0, abs(edgeDistance));
    color += vec3(0.90, 0.96, 1.0) * topHighlight * 0.28;
    color += vec3(0.62, 0.79, 1.0) * innerRim * 0.22;

    float alpha = clamp(0.48 + waterBody * 0.20 + u_energy * 0.10 + u_nodeStrength * 0.08 + innerRim * 0.12, 0.0, 0.92);
    gl_FragColor = vec4(color, alpha * capsuleMask);
}
`;

type UniformMap = Record<string, WebGLUniformLocation | null>;

type RenderTarget = {
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
};

const nodeSelector = ".nav-link-item, .flowli-brand, #navbar-buttons button:not(.float-panel *)";

export function initNavbarLiquidWebGL(): () => void {
    const navbar = document.getElementById("navbar");
    const capsule = document.querySelector<HTMLElement>("#navbar > div:last-child");
    const canvas = document.getElementById("navbar-liquid-canvas") as HTMLCanvasElement | null;
    if (!navbar || !capsule || !canvas) return () => {};

    const previousCleanup = (window as any).flowliNavbarWebGL as (() => void) | undefined;
    if (typeof previousCleanup === "function") previousCleanup();

    const webglContext = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
    }) as WebGLRenderingContext | null;

    if (!webglContext) {
        capsule.dataset.webgl = "unavailable";
        return () => {};
    }

    const gl = webglContext;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    const compileShader = (shaderType: number, source: string): WebGLShader | null => {
        const shader = gl.createShader(shaderType);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const createProgram = (fragmentSource: string): WebGLProgram | null => {
        const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        if (!vertexShader || !fragmentShader) return null;
        const program = gl.createProgram();
        if (!program) return null;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            return null;
        }
        return program;
    };

    const simulationProgram = createProgram(simulationShaderSource);
    const renderProgram = createProgram(renderShaderSource);
    const quadBuffer = gl.createBuffer();
    if (!simulationProgram || !renderProgram || !quadBuffer) {
        capsule.dataset.webgl = "unavailable";
        return () => {};
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const createUniformMap = (program: WebGLProgram, names: string[]): UniformMap => {
        const uniforms: UniformMap = {};
        for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);
        return uniforms;
    };

    const simulationUniforms = createUniformMap(simulationProgram, [
        "u_previous", "u_texel", "u_impulse", "u_impulseStrength", "u_velocity", "u_aspect", "u_time", "u_motion", "u_energy",
    ]);
    const renderUniforms = createUniformMap(renderProgram, [
        "u_height", "u_resolution", "u_texel", "u_pointer", "u_nodeCenter", "u_nodeSize", "u_radius",
        "u_aspect", "u_time", "u_energy", "u_nodeStrength", "u_motion",
    ]);

    const useProgramWithQuad = (program: WebGLProgram): void => {
        gl.useProgram(program);
        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    };

    let simulationWidth = 0;
    let simulationHeight = 0;
    let pixelRatio = 1;
    let borderRadius = 16;
    let readTarget: RenderTarget | null = null;
    let writeTarget: RenderTarget | null = null;
    let rendererReady = false;

    const deleteTarget = (target: RenderTarget | null): void => {
        if (!target) return;
        gl.deleteFramebuffer(target.framebuffer);
        gl.deleteTexture(target.texture);
    };

    const createTarget = (): RenderTarget | null => {
        const texture = gl.createTexture();
        const framebuffer = gl.createFramebuffer();
        if (!texture || !framebuffer) return null;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simulationWidth, simulationHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteFramebuffer(framebuffer);
            gl.deleteTexture(texture);
            return null;
        }

        gl.viewport(0, 0, simulationWidth, simulationHeight);
        gl.clearColor(0.5, 0.5, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { texture, framebuffer };
    };

    const resizeRenderer = (): void => {
        const bounds = capsule.getBoundingClientRect();
        if (bounds.width < 2 || bounds.height < 2) return;

        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
        canvas.width = Math.max(2, Math.round(bounds.width * pixelRatio));
        canvas.height = Math.max(2, Math.round(bounds.height * pixelRatio));
        simulationWidth = Math.max(160, Math.min(512, Math.round(bounds.width / 2.6)));
        simulationHeight = Math.max(32, Math.min(96, Math.round(bounds.height * 1.35)));
        borderRadius = (Number.parseFloat(window.getComputedStyle(capsule).borderTopLeftRadius) || 16) * pixelRatio;

        deleteTarget(readTarget);
        deleteTarget(writeTarget);
        readTarget = createTarget();
        writeTarget = createTarget();
        rendererReady = !!readTarget && !!writeTarget;
        capsule.dataset.webgl = rendererReady ? "ready" : "unavailable";
        canvas.dataset.renderer = rendererReady ? "webgl" : "unavailable";
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 0, 0, 0);
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { horizontal: 0.5, vertical: 0.5 };
    const impulse = { horizontal: 0.5, vertical: 0.5, strength: 0 };
    const pointerVelocity = { horizontal: 0, vertical: 0 };
    const node = { horizontal: 0.5, vertical: 0.5, width: 0.10, height: 0.55, strength: 0, targetStrength: 0 };
    let energy = 0;
    let targetEnergy = 0;

    const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

    const normalizedPointer = (event: PointerEvent): { horizontal: number; vertical: number } => {
        const bounds = capsule.getBoundingClientRect();
        return {
            horizontal: clamp01((event.clientX - bounds.left) / bounds.width),
            vertical: clamp01(1 - (event.clientY - bounds.top) / bounds.height),
        };
    };

    const updateNodeBounds = (nodeElement: HTMLElement): void => {
        const capsuleBounds = capsule.getBoundingClientRect();
        const nodeBounds = nodeElement.getBoundingClientRect();
        node.width = Math.max(0.035, nodeBounds.width / capsuleBounds.width);
        node.height = Math.max(0.20, nodeBounds.height / capsuleBounds.height);
    };

    const clearNodeState = (): void => {
        node.targetStrength = 0;
        capsule.classList.remove("has-liquid-node");
        navbar.querySelectorAll<HTMLElement>(".is-liquid-active").forEach((element) => {
            element.classList.remove("is-liquid-active");
        });
    };

    const onPointerMove = (event: PointerEvent): void => {
        if (event.pointerType === "touch") return;
        const position = normalizedPointer(event);
        pointerVelocity.horizontal = position.horizontal - pointer.horizontal;
        pointerVelocity.vertical = position.vertical - pointer.vertical;
        pointer.horizontal = position.horizontal;
        pointer.vertical = position.vertical;
        targetEnergy = 1;
        impulse.horizontal = position.horizontal;
        impulse.vertical = position.vertical;
        const pointerSpeed = Math.hypot(pointerVelocity.horizontal, pointerVelocity.vertical);
        impulse.strength = Math.max(impulse.strength, 0.12 + Math.min(pointerSpeed * 3.2, 0.48));

        const target = event.target as Element | null;
        const nodeElement = target?.closest(nodeSelector) as HTMLElement | null;
        navbar.querySelectorAll<HTMLElement>(".is-liquid-active").forEach((element) => {
            element.classList.remove("is-liquid-active");
        });
        if (nodeElement && capsule.contains(nodeElement)) {
            node.horizontal = position.horizontal;
            node.vertical = position.vertical;
            node.targetStrength = 1;
            updateNodeBounds(nodeElement);
            const nodeBounds = nodeElement.getBoundingClientRect();
            nodeElement.style.setProperty("--node-pointer-x", `${event.clientX - nodeBounds.left}px`);
            nodeElement.style.setProperty("--node-pointer-y", `${event.clientY - nodeBounds.top}px`);
            nodeElement.classList.add("is-liquid-active");
            capsule.classList.add("has-liquid-node");
        } else {
            node.targetStrength = 0;
            capsule.classList.remove("has-liquid-node");
        }
    };

    const onPointerOver = (event: PointerEvent): void => {
        if (event.pointerType === "touch") return;
        const target = event.target as Element | null;
        const nodeElement = target?.closest(nodeSelector) as HTMLElement | null;
        if (!nodeElement || !capsule.contains(nodeElement)) return;
        const position = normalizedPointer(event);
        pointerVelocity.horizontal = position.horizontal - pointer.horizontal;
        pointerVelocity.vertical = position.vertical - pointer.vertical;
        pointer.horizontal = position.horizontal;
        pointer.vertical = position.vertical;
        node.horizontal = position.horizontal;
        node.vertical = position.vertical;
        node.targetStrength = 1;
        updateNodeBounds(nodeElement);
        const nodeBounds = nodeElement.getBoundingClientRect();
        nodeElement.style.setProperty("--node-pointer-x", `${event.clientX - nodeBounds.left}px`);
        nodeElement.style.setProperty("--node-pointer-y", `${event.clientY - nodeBounds.top}px`);
        impulse.horizontal = position.horizontal;
        impulse.vertical = position.vertical;
        impulse.strength = Math.max(impulse.strength, 0.62);
        targetEnergy = 1;
        nodeElement.classList.add("is-liquid-active");
        capsule.classList.add("has-liquid-node");
    };

    const onPointerOut = (event: PointerEvent): void => {
        const target = event.target as Element | null;
        const nodeElement = target?.closest(nodeSelector) as HTMLElement | null;
        if (!nodeElement) return;
        const relatedTarget = event.relatedTarget as Node | null;
        if (!relatedTarget || !nodeElement.contains(relatedTarget)) {
            node.targetStrength = 0;
            nodeElement.classList.remove("is-liquid-active");
            capsule.classList.remove("has-liquid-node");
        }
    };

    const onPointerLeave = (): void => {
        targetEnergy = 0;
        clearNodeState();
    };

    const onContextLost = (event: Event): void => {
        event.preventDefault();
        rendererReady = false;
        capsule.dataset.webgl = "unavailable";
        cancelAnimationFrame(animationFrame);
    };

    navbar.addEventListener("pointermove", onPointerMove, { passive: true });
    navbar.addEventListener("pointerover", onPointerOver, { passive: true });
    navbar.addEventListener("pointerout", onPointerOut, { passive: true });
    navbar.addEventListener("pointerleave", onPointerLeave, { passive: true });
    canvas.addEventListener("webglcontextlost", onContextLost);
    window.addEventListener("resize", resizeRenderer);

    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(capsule);
    resizeRenderer();

    const startTime = performance.now();
    let animationFrame = 0;

    const renderFrame = (timestamp: number): void => {
        animationFrame = window.requestAnimationFrame(renderFrame);
        if (!rendererReady || !readTarget || !writeTarget || document.hidden) return;

        const elapsedSeconds = prefersReducedMotion ? 0 : (timestamp - startTime) / 1000;
        const simulationAspect = simulationWidth / simulationHeight;
        energy += (targetEnergy - energy) * 0.07;
        node.strength += (node.targetStrength - node.strength) * 0.12;

        gl.bindFramebuffer(gl.FRAMEBUFFER, writeTarget.framebuffer);
        gl.viewport(0, 0, simulationWidth, simulationHeight);
        useProgramWithQuad(simulationProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTarget.texture);
        gl.uniform1i(simulationUniforms.u_previous, 0);
        gl.uniform2f(simulationUniforms.u_texel, 1 / simulationWidth, 1 / simulationHeight);
        gl.uniform2f(simulationUniforms.u_impulse, impulse.horizontal, impulse.vertical);
        gl.uniform1f(simulationUniforms.u_impulseStrength, impulse.strength);
        gl.uniform2f(simulationUniforms.u_velocity, pointerVelocity.horizontal, pointerVelocity.vertical);
        gl.uniform1f(simulationUniforms.u_aspect, simulationAspect);
        gl.uniform1f(simulationUniforms.u_time, elapsedSeconds);
        gl.uniform1f(simulationUniforms.u_motion, prefersReducedMotion ? 0 : 1);
        gl.uniform1f(simulationUniforms.u_energy, energy);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        pointerVelocity.horizontal *= 0.72;
        pointerVelocity.vertical *= 0.72;

        const previousTarget = readTarget;
        readTarget = writeTarget;
        writeTarget = previousTarget;
        impulse.strength *= 0.92;
        if (impulse.strength < 0.001) impulse.strength = 0;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        useProgramWithQuad(renderProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTarget.texture);
        gl.uniform1i(renderUniforms.u_height, 0);
        gl.uniform2f(renderUniforms.u_resolution, canvas.width, canvas.height);
        gl.uniform2f(renderUniforms.u_texel, 1 / simulationWidth, 1 / simulationHeight);
        gl.uniform2f(renderUniforms.u_pointer, pointer.horizontal, pointer.vertical);
        gl.uniform2f(renderUniforms.u_nodeCenter, node.horizontal, node.vertical);
        gl.uniform2f(renderUniforms.u_nodeSize, node.width, node.height);
        gl.uniform1f(renderUniforms.u_radius, borderRadius);
        gl.uniform1f(renderUniforms.u_aspect, canvas.width / canvas.height);
        gl.uniform1f(renderUniforms.u_time, elapsedSeconds);
        gl.uniform1f(renderUniforms.u_energy, energy);
        gl.uniform1f(renderUniforms.u_nodeStrength, node.strength);
        gl.uniform1f(renderUniforms.u_motion, prefersReducedMotion ? 0 : 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    animationFrame = window.requestAnimationFrame(renderFrame);

    const cleanup = (): void => {
        window.cancelAnimationFrame(animationFrame);
        navbar.removeEventListener("pointermove", onPointerMove);
        navbar.removeEventListener("pointerover", onPointerOver);
        navbar.removeEventListener("pointerout", onPointerOut);
        navbar.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        window.removeEventListener("resize", resizeRenderer);
        resizeObserver.disconnect();
        deleteTarget(readTarget);
        deleteTarget(writeTarget);
        gl.deleteBuffer(quadBuffer);
        gl.deleteProgram(simulationProgram);
        gl.deleteProgram(renderProgram);
        clearNodeState();
    };

    (window as any).flowliNavbarWebGL = cleanup;
    return cleanup;
}
