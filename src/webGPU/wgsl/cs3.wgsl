
struct Ball {
      radius: f32,
      position: vec2<f32>,
      velocity: vec2<f32>,
    }

    @group(0) @binding(0)
    var<storage, read> input: array<Ball>;

    @group(0) @binding(1)
    var<storage, read_write> output: array<Ball>;

    const TIME_STEP: f32 = 0.016;

    @compute @workgroup_size(64)

    
fn main(
    @builtin(global_invocation_id)
      global_id: vec3<u32>,
) {
    let num_balls = arrayLength(&output);
    if global_id.x >= num_balls {
        return;
    }
    let src_ball = input[global_id.x];
    let dst_ball = &output[global_id.x];

    (*dst_ball) = src_ball;
    (*dst_ball).position = (*dst_ball).position + (*dst_ball).velocity * TIME_STEP;
}
  