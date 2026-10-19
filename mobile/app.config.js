// Keep build-specific Maps keys in environment variables rather than app.json.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    [
      "react-native-maps",
      {
        ...(process.env.GOOGLE_MAPS_ANDROID_KEY
          ? { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY }
          : {}),
        ...(process.env.GOOGLE_MAPS_IOS_KEY
          ? { iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY }
          : {}),
      },
    ],
  ],
});
