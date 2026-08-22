export interface PropertySetting {
  settingId: number;
  clientId?: number;
  propertyName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postcode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  geocodedAddress?: string;
  updatedDate?: string;
  updatedById?: number;
  propertyType?: string;
  constructionYear?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  hasGarden?: boolean;
  hasGarage?: boolean;
  hasAirConditioning?: boolean;
  hasGasBoiler?: boolean;
  hasSolarPanels?: boolean;
  hasPool?: boolean;
}

export interface PropertyWeather {
  propertyName: string;
  location: string;
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
  maximumTemperature: number;
  minimumTemperature: number;
  precipitationProbability?: number;
  time?: string;
  forecast: PropertyWeatherDay[];
}

export interface PropertyWeatherDay {
  date: string;
  weatherCode: number;
  maximumTemperature: number;
  minimumTemperature: number;
  precipitationProbability?: number;
}
