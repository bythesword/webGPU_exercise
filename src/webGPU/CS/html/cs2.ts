import cs1 from '../wgsl/cs1.wgsl?raw';

function fatal(msg: string | undefined) {
    document.body.innerHTML = `<pre>${msg}</pre>`;
    throw Error(msg);
}

if (!("gpu" in navigator)) fatal("WebGPU not supported. Please enable it in about:flags in Chrome or in about:config in Firefox.");

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error("Couldn’t request WebGPU adapter.");

const device = await adapter.requestDevice();
if (!device) throw new Error("Couldn’t request WebGPU device.");


// cs 
const module = device.createShaderModule({
    code:  `
    struct Ball {
      radius: f32,
      position: vec2<f32>,
      velocity: vec2<f32>,
    }

    @group(0) @binding(1)
    var<storage, read_write> output: array<Ball>;

    @compute @workgroup_size(64)
    fn main(

      @builtin(global_invocation_id)
      global_id : vec3<u32>,

      @builtin(local_invocation_id)
      local_id : vec3<u32>,
    ) {
      let num_balls = arrayLength(&output);
      if(global_id.x >= num_balls) {
        return;
      }

      output[global_id.x].radius = 999.;
      output[global_id.x].position = vec2<f32>(global_id.xy);
      output[global_id.x].velocity = vec2<f32>(local_id.xy);
    }
  `,
});

//layout : vs,fs,cs
const bindGroupLayout = device.createBindGroupLayout({
    entries: [
        {
            binding: 0,//
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
                type: "storage",
            },
        },
    ],
});

//pipeline
const pipeline = device.createComputePipeline({
    layout:
    'auto',//auto index=0
    // device.createPipelineLayout({
    //     bindGroupLayouts: [bindGroupLayout],
    // }),
    compute: {
        module,//shader
        entryPoint: "main",
    },
});

//size 
const BUFFER_SIZE = 1000;

// 计算输出buffer
const output = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});

// 中间层buffer
const stagingBuffer = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
    // layout: bindGroupLayout,//定义为binding=1，也是0，不知道为什么，按理应该是group（1），但不是，都为1（  @group(0) @binding(1)），都为0 （
    layout:pipeline.getBindGroupLayout(0),//对应auto 0 ，0-0，0-1 都正确
    entries: [
        {
            binding: 1,
            resource: {
                buffer: output,
            },
        },
    ],
});

//command encoder
const commandEncoder = device.createCommandEncoder();//创建 CommandEncoder
const passEncoder = commandEncoder.beginComputePass();  //获取 passEncoder

passEncoder.setPipeline(pipeline);
passEncoder.setBindGroup(0, bindGroup);//绑定buffer output
passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64));//计算次数
passEncoder.end();

commandEncoder.copyBufferToBuffer(output, 0, stagingBuffer, 0, BUFFER_SIZE);//copy to 慢速memory
const commands = commandEncoder.finish();//完成
device.queue.submit([commands]);//提交

await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);//异步等待结果，
const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);//映射
const data = copyArrayBuffer.slice(0, BUFFER_SIZE);//复制
stagingBuffer.unmap();
console.log(new Float32Array(data));

export { };
