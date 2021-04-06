/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: {url: '/dist'},
  },
  plugins: [
    '@snowpack/plugin-postcss',
  ],
  optimize: {},
  packageOptions: {},
  devOptions: {
    open: 'none',
  },
  buildOptions: {
    jsxInject: 'import React from \'react\'',
  },
}
