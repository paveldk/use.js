/* RequireJS Use Plugin v0.3.0
 * Copyright 2012, Tim Branyen (@tbranyen)
 * use.js may be freely distributed under the MIT license.
 */
(function(window) {

// Cache used to map configuration options between load and write.
var buildMap = {};
// Short-hand the toString method for later comparison
var toString = Object.prototype.toString;

function keysAndValues(obj) {
  var key;
  var keys = [];
  var values = [];

  for (key in obj) {
    if (!obj.hasOwnProperty(key)) { continue; }

    // Add keys and values to end of each respective array
    keys.push(key);
    values.push(obj[key]);
  }

  return [keys, values];
}

define({
  version: "0.3.0",

  // Invoked by the AMD builder, passed the path to resolve, the require
  // function, done callback, and the configuration options.
  load: function(name, req, load, config) {
    var i, buildModule;

    // Dojo provides access to the config object through the req function.
    if (!config) {
      config = req.rawConfig;
    }

    var module = config.use && config.use[name];
    var random = "use_" + Math.floor(Math.random()*10000)+10000;

    // No module to load so return early.
    if (!module) {
      return load();
    }

    // Attach to the build map for use in the write method below.
    buildModule = buildMap[name] = {
      identifiers: [],
      deps: [],
      attach: module.attach
    };

    // Create the identifiers and dependencies lists
    if (module.deps && module.deps.length) {
      for (i=0; i<module.deps.length; i++) {
        if (typeof module.deps[i] === "string") {
          buildModule.identifiers.push(random);
          buildModule.deps.push(module.deps[i]);

        } else {
          keyVals = keysAndValues(module.deps[i]);

          // Assign the identifiers and dependencies to the keys and values
          // respectively and make sure all keys are valid either by choice or
          // random.
          buildModule.identifiers.push(keyVals[0][0]);
          buildModule.deps.push(keyVals[1][0]);
        }
      }
    }

    // Read the current module configuration for any dependencies that are
    // required to run this particular non-AMD module.
    req(buildModule.deps, function() {
      var key, val;
      var globals = {};

      // Here we need to inject into the global scope 
      for (i=0; i<buildModule.identifiers.length; i++) {
        // Short-hand the key/vals
        key = buildModule.identifiers[i];
        val = arguments[i];

        // Save original copy
        globals[key] = window[key];

        // Map key to val on the window object
        window[key] = val;
      }
      
      // Require this module
      req([name], function() {
        var retVal;
        // Attach property
        var attach = module.attach;

        // If doing a build don't care about loading
        if (config.isBuild) {
          return load();
        }

        // Return the correct attached object
        if (typeof attach === "function") {
          retVal = load(attach.apply(window, arguments));
        }

        // Reset the global scope
        for (i=0; i<buildModule.identifiers.length; i++) {
          // Short-hand the key/vals
          key = buildModule.identifiers[i];

          window[key] = globals[key];
        }

        if (retVal) {
          return retVal;
        }

        // Use window for now (maybe this?)
        return load(window[attach]);
      });
    });
  },

  // Also invoked by the AMD builder, this writes out a compatible define
  // call that will work with loaders such as almond.js that cannot read
  // the configuration data.
  write: function(pluginName, moduleName, write) {
    var module = buildMap[moduleName];
    var deps = module.deps;
    var normalize = { attach: null, deps: "" };

    // Normalize the attach to window[name] or function() { }
    if (typeof attach === "function") {
      normalize.attach = "return " + module.attach.toString() + ";";
    } else {
      normalize.attach = "return window['" + module.attach + "'];";
    }

    // Normalize the dependencies to have proper string characters
    if (deps.length) {
      normalize.deps = "'" + deps.toString().split(",").join("','") + "'";
    }

    // Write out the actual definition
    write([
      "define('", pluginName, "!", moduleName, "', ",
        "[", normalize.deps, "],",

        "function() {",
          normalize.attach,
        "}",

      ");\n"
    ].join(""));
  }
});

})(this);
