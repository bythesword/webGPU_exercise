import cs3 from '../wgsl/cs3.wgsl?raw';
let ccc = document.querySelector("canvas");
if (!ccc) {
    throw new Error("没有发现canvas");
}

const ctx = ccc.getContext("2d");

function fatal(msg: string | undefined) {
    document.body.innerHTML = `<pre>${msg}</pre>`;
    throw Error(msg);
}

if (!("gpu" in navigator)) fatal("WebGPU not supported. Please enable it in about:flags in Chrome or in about:config in Firefox.");

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) fatal("Couldn’t request WebGPU adapter.");

const device = await adapter.requestDevice();
if (!device) fatal("Couldn’t request WebGPU device.");

const module = device.createShaderModule({
    code: cs3,
});

const bindGroupLayout = device.createBindGroupLayout({
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
                type: "read-only-storage",
            },
        },
        {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
                type: "storage",
            },
        },
    ],
});

const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
        module,
        entryPoint: "main",
    },
});

const NUM_BALLS = 100;
const BUFFER_SIZE = NUM_BALLS * 6 * Float32Array.BYTES_PER_ELEMENT;

const output = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});

const stagingBuffer = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

const input = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
        {
            binding: 0,
            resource: {
                buffer: input,
            },
        },
        {
            binding: 1,
            resource: {
                buffer: output,
            },
        },
    ],
});

function raf() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

let inputBalls = new Float32Array(new ArrayBuffer(BUFFER_SIZE));//初始化 input数组，arrayBuffer
for (let i = 0; i < NUM_BALLS; i++) {
    inputBalls[i * 6 + 0] = random(2, 10);
    inputBalls[i * 6 + 1] = 0; // Padding
    inputBalls[i * 6 + 2] = random(0, ctx.canvas.width);
    inputBalls[i * 6 + 3] = random(0, ctx.canvas.height);
    inputBalls[i * 6 + 4] = random(-100, 100);
    inputBalls[i * 6 + 5] = random(-100, 100);
}
let outputBalls;

while (true) {
    performance.mark("webgpu start");
    device.queue.writeBuffer(input, 0, inputBalls);//写inputbuffer

    const commandEncoder = device.createCommandEncoder();//开始编码
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    const dispatchSize = Math.ceil(NUM_BALLS / 64);
    passEncoder.dispatchWorkgroups(dispatchSize);
    passEncoder.end();
    commandEncoder.copyBufferToBuffer(output, 0, stagingBuffer, 0, BUFFER_SIZE);//复制内存慢速内存
    const commands = commandEncoder.finish();
    device.queue.submit([commands]);

    await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);
    const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
    const data = copyArrayBuffer.slice();//辅助到js内存
    outputBalls = new Float32Array(data);
    stagingBuffer.unmap();//释放慢速内存

    performance.mark("webgpu end");
    performance.measure("webgpu", "webgpu start", "webgpu end");

    drawScene(outputBalls);//画气球
    inputBalls = outputBalls;//更新 input
    await raf();
}

function drawScene(balls) {
    ctx.save();
    ctx.scale(1, -1);
    ctx.translate(0, -ctx.canvas.height);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "red";
    for (let i = 0; i < balls.length; i += 6) {
        const r = balls[i + 0];
        const px = balls[i + 2];
        const py = balls[i + 3];
        const vx = balls[i + 4];
        const vy = balls[i + 5];
        let angle = Math.atan(vy / (vx === 0 ? Number.EPSILON : vx));
        // Correct for Math.atan() assuming the angle is [-PI/2;PI/2].
        if (vx < 0) angle += Math.PI;
        const ex = px + Math.cos(angle) * Math.sqrt(2) * r;
        const ey = py + Math.sin(angle) * Math.sqrt(2) * r;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 2 * Math.PI, true);
        ctx.moveTo(ex, ey);
        ctx.arc(px, py, r, angle - Math.PI / 4, angle + Math.PI / 4, true);
        ctx.lineTo(ex, ey);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function random(a, b) {
    return Math.random() * (b - a) + a;
}
export { };