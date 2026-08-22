import { PropertySetting } from './property-setting.model';

export interface OnboardingFeatures {
  propertyType?: string;
  hasGarden: boolean;
  hasGarage: boolean;
  hasAirConditioning: boolean;
  hasGasBoiler: boolean;
  hasSolarPanels: boolean;
  hasPool: boolean;
}

export interface OnboardingAreaSuggestion {
  title: string;
  description?: string;
  selected: boolean;
}

export interface OnboardingMaintenanceSuggestion {
  title: string;
  description?: string;
  recurrenceUnit: string;
  recurrenceInterval: number;
  suggestedArea?: string;
  selected: boolean;
}

export interface OnboardingSuggestions {
  areas: OnboardingAreaSuggestion[];
  maintenanceTasks: OnboardingMaintenanceSuggestion[];
}

export interface CompleteOnboardingRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber?: string;
  clientName: string;
  property: PropertySetting;
  areas: OnboardingAreaSuggestion[];
  maintenanceTasks: OnboardingMaintenanceSuggestion[];
}
