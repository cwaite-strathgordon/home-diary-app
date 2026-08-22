import { Component } from '@angular/core';
import { LookupManagementComponent } from '../lookup-management/lookup-management.component';

@Component({
  selector: 'app-event-type-management',
  standalone: true,
  imports: [LookupManagementComponent],
  template: `
    <app-lookup-management
      kind="event-types"
      heading="Task types"
      singularName="Task type"
      description="Manage the categories available when creating home tasks."
    />
  `,
})
export class EventTypeManagementComponent {}
