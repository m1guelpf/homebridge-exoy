import { Logger } from 'homebridge';
import dgram from 'dgram';

interface ExoyData {
	fadingOff: boolean;
	hue: number;
	mdnsName: string;
	saturation: number;
	brightness: number;
	userDefinedName: string;
	firmwareVersion: string;
}

export interface Light {
	hostname: string;
	name: string;
	mac: string;
}

// @todo improve this in future rewrite
export interface LightInstance extends Light {
	info?: KeyLightInfo;
	options?: KeyLightOptions;
}

export interface KeyLightInfo {
	mdnsName: string;
	displayName: string;
	firmwareVersion: string;
}

export interface KeyLightOptions {
	hue: number;
	brightness: number;
	saturation: number;
	devicePoweredOn: boolean;
}

export class LightInstance {
	private readonly log: Logger;
	private readonly client: dgram.Socket;
	private readonly pollingRate: number;
	private readonly lastSettings: {
		hue: number;
		saturation: number;
		brightness: number;
	};

	private constructor(keyLight: Light, log: Logger, pollingRate: number) {
		this.hostname = keyLight.hostname;
		this.name = keyLight.name;
		this.mac = keyLight.mac;

		this.log = log;
		this.pollingRate = pollingRate;
		this.client = dgram.createSocket({ type: `udp4` });
		this.lastSettings = { hue: 0, saturation: 0, brightness: 0 };
	}

	private _onPropertyChanged: (
		arg1: 'hue' | 'saturation' | 'brightness' | 'devicePoweredOn',
		arg2: number,
	) => void = () => {
		true;
	};

	// Creates a new instance of a key light and pulls all neccessary data from the light
	public static async createInstance(
		data: Light,
		log: Logger,
		pollingRate?: number,
	): Promise<LightInstance> {
		const result = new LightInstance(data, log, pollingRate ?? 1000);

		result.client.addListener('message', (msg) => {
			const config = JSON.parse(msg.toString());

			result.updateConfig(config);
		});

		await result.connect();
		await result.getInfo();

		result.pollOptions();
		return result;
	}

	public get displayName(): string {
		if (!this.info?.displayName) {
			return this.name;
		} else {
			return this.info.displayName === ''
				? this.name
				: this.info.displayName;
		}
	}

	public set onPropertyChanged(
		callback: (
			arg1: 'hue' | 'saturation' | 'brightness' | 'devicePoweredOn',
			arg2: number,
		) => void,
	) {
		this._onPropertyChanged = callback;
	}

	public async setProperty(
		property: 'hue' | 'saturation' | 'brightness' | 'devicePoweredOn',
		value,
	) {
		switch (property) {
			case 'hue':
				// hue is given in the range 0 - 360, but the device expects 0 - 255
				this.lastSettings.hue = Math.round(
					1 + (Math.max(0, Math.min(360, value)) * (255 - 1)) / 360,
				);

				await this.send(
					`{"setHue":${this.lastSettings.hue},"setSaturation":${this.lastSettings.saturation}}`,
				);
				break;
			case 'saturation':
				// saturation is given in the range 0 - 100, but the device expects 1 - 255
				this.lastSettings.saturation = Math.round(
					1 +
						((Math.max(1, Math.min(100, value)) - 1) * (255 - 1)) /
							99,
				);

				await this.send(
					`{"setHue":${this.lastSettings.hue},"setSaturation":${this.lastSettings.saturation}}`,
				);
				break;
			case 'brightness':
				// brightness is given in the range 1 - 100, but the device expects 60 - 255
				this.lastSettings.brightness = Math.round(
					60 +
						((Math.max(1, Math.min(100, value)) - 1) * (255 - 60)) /
							99,
				);

				await this.send(
					JSON.stringify({
						setBrightness: this.lastSettings.brightness,
					}),
				);
				break;
			case 'devicePoweredOn':
				await this.send(JSON.stringify({ togglePower: value }));
				break;
		}
	}

	public getProperty(
		property: 'hue' | 'saturation' | 'brightness' | 'devicePoweredOn',
	) {
		return this.options?.[property] ?? 0;
	}

	private updateConfig(config: ExoyData) {
		const newBrightness = Math.round(
			1 +
				((Math.max(60, Math.min(255, config.brightness)) - 60) * 99) /
					(255 - 60),
		);

		const newSaturation = Math.round(
			1 +
				((Math.max(1, Math.min(255, config.saturation)) - 1) * 99) /
					(255 - 1),
		);

		const newHue =
			360 -
			Math.round(
				1 +
					((Math.max(1, Math.min(255, config.hue)) - 1) * 360) /
						(255 - 1),
			);

		if (this.options) {
			const oldConfig = this.options;

			if (oldConfig.devicePoweredOn === config.fadingOff) {
				this._onPropertyChanged(
					'devicePoweredOn',
					config.fadingOff ? 1 : 0,
				);
			}

			if (oldConfig.brightness !== newBrightness) {
				this._onPropertyChanged('brightness', newBrightness);
			}

			if (oldConfig.hue !== newHue) {
				this._onPropertyChanged('hue', newHue);
			}

			if (oldConfig.saturation !== newSaturation) {
				this._onPropertyChanged('saturation', newSaturation);
			}
		}

		this.options = {
			hue: newHue,
			brightness: newBrightness,
			saturation: newSaturation,
			devicePoweredOn: !config.fadingOff,
		};

		this.info = {
			mdnsName: config.mdnsName,
			displayName: config.userDefinedName,
			firmwareVersion: config.firmwareVersion,
		};
	}

	/**
	 * The current state of the light is polled regularly. When a change is detected, the onPropertyChanged callback function
	 * is called to update HomeKit.
	 */
	private pollOptions() {
		setInterval(() => {
			this.send(JSON.stringify({ getData: 1 })).catch(() => {
				// we'll retry again
				this.log.debug('Polling of', this.displayName, 'failed');
				true;
			});
		}, this.pollingRate);
	}

	private async getInfo(): Promise<void> {
		await this.send(JSON.stringify({ getData: 1 }));

		return new Promise((resolve) => {
			const interval = setInterval(() => {
				if (this.info) {
					clearInterval(interval);
					resolve();
				}
			}, 100);
		});
	}

	private async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			const connectListener = () => resolve();
			const errorListener = (error: Error) => {
				this.client.close();
				reject(error);
			};
			const unsubscribeListener = () => {
				this.client.removeListener('error', errorListener);
				this.client.removeListener('connect', connectListener);

				this.client.removeListener('error', unsubscribeListener);
				this.client.removeListener('connect', unsubscribeListener);
			};

			this.client.on('connect', connectListener);
			this.client.on('error', errorListener);

			this.client.on('connect', unsubscribeListener);
			this.client.on('error', unsubscribeListener);

			this.client.connect(8888, this.hostname);
		});
	}

	private async send(msg: string): Promise<void> {
		this.log.debug(`Sending ${msg}`);
		try {
			return new Promise((resolve, reject) => {
				this.client.send(msg, (error) => {
					if (error) reject(error);
					else resolve();
				});
			});
		} catch (error) {
			return Promise.reject(error);
		}
	}
}
