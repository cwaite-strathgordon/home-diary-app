import { Component } from '@angular/core';
import { LookupManagementComponent } from '../lookup-management/lookup-management.component';

@Component({
  selector: 'app-area-management',
  standalone: true,
  imports: [LookupManagementComponent],
  template: `
    <app-lookup-management
      kind="areas"
      heading="Areas"
      singularName="Area"
      description="Manage the locations available when recording home tasks."
    />
  `,
})
export class AreaManagementComponent {}
