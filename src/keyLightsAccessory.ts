import {
	Service,
	PlatformAccessory,
	CharacteristicValue,
	CharacteristicSetCallback,
	CharacteristicGetCallback,
} from 'homebridge';

import { ExoyPlatform } from './exoyPlatform';
import { LightInstance, Light } from './light';

/**
 * Platform Accessory for the Key Light
 * An instance of this class is created for each light.
 */
export class KeyLightsAccessory {
	private service: Service;

	constructor(
		private readonly platform: ExoyPlatform,
		private readonly accessory: PlatformAccessory,
		private readonly light: LightInstance,
	) {
		// set accessory information
		this.accessory
			.getService(this.platform.Service.AccessoryInformation)!
			.setCharacteristic(
				this.platform.Characteristic.Manufacturer,
				'Exoy',
			)
			.setCharacteristic(this.platform.Characteristic.Model, 'Exoy One')
			.setCharacteristic(
				this.platform.Characteristic.SerialNumber,
				this.light.info!.mdnsName,
			)
			.setCharacteristic(
				this.platform.Characteristic.FirmwareRevision,
				this.light.info!.firmwareVersion,
			);

		this.light.onPropertyChanged = this.onPropertyChanged.bind(this);

		// get the LightBulb service if it exists, otherwise create a new LightBulb service
		this.service =
			this.accessory.getService(this.platform.Service.Lightbulb) ||
			this.accessory.addService(this.platform.Service.Lightbulb);

		// set the service name, this is what is displayed as the default name on the Home app
		this.service.setCharacteristic(
			this.platform.Characteristic.Name,
			this.light.displayName,
		);

		// register handlers for the On/Off Characteristic
		this.service
			.getCharacteristic(this.platform.Characteristic.On)
			.on('set', this.setOn.bind(this))
			.on('get', this.getOn.bind(this));

		// register handlers for the Brightness Characteristic
		this.service
			.getCharacteristic(this.platform.Characteristic.Brightness)
			.on('set', this.setBrightness.bind(this))
			.on('get', this.getBrightness.bind(this));

		// register handlers for the Color Temperature Characteristic and set the valid value range
		this.service
			.getCharacteristic(this.platform.Characteristic.Hue)
			.on('set', this.setHue.bind(this))
			.on('get', this.getHue.bind(this));
		this.service
			.getCharacteristic(this.platform.Characteristic.Saturation)
			.on('set', this.setSaturation.bind(this))
			.on('get', this.getSaturation.bind(this));
	}

	/**
	 * Handlers for the On/Off Characteristic
	 */
	setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
		this.light
			.setProperty('devicePoweredOn', (value as boolean) ? 1 : 0)
			.then(() => {
				this.platform.log.debug(
					'Set Characteristic On ->',
					value,
					'successfully on',
					this.accessory.displayName,
				);
				callback(null);
			})
			.catch((reason) => {
				this.platform.log.error(
					'Set Characteristic On ->',
					value,
					'failed on',
					this.accessory.displayName,
				);
				this.platform.log.debug(reason);
				callback(Error());
			});
	}

	getOn(callback: CharacteristicGetCallback) {
		callback(null, this.light.options?.devicePoweredOn);
	}

	/**
	 * Handlers for the Brightness Characteristic
	 */
	setBrightness(
		value: CharacteristicValue,
		callback: CharacteristicSetCallback,
	) {
		this.light
			.setProperty('brightness', value)
			.then(() => {
				this.platform.log.debug(
					'Set Characteristic Brightness ->',
					value,
					'successfully on',
					this.accessory.displayName,
				);
				callback(null);
			})
			.catch((reason) => {
				this.platform.log.error(
					'Set Characteristic Brightness ->',
					value,
					'failed on',
					this.accessory.displayName,
				);
				this.platform.log.debug(reason);
				callback(Error());
			});
	}

	getBrightness(callback: CharacteristicGetCallback) {
		callback(null, this.light.getProperty('brightness'));
	}

	/**
	 * Handlers for the Hue Characteristic
	 */
	setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
		this.light
			.setProperty('hue', value)
			.then(() => {
				this.platform.log.debug(
					'Set Characteristic Hue ->',
					value,
					'successfully on',
					this.accessory.displayName,
				);
				callback(null);
			})
			.catch((reason) => {
				this.platform.log.error(
					'Set Characteristic Hue ->',
					value,
					'failed on',
					this.accessory.displayName,
				);
				this.platform.log.debug(reason);
				callback(Error());
			});
	}

	getHue(callback: CharacteristicGetCallback) {
		callback(null, this.light.getProperty('hue'));
	}

	/**
	 * Handlers for the Saturation Characteristic
	 */
	setSaturation(
		value: CharacteristicValue,
		callback: CharacteristicSetCallback,
	) {
		this.light
			.setProperty('saturation', value)
			.then(() => {
				this.platform.log.debug(
					'Set Characteristic Saturation ->',
					value,
					'successfully on',
					this.accessory.displayName,
				);
				callback(null);
			})
			.catch((reason) => {
				this.platform.log.error(
					'Set Characteristic Saturation ->',
					value,
					'failed on',
					this.accessory.displayName,
				);
				this.platform.log.debug(reason);
				callback(Error());
			});
	}

	getSaturation(callback: CharacteristicGetCallback) {
		callback(null, this.light.getProperty('saturation'));
	}

	/**
	 * Callback function to update Home Kit when a property has been changed
	 */
	onPropertyChanged(
		property: 'hue' | 'saturation' | 'brightness' | 'devicePoweredOn',
		value: number,
	) {
		this.platform.log.debug(
			'Updating property',
			property,
			'of device',
			this.accessory.displayName,
			'to',
			value,
		);
		switch (property) {
			case 'devicePoweredOn':
				this.service.updateCharacteristic(
					this.platform.Characteristic.On,
					value,
				);
				break;
			case 'hue':
				this.service.updateCharacteristic(
					this.platform.Characteristic.Hue,
					value,
				);
				break;
			case 'saturation':
				this.service.updateCharacteristic(
					this.platform.Characteristic.Saturation,
					value,
				);
				break;
			case 'brightness':
				this.service.updateCharacteristic(
					this.platform.Characteristic.Brightness,
					value,
				);
				break;
			default:
				break;
		}
	}

	/**
	 * Update the connection information
	 * Called from platform handler when the light got a new IP address
	 */
	updateConnectionData(data: Light) {
		this.light.hostname = data.hostname;
	}
}
