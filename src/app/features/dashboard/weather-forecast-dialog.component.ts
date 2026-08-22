import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PropertyWeather } from '../../core/models/property-setting.model';

@Component({ selector: 'app-weather-forecast-dialog', standalone: true,
  imports: [DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './weather-forecast-dialog.component.html', styleUrl: './weather-forecast-dialog.component.scss' })
export class WeatherForecastDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public weather: PropertyWeather) {}
  symbol(code: number): string {
    if ([95,96,99].includes(code)) return '⛈️';
    if ([71,73,75,77,85,86].includes(code)) return '🌨️';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return '🌧️';
    if ([45,48].includes(code)) return '🌫️';
    if (code === 3) return '☁️';
    if (code === 1 || code === 2) return '🌤️';
    return '☀️';
  }
  description(code: number): string {
    if (code === 0) return 'Clear'; if ([1,2].includes(code)) return 'Partly cloudy';
    if (code === 3) return 'Overcast'; if ([45,48].includes(code)) return 'Fog';
    if ([51,53,55,56,57].includes(code)) return 'Drizzle';
    if ([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
    if ([71,73,75,77,85,86].includes(code)) return 'Snow';
    if ([95,96,99].includes(code)) return 'Thunderstorms'; return 'Forecast';
  }
}
