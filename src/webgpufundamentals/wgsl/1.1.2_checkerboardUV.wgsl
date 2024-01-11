      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> OurVertexShaderOutput {
        let pos = array(
          vec2f( 0.5,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
let uv = array(
          vec2f( 1.0,  1.0),  // top center
          vec2f(0.0, 0.),  // bottom left
          vec2f( 1., 0.)   // bottom right
        );
        var vsOutput: OurVertexShaderOutput;
        vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
        vsOutput.uv = uv[vertexIndex];
     
        return vsOutput;
      }

      @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
        let red = vec4f(0, 0, 1, 1);
        let cyan = vec4f(1, 1, 1, 1);

        let grid = (fsInput.uv.xy) *10.0;
        // let checker_x = u32(grid.x  ) % 2.0 == 1;//竖条
        // let checker_y = u32(( grid.y) % 2.0 )== 1;//横条
        // var checker=true;
        // if(checker_x || checker_y){ //网格
        //   checker=false;
        // }

      let checker = ((u32(grid.x) + u32(grid.y)) % 2 )== 1;//棋盘

        // let checker = u32((grid.x  ) % 2.0 )== 1;//竖条
        // let checker = u32(( grid.y) % 2.0 )== 1;//横条
        // let checker = u32((grid.x + grid.y) % 2.0 )== 1;//横条
        // let checker = u32(sqrt(grid.x*grid.x + grid.y*grid.y) % 2.0 )== 1;//圆形

        return select(red, cyan, checker);
      }