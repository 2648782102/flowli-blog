import * as THREE from "three";

const fullscreenVertexShader = `
varying vec2 v_uv;

void main() {
    v_uv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const waveSimulationShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_previous;
uniform vec2 u_texel;
uniform vec2 u_impulse;
uniform vec2 u_velocity;
uniform float u_impulseStrength;
uniform float u_aspect;
uniform float u_time;
uniform float u_motion;
varying vec2 v_uv;

float heightAt(vec2 textureUv) {
    return texture2D(u_previous, clamp(textureUv, vec2(0.0), vec2(1.0))).r * 2.0 - 1.0;
}

void main() {
    vec4 previousState = texture2D(u_previous, v_uv);
    float height = previousState.r * 2.0 - 1.0;
    float velocity = previousState.g * 2.0 - 1.0;
    float left = heightAt(v_uv - vec2(u_texel.x, 0.0));
    float right = heightAt(v_uv + vec2(u_texel.x, 0.0));
    float lower = heightAt(v_uv - vec2(0.0, u_texel.y));
    float upper = heightAt(v_uv + vec2(0.0, u_texel.y));
    float laplacian = (left + right + lower + upper - 4.0 * height) * 0.46;
    velocity = (velocity + laplacian) * 0.993;
    height = (height + velocity) * 0.997;

    vec2 impulseDelta = (v_uv - u_impulse) * vec2(u_aspect, 1.0);
    float impulseShape = exp(-dot(impulseDelta, impulseDelta) * 22.0) * u_impulseStrength;
    float direction = dot(normalize(impulseDelta + vec2(0.0001)), normalize(u_velocity + vec2(0.0001)));
    velocity += impulseShape * (0.30 + 0.20 * direction);
    height += impulseShape * 0.10;

    float ambient =
        sin(u_time * 0.86 + v_uv.x * 8.0) * 0.008 +
        sin(u_time * 1.46 - v_uv.x * 23.0 + v_uv.y * 4.0) * 0.005;
    velocity += ambient * u_motion;

    float edgeX = smoothstep(0.0, 0.04, v_uv.x) * (1.0 - smoothstep(0.96, 1.0, v_uv.x));
    float edgeY = smoothstep(0.0, 0.08, v_uv.y) * (1.0 - smoothstep(0.92, 1.0, v_uv.y));
    float edgeDamping = edgeX * edgeY;
    velocity *= mix(0.93, 1.0, edgeDamping);
    height *= mix(0.985, 1.0, edgeDamping);
    height = clamp(height, -0.92, 0.92);
    velocity = clamp(velocity, -0.92, 0.92);
    gl_FragColor = vec4(height * 0.5 + 0.5, velocity * 0.5 + 0.5, 0.0, 1.0);
}
`;

const waterVolumeFragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_height;
uniform vec2 u_pointer;
uniform vec2 u_nodeCenter;
uniform vec2 u_nodeSize;
uniform float u_time;
uniform float u_energy;
uniform float u_nodeStrength;
uniform float u_motion;
varying vec2 v_uv;
varying vec3 v_worldPosition;

