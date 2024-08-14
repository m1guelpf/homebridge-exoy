# Homebridge Exoy One

A simple Homebridge plugin for the Exoy One Light.

## Installation

You can install the plugin either using the Homebridge Web UI or using the command line:

    npm install -g homebridge-exoy

To use the plugin, it must be configured. This is a minimal working configuration:

    {
    "bridge": {
        ....
    },
    "accessories": [],
    "platforms": [
        {
            "platform": "ExoyOneLights",
            "name": "Exoy One Light",
        }
      ]
    }

## Settings

Further settings are available to configure. This is a complete configuration:

```json
{
	"bridge": {
		// ....
	},
	"accessories": [],
	"platforms": [
		{
			"name": "Exoy One Lights",
			"pollingRate": 1000,
			"useIP": false,
			"platform": "ExoyOneLights"
		}
	]
}
```

-   `name` is the name of the plugin to appear in the log file. Defaults to `Exoy One Lights`.
-   `pollingRate` is the rate at which to poll the lights for changes in milliseconds. Defaults to `1000`.
-   `useIP` enables the usage of IP addresses instead of hostnames to connect to the lights. Defaults to `false`. Should only be turned on if you experience connection issues.

All settings can conveniently configured using the Homebridge Web UI.
