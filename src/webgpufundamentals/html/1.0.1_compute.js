import codeCS from "../wgsl/1.1.compute.wgsl?raw"
async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  //生成shader的模块资源，
  const module = device.createShaderModule({
    label: 'doubling compute module',
    code: codeCS,
    // code: `
    //   @group(0) @binding(0) var<storage, read_write> data: array<f32>;

    //   @compute @workgroup_size(1) fn computeSomething(
    //     @builtin(global_invocation_id) id: vec3<u32>
    //   ) {
    //     let i = id.x;
    //     data[i] = data[i] * 2.0;
    //   }
    // `,
  });

    //产生管线资源，目前未使用
  const pipeline = device.createComputePipeline({
    label: 'doubling compute pipeline',
    layout: 'auto',
    compute: {
      module,//绑定shader资源到管线
      entryPoint: 'computeSomething',
    },
  });

  //js 内存中的原始数组
  const input = new Float32Array([1, 3, 5]);

  
  // 工作用的buffer，读写，存储属性
  const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  
  //拷贝数组到GPU的工作buffer
  device.queue.writeBuffer(workBuffer, 0, input);
 
  //结果保存的map buffer
  const resultBuffer = device.createBuffer({
    label: 'result buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

 
  //绑定资源，工作缓冲区到 group
  //这个是保存到GPU的内存中，目前未使用状态
  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: workBuffer } },
    ],
  });

  // 编写GPU的执行序列
  const encoder = device.createCommandEncoder({
    label: 'doubling encoder',
  });

  //computer的序列
  const pass = encoder.beginComputePass({
    label: 'doubling compute pass',
  });
  pass.setPipeline(pipeline);//绑定管线
  pass.setBindGroup(0, bindGroup);//绑定buffer，使用
  pass.dispatchWorkgroups(input.length);//buffer长度
  pass.end();

  // copy GPU的工作buffer内容到map buffer
  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

  // Finish encoding and submit the commands
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  // Read the results
  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(resultBuffer.getMappedRange().slice());
  resultBuffer.unmap();

  console.log('input', input);
  console.log('result', result);
}

function fail(msg) {
  // eslint-disable-next-line no-alert
  alert(msg);
}

main();