float hashNoise(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

float smoothNoise(vec2 value) {
    vec2 integerPart = floor(value);
    vec2 fractionalPart = fract(value);
    fractionalPart = fractionalPart * fractionalPart * (3.0 - 2.0 * fractionalPart);
    return mix(
        mix(hashNoise(integerPart), hashNoise(integerPart + vec2(1.0, 0.0)), fractionalPart.x),
        mix(hashNoise(integerPart + vec2(0.0, 1.0)), hashNoise(integerPart + vec2(1.0, 1.0)), fractionalPart.x),
        fractionalPart.y
    );
}

void main() {
    float height = texture2D(u_height, v_uv).r * 2.0 - 1.0;
    vec2 refractedUv = clamp(v_uv + vec2(height * 0.026, height * 0.012), 0.0, 1.0);
    float depth = 1.0 - v_uv.y;
    float volumeNoise = smoothNoise(refractedUv * vec2(13.0, 4.0) + vec2(u_time * 0.025 * u_motion, 0.0));

    vec3 upperWater = mix(vec3(0.025, 0.080, 0.150), vec3(0.070, 0.180, 0.300), depth);
    vec3 lowerWater = mix(vec3(0.020, 0.130, 0.230), vec3(0.090, 0.320, 0.500), depth);
    vec3 color = mix(upperWater, lowerWater, 0.72) + volumeNoise * 0.042;

    float causticBand = sin((refractedUv.x + height * 0.8) * 52.0 + u_time * 0.9 * u_motion + sin(refractedUv.y * 17.0) * 1.6);
    causticBand = pow(max(causticBand, 0.0), 13.0);
    float depthGlow = smoothstep(0.05, 1.0, depth);
    color += vec3(0.58, 0.82, 1.0) * causticBand * (0.22 + 0.28 * depthGlow);

    vec2 pointerDelta = (v_uv - u_pointer) * vec2(3.0, 1.0);
    float pointerGlow = exp(-dot(pointerDelta, pointerDelta) * 18.0) * (0.06 + 0.20 * u_energy);
    vec2 nodeDelta = (v_uv - u_nodeCenter) / max(u_nodeSize, vec2(0.04, 0.20));
    float nodeGlow = exp(-dot(nodeDelta, nodeDelta) * 1.8) * u_nodeStrength;
    color += vec3(0.70, 0.88, 1.0) * pointerGlow;
    color += vec3(0.96, 0.74, 0.48) * nodeGlow * 0.14;

    float bottomReflection = (1.0 - smoothstep(0.66, 1.0, depth)) * 0.20;
    color += vec3(0.22, 0.48, 0.70) * bottomReflection;
    color += vec3(0.08, 0.18, 0.30) * pow(depth, 2.2);
    color *= 0.90 + 0.18 * v_uv.y;

    gl_FragColor = vec4(color, 0.78);
}
`;

const waterVolumeVertexShader = `
uniform sampler2D u_height;
uniform float u_time;
uniform float u_motion;
varying vec2 v_uv;
varying vec3 v_worldPosition;

void main() {
    v_uv = uv;
    vec3 displacedPosition = position;
    float height = texture2D(u_height, uv).r * 2.0 - 1.0;
    float frontWall = 1.0 - smoothstep(0.18, 0.85, uv.y);
    displacedPosition.z += height * 0.045 * frontWall;
    displacedPosition.y += sin(uv.x * 24.0 + u_time * 1.15 * u_motion) * 0.0018 * frontWall;
    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    v_worldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const waterSurfaceVertexShader = `
uniform sampler2D u_height;
uniform float u_time;
uniform float u_motion;
varying vec2 v_uv;
varying float v_height;

void main() {
    v_uv = uv;
    vec3 displacedPosition = position;
    float height = texture2D(u_height, uv).r * 2.0 - 1.0;
    float travelingWave =
        sin(uv.x * 13.0 + u_time * 1.05 * u_motion) * 0.012 +
        sin(uv.x * 31.0 - u_time * 1.65 * u_motion) * 0.005;
    displacedPosition.z += height * 0.085 + travelingWave;
    v_height = height + travelingWave * 4.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
`;

const waterSurfaceFragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_time;
uniform float u_energy;
uniform float u_motion;
varying vec2 v_uv;
varying float v_height;

void main() {
    float fresnel = pow(1.0 - clamp(abs(v_height) * 0.35 + 0.58, 0.0, 1.0), 2.0);
    float glint = pow(max(sin((v_uv.x + v_height * 0.35) * 48.0 + u_time * 0.8 * u_motion), 0.0), 26.0);
    vec3 color = mix(vec3(0.30, 0.60, 0.86), vec3(0.92, 0.98, 1.0), fresnel);
    color += vec3(0.85, 0.94, 1.0) * glint * (0.45 + 0.30 * u_energy);
    gl_FragColor = vec4(color, 0.62 + fresnel * 0.24 + glint * 0.18);
}
`;

const glassFragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_opacity;
uniform vec3 u_tint;
varying vec2 v_uv;

void main() {
    float edgeX = 1.0 - smoothstep(0.0, 0.035, min(v_uv.x, 1.0 - v_uv.x));
    float edgeY = 1.0 - smoothstep(0.0, 0.11, min(v_uv.y, 1.0 - v_uv.y));
    float rim = max(edgeX, edgeY);
    float topSheen = 1.0 - smoothstep(0.0, 0.12, v_uv.y);
    vec3 color = u_tint + vec3(0.20, 0.30, 0.40) * rim + vec3(0.18, 0.24, 0.30) * topSheen;
    gl_FragColor = vec4(color, u_opacity + rim * 0.14 + topSheen * 0.10);
}
`;

const nodeSelector = ".nav-link-item, .flowli-brand, #navbar-buttons button:not(.float-panel *)";

export function initNavbarLiquid3D(): () => void {
    const navbar = document.getElementById("navbar");
    const capsule = document.querySelector<HTMLElement>("#navbar > div:last-child");
    const canvas = document.getElementById("navbar-liquid-canvas") as HTMLCanvasElement | null;
    if (!navbar || !capsule || !canvas) return () => {};

    const previousCleanup = (window as any).flowliNavbarWebGL as (() => void) | undefined;
    if (typeof previousCleanup === "function") previousCleanup();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4.45, 4.45, 0.41, -0.41, 0.1, 20);
    camera.position.set(0, 0.02, 5.2);
    camera.lookAt(0, 0, 0);

    const tank = new THREE.Group();
    scene.add(tank);

    const waveSize = { width: 384, height: 72 };
    const targetOptions: THREE.RenderTargetOptions = {
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false,
        format: THREE.RGBAFormat,
    };
    let readTarget = new THREE.WebGLRenderTarget(waveSize.width, waveSize.height, targetOptions);
    let writeTarget = new THREE.WebGLRenderTarget(waveSize.width, waveSize.height, targetOptions);

    const simulationScene = new THREE.Scene();
    const simulationCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simulationUniforms = {
        u_previous: { value: readTarget.texture },
        u_texel: { value: new THREE.Vector2(1 / waveSize.width, 1 / waveSize.height) },
        u_impulse: { value: new THREE.Vector2(0.5, 0.5) },
        u_velocity: { value: new THREE.Vector2() },
        u_impulseStrength: { value: 0 },
        u_aspect: { value: waveSize.width / waveSize.height },
        u_time: { value: 0 },
        u_motion: { value: 1 },
    };
    const simulationMaterial = new THREE.ShaderMaterial({
        vertexShader: fullscreenVertexShader,
        fragmentShader: waveSimulationShader,
        uniforms: simulationUniforms,
        depthTest: false,
        depthWrite: false,
    });
    simulationScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simulationMaterial));

    const initializeTargets = (): void => {
        const previousRenderTarget = renderer.getRenderTarget();
        for (const target of [readTarget, writeTarget]) {
            renderer.setRenderTarget(target);
            renderer.setClearColor(0x808000, 1);
            renderer.clear(true, false, false);
        }
        renderer.setRenderTarget(previousRenderTarget);
        renderer.setClearColor(0x000000, 0);
    };
    initializeTargets();

    const volumeUniforms = {
        u_height: { value: readTarget.texture },
        u_pointer: { value: new THREE.Vector2(0.5, 0.5) },
        u_nodeCenter: { value: new THREE.Vector2(0.5, 0.5) },
        u_nodeSize: { value: new THREE.Vector2(0.12, 0.55) },
        u_time: { value: 0 },
        u_energy: { value: 0 },
        u_nodeStrength: { value: 0 },
        u_motion: { value: 1 },
    };
    const volumeMaterial = new THREE.ShaderMaterial({
        vertexShader: waterVolumeVertexShader,
        fragmentShader: waterVolumeFragmentShader,
        uniforms: volumeUniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const surfaceUniforms = {
        u_height: { value: readTarget.texture },
        u_time: { value: 0 },
        u_motion: { value: 1 },
        u_energy: { value: 0 },
    };
    const surfaceMaterial = new THREE.ShaderMaterial({
        vertexShader: waterSurfaceVertexShader,
        fragmentShader: waterSurfaceFragmentShader,
        uniforms: surfaceUniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const glassUniforms = {
        u_opacity: { value: 0.10 },
        u_tint: { value: new THREE.Color(0x9ec9ff) },
    };
    const glassMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 v_uv;
            void main() {
                v_uv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: glassFragmentShader,
        uniforms: glassUniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const backGlassMaterial = glassMaterial.clone();
    backGlassMaterial.uniforms = THREE.UniformsUtils.clone(glassMaterial.uniforms);
    backGlassMaterial.uniforms.u_opacity.value = 0.05;
    backGlassMaterial.uniforms.u_tint.value = new THREE.Color(0x244b83);

    const frontGlassMaterial = glassMaterial.clone();
    frontGlassMaterial.uniforms = THREE.UniformsUtils.clone(glassMaterial.uniforms);
    frontGlassMaterial.uniforms.u_opacity.value = 0.07;

    const edgeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xcfe8ff,
        metalness: 0.02,
        roughness: 0.14,
        transmission: 0.42,
        thickness: 0.6,
        transparent: true,
        opacity: 0.42,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
    });

    const waterGeometry = new THREE.PlaneGeometry(8.9, 0.82, 96, 10);
    const volumeMesh = new THREE.Mesh(waterGeometry, volumeMaterial);
    volumeMesh.position.z = -0.08;
    tank.add(volumeMesh);

    const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(8.9, 0.82), backGlassMaterial);
    backGlass.position.z = -0.18;
    tank.add(backGlass);

    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(8.9, 0.82), frontGlassMaterial);
    frontGlass.position.z = 0.18;
    tank.add(frontGlass);

    const surfaceGeometry = new THREE.PlaneGeometry(8.9, 0.42, 128, 3);
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surfaceMesh.rotation.x = -Math.PI * 0.36;
    surfaceMesh.position.set(0, 0.18, 0.04);
    tank.add(surfaceMesh);

    const bottomWaterPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(8.9, 0.52, 96, 2),
        new THREE.MeshBasicMaterial({
            color: 0x0b2f52,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
        }),
    );
    bottomWaterPlane.rotation.x = -Math.PI * 0.34;
    bottomWaterPlane.position.set(0, -0.32, -0.02);
    tank.add(bottomWaterPlane);

    const bottomStrip = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.050, 0.52), edgeMaterial);
    bottomStrip.position.set(0, -0.42, 0);
    tank.add(bottomStrip);

    const topRim = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.022, 0.46), edgeMaterial);
    topRim.position.set(0, 0.42, 0);
    tank.add(topRim);

    const leftRim = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.84, 0.46), edgeMaterial);
    leftRim.position.set(-4.46, 0, 0);
    tank.add(leftRim);

    const rightRim = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.84, 0.46), edgeMaterial);
    rightRim.position.set(4.46, 0, 0);
    tank.add(rightRim);

    const light = new THREE.DirectionalLight(0xd8ecff, 1.4);
    light.position.set(-2, 3, 4);
    scene.add(light);
    const rimLight = new THREE.PointLight(0x9ec9ff, 2.2, 12);
    rimLight.position.set(3, 1, 2.5);
    scene.add(rimLight);

    let viewportWidth = 1;
    let viewportHeight = 1;
    let pixelRatio = 1;
    let sceneWidth = 8.9;
    let sceneHeight = 0.82;

    const resizeRenderer = (): void => {
        const bounds = capsule.getBoundingClientRect();
        if (bounds.width < 2 || bounds.height < 2) return;
        viewportWidth = bounds.width;
        viewportHeight = bounds.height;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(viewportWidth, viewportHeight, false);
        const halfHeight = 0.41;
        const halfWidth = halfHeight * (viewportWidth / viewportHeight);
        camera.left = -halfWidth;
        camera.right = halfWidth;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();

        sceneHeight = halfHeight * 2;
        sceneWidth = halfWidth * 2;
        const scaleX = sceneWidth / 8.9;
        const scaleY = sceneHeight / 0.82;
        tank.scale.set(scaleX, scaleY, 1);
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { horizontal: 0.5, vertical: 0.5 };
    const impulse = { horizontal: 0.5, vertical: 0.5, strength: 0 };
    const pointerVelocity = { horizontal: 0, vertical: 0 };
    const node = { horizontal: 0.5, vertical: 0.5, width: 0.10, height: 0.55, strength: 0, targetStrength: 0 };
    let energy = 0;
    let targetEnergy = 0;
    let rendererReady = true;

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
        const speed = Math.hypot(pointerVelocity.horizontal, pointerVelocity.vertical);
        impulse.strength = Math.max(impulse.strength, 0.16 + Math.min(speed * 4.0, 0.68));

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
        impulse.strength = Math.max(impulse.strength, 0.78);
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
        if (!rendererReady || document.hidden) return;

        const elapsedSeconds = prefersReducedMotion ? 0 : (timestamp - startTime) / 1000;
        energy += (targetEnergy - energy) * 0.07;
        node.strength += (node.targetStrength - node.strength) * 0.12;

        simulationUniforms.u_previous.value = readTarget.texture;
        simulationUniforms.u_impulse.value.set(impulse.horizontal, impulse.vertical);
        simulationUniforms.u_velocity.value.set(pointerVelocity.horizontal, pointerVelocity.vertical);
        simulationUniforms.u_impulseStrength.value = impulse.strength;
        simulationUniforms.u_time.value = elapsedSeconds;
        simulationUniforms.u_motion.value = prefersReducedMotion ? 0 : 1;
        renderer.setRenderTarget(writeTarget);
        renderer.render(simulationScene, simulationCamera);
        renderer.setRenderTarget(null);

        const previousTarget = readTarget;
        readTarget = writeTarget;
        writeTarget = previousTarget;
        pointerVelocity.horizontal *= 0.72;
        pointerVelocity.vertical *= 0.72;
        impulse.strength *= 0.91;
        if (impulse.strength < 0.001) impulse.strength = 0;

        volumeUniforms.u_height.value = readTarget.texture;
        volumeUniforms.u_pointer.value.set(pointer.horizontal, pointer.vertical);
        volumeUniforms.u_nodeCenter.value.set(node.horizontal, node.vertical);
        volumeUniforms.u_nodeSize.value.set(node.width, node.height);
        volumeUniforms.u_time.value = elapsedSeconds;
        volumeUniforms.u_energy.value = energy;
        volumeUniforms.u_nodeStrength.value = node.strength;
        volumeUniforms.u_motion.value = prefersReducedMotion ? 0 : 1;
        surfaceUniforms.u_height.value = readTarget.texture;
        surfaceUniforms.u_time.value = elapsedSeconds;
        surfaceUniforms.u_motion.value = prefersReducedMotion ? 0 : 1;
        surfaceUniforms.u_energy.value = energy;

        const pointerX = (pointer.horizontal - 0.5) * sceneWidth * 0.025;
        const pointerY = (pointer.vertical - 0.5) * sceneHeight * 0.012;
        camera.position.x += (pointerX - camera.position.x) * 0.045;
        camera.position.y += (0.02 + pointerY - camera.position.y) * 0.045;
        camera.lookAt(pointerX * 0.35, 0, 0);

        renderer.clear();
        renderer.render(scene, camera);
    };

    animationFrame = window.requestAnimationFrame(renderFrame);
    capsule.dataset.webgl = "ready";
    canvas.dataset.renderer = "three-webgl";

    const cleanup = (): void => {
        window.cancelAnimationFrame(animationFrame);
        navbar.removeEventListener("pointermove", onPointerMove);
        navbar.removeEventListener("pointerover", onPointerOver);
        navbar.removeEventListener("pointerout", onPointerOut);
        navbar.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        window.removeEventListener("resize", resizeRenderer);
        resizeObserver.disconnect();
        clearNodeState();
        waterGeometry.dispose();
        surfaceGeometry.dispose();
        bottomWaterPlane.geometry.dispose();
        (bottomWaterPlane.material as THREE.Material).dispose();
        volumeMaterial.dispose();
        surfaceMaterial.dispose();
        simulationMaterial.dispose();
        glassMaterial.dispose();
        frontGlassMaterial.dispose();
        backGlassMaterial.dispose();
        edgeMaterial.dispose();
        readTarget.dispose();
        writeTarget.dispose();
        renderer.dispose();
    };

    (window as any).flowliNavbarWebGL = cleanup;
    return cleanup;
}
