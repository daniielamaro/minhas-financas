const { AndroidConfig, withStringsXml } = require('@expo/config-plugins');

const DISPLAY_NAME = 'Minhas Finanças';

function withAndroidDisplayName(config) {
  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: DISPLAY_NAME })],
      config.modResults
    );
    return config;
  });
}

module.exports = withAndroidDisplayName;
