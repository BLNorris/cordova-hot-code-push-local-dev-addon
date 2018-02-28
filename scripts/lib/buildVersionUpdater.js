/*
Helper class that will increase build version of the app on each build.
This way we will forse main plugin to install www folder from the assets.
Otherwise - it will use the cached version.
*/
var path = require('path');
var plist = require('simple-plist');
var fs = require('fs');
var xmlHelper = require('./xmlHelper.js');
var logger = require('./logger.js');
var ANDROID_PLATFORM = 'android';
var BUILD_CONFIG = '.build_config';

module.exports = {
  increaseBuildVersion: increaseBuildVersion
};

// region Public API

/**
 * Increase build version of the app.
 *
 * @param {Object} cordovaContext - cordova's context
 */
function increaseBuildVersion(cordovaContext) {
  var platforms = cordovaContext.opts.platforms,
    buildConfig = readBuildVersionsConfig(cordovaContext);

  // increase only for the platforms we are building for right now
  platforms.forEach(function(platform) {
    switch (platform) {

      case ANDROID_PLATFORM:
        {
          increaseBuildVersionForAndroid(cordovaContext, buildConfig);
          break;
        }
      default:
        {
          break;
        }
    }
  });

  saveBuildVersionsConfig(cordovaContext, buildConfig);
}

// endregion

// region Android update

/**
 * Increase value of the android:versionCode of the app.
 *
 * @param {Object} cordovaContext - cordova's context
 */
function increaseBuildVersionForAndroid(cordovaContext, buildConfig) {
  var androidManifestFilePath = path.join(cordovaContext.opts.projectRoot, 'platforms', ANDROID_PLATFORM, 'CordovaLib','AndroidManifest.xml'),
    manifestFileContent = xmlHelper.readXmlAsJson(androidManifestFilePath);

  if (!manifestFileContent) {
    logger.error('AndroidManifest.xml file is not found! Can\'t increase build version for android.');
    return;
  }

  var currentVersion = parseInt(manifestFileContent['manifest']['$']['android:versionCode']),
    newVersion = generateNewBuildVersion(currentVersion, buildConfig.android);

  manifestFileContent['manifest']['$']['android:versionCode'] = newVersion.toString();

  var isUpdated = xmlHelper.writeJsonAsXml(manifestFileContent, androidManifestFilePath);
  if (isUpdated) {
    logger.info('Android version code is set to ' + newVersion);
  }

  buildConfig.android = newVersion;
}

// endregion


/**
 * Generate new build version number of the app.
 *
 * @param {Integer} currentVersion - current version of the app
 * @param {Integer} lastVersion - last versions of the app
 * @return {Integer} new build version number
 */
function generateNewBuildVersion(currentVersion, lastVersion) {
  if (currentVersion > lastVersion) {
    return currentVersion + 1;
  }

  return lastVersion + 1;
}

/**
 * Read cached config of the build versions.
 *
 * @param {Object} cordovaContext
 * @return {Object} build config
 */
function readBuildVersionsConfig(cordovaContext) {
  var pathToConfig = pathToBuildVersionsConfig(cordovaContext),
    config;

  try {
    config = fs.readFileSync(pathToConfig, 'utf8');
  } catch (err) {
    return {
      android: 0
    };
  }

  return JSON.parse(config);
}

/**
 * Save new version of the build config.
 *
 * @param {Object} cordovaContext - cordova context
 * @param {Object} newConfig - config to save
 */
function saveBuildVersionsConfig(cordovaContext, newConfig) {
  var pathToConfig = pathToBuildVersionsConfig(cordovaContext),
    newConfigAsString = JSON.stringify(newConfig, null, 2);

  try {
    fs.writeFileSync(pathToConfig, newConfigAsString, {
      encoding: 'utf8',
      flag: 'w+'
    });
  } catch (err) {
    return false;
  }

  return true;
}

/**
 * Path to the build config.
 *
 * @param {Object} cordovaContext - cordova context
 * @return {String} path to the build config
 */
function pathToBuildVersionsConfig(cordovaContext) {
  return path.join(cordovaContext.opts.projectRoot, 'plugins', cordovaContext.opts.plugin.id, BUILD_CONFIG);
}
