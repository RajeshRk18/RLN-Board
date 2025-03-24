"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/get-port@3.2.0";
exports.ids = ["vendor-chunks/get-port@3.2.0"];
exports.modules = {

/***/ "(ssr)/./node_modules/.pnpm/get-port@3.2.0/node_modules/get-port/index.js":
/*!**************************************************************************!*\
  !*** ./node_modules/.pnpm/get-port@3.2.0/node_modules/get-port/index.js ***!
  \**************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nconst net = __webpack_require__(/*! net */ \"net\");\n\nconst getPort = options => new Promise((resolve, reject) => {\n\t// For backwards compatibility with number-only input\n\t// TODO: Remove this in the next major version\n\tif (typeof options === 'number') {\n\t\toptions = {\n\t\t\tport: options\n\t\t};\n\t}\n\n\tconst server = net.createServer();\n\n\tserver.unref();\n\tserver.on('error', reject);\n\n\tserver.listen(options, () => {\n\t\tconst port = server.address().port;\n\t\tserver.close(() => {\n\t\t\tresolve(port);\n\t\t});\n\t});\n});\n\nmodule.exports = options => options ?\n\tgetPort(options).catch(() => getPort(0)) :\n\tgetPort(0);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvLnBucG0vZ2V0LXBvcnRAMy4yLjAvbm9kZV9tb2R1bGVzL2dldC1wb3J0L2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFhO0FBQ2IsWUFBWSxtQkFBTyxDQUFDLGdCQUFLOztBQUV6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0gsRUFBRTtBQUNGLENBQUM7O0FBRUQ7QUFDQTtBQUNBIiwic291cmNlcyI6WyIvaG9tZS91c2VybmFtZS9hbGVvL3JhdGUtbGltaXRpbmctbnVsbGlmaWVyL3Jsbi1tZXNzYWdlLWJvYXJkL25vZGVfbW9kdWxlcy8ucG5wbS9nZXQtcG9ydEAzLjIuMC9ub2RlX21vZHVsZXMvZ2V0LXBvcnQvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuY29uc3QgbmV0ID0gcmVxdWlyZSgnbmV0Jyk7XG5cbmNvbnN0IGdldFBvcnQgPSBvcHRpb25zID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0Ly8gRm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggbnVtYmVyLW9ubHkgaW5wdXRcblx0Ly8gVE9ETzogUmVtb3ZlIHRoaXMgaW4gdGhlIG5leHQgbWFqb3IgdmVyc2lvblxuXHRpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdudW1iZXInKSB7XG5cdFx0b3B0aW9ucyA9IHtcblx0XHRcdHBvcnQ6IG9wdGlvbnNcblx0XHR9O1xuXHR9XG5cblx0Y29uc3Qgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigpO1xuXG5cdHNlcnZlci51bnJlZigpO1xuXHRzZXJ2ZXIub24oJ2Vycm9yJywgcmVqZWN0KTtcblxuXHRzZXJ2ZXIubGlzdGVuKG9wdGlvbnMsICgpID0+IHtcblx0XHRjb25zdCBwb3J0ID0gc2VydmVyLmFkZHJlc3MoKS5wb3J0O1xuXHRcdHNlcnZlci5jbG9zZSgoKSA9PiB7XG5cdFx0XHRyZXNvbHZlKHBvcnQpO1xuXHRcdH0pO1xuXHR9KTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG9wdGlvbnMgPT4gb3B0aW9ucyA/XG5cdGdldFBvcnQob3B0aW9ucykuY2F0Y2goKCkgPT4gZ2V0UG9ydCgwKSkgOlxuXHRnZXRQb3J0KDApO1xuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/.pnpm/get-port@3.2.0/node_modules/get-port/index.js\n");

/***/ })

};
;