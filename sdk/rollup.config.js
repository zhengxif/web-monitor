import babel from 'rollup-plugin-babel'

let isDev = process.env.NODE_ENV === 'develop';
let babelConfig = {
    "presets": [
      [
        "env", {
          "modules": false,
          "targets": {
            "browsers": ["chrome > 40", "safari >= 7"]
          }
        }
      ]
    ],
  };
  
export default {
    input: 'index.js',
    watch: {
        exclude: 'node_modules/**',
    },
    output: {
        file: isDev ? '../website/client/js/web-monitor/bundle.umd.js' : '../dist/bundle.umd.js',
        name: 'WebMonitor',
        format: 'umd',
        sourceMap: true
    },
    plugin: [
        babel({
            babelrc: false,
            presets: babelConfig.presets,
            plugins: babelConfig.plugins,
            exclude: 'node_modules/**' // only transpile our source code
        })
    ]
}