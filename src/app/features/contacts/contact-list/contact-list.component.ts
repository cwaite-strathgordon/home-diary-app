import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { Contact } from '../../../core/models/contact.model';
import { ContactsService } from '../../../core/services/contacts.service';
import { ContactFormComponent } from '../contact-form/contact-form.component';
import { AppDialogService } from '../../../core/services/app-dialog.service';
import { ContactListNavigationService } from '../../../core/services/contact-list-navigation.service';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatPaginatorModule, MatProgressBarModule, MatSortModule, MatTableModule, MatTooltipModule],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly displayedColumns = ['name', 'companyName', 'email', 'mobile', 'actions'];
  readonly dataSource = new MatTableDataSource<Contact>();
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly hoveredContact = signal<Contact | null>(null);
  readonly previewX = signal(0);
  readonly previewY = signal(0);
  showFilters = false;
  readonly filterForm = this.fb.group({ name: [''], company: [''], emailOrMobile: [''] });
  private filterChangesSubscription?: Subscription;

  constructor(
    private readonly contacts: ContactsService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly appDialog: AppDialogService,
    private readonly contactListNavigation: ContactListNavigationService,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (contact, value) => {
      const filters = JSON.parse(value || '{}') as Record<string, string>;
      const name = this.contactName(contact).toLowerCase();
      const company = (contact.companyName ?? '').toLowerCase();
      const emailOrMobile = `${contact.email ?? ''} ${contact.mobile ?? ''}`.toLowerCase();
      return name.includes(filters['name'] ?? '')
        && company.includes(filters['company'] ?? '')
        && emailOrMobile.includes(filters['emailOrMobile'] ?? '');
    };
    this.filterChangesSubscription = this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((previous, current) =>
        JSON.stringify(previous) === JSON.stringify(current)),
    ).subscribe(() => this.applyFilters());
    this.load();
  }

  ngOnDestroy(): void { this.filterChangesSubscription?.unsubscribe(); }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (contact, property) => property === 'name'
      ? this.contactName(contact).toLowerCase()
      : String(contact[property as keyof Contact] ?? '').toLowerCase();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.contacts.getAll().subscribe({
      next: contacts => { this.dataSource.data = contacts; this.loading.set(false); },
      error: () => { this.errorMessage.set('Unable to load contacts.'); this.loading.set(false); },
    });
  }

  applyFilters(): void {
    const value = this.filterForm.getRawValue();
    this.dataSource.filter = JSON.stringify({
      name: value.name?.trim().toLowerCase() ?? '',
      company: value.company?.trim().toLowerCase() ?? '',
      emailOrMobile: value.emailOrMobile?.trim().toLowerCase() ?? '',
    });
    this.dataSource.paginator?.firstPage();
  }

  clearFilters(): void {
    this.filterForm.reset({ name: '', company: '', emailOrMobile: '' }, { emitEvent: false });
    this.applyFilters();
  }

  clearFilter(controlName: 'name' | 'company' | 'emailOrMobile'): void {
    this.filterForm.get(controlName)?.setValue('');
  }
  toggleFilters(): void { this.showFilters = !this.showFilters; }
  contactName(contact: Contact): string { return [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.companyName || 'Unnamed contact'; }
  initials(contact: Contact): string { return `${contact.firstName?.[0] ?? ''}${contact.lastName?.[0] ?? ''}`.toUpperCase() || '?'; }
  openDetails(contact: Contact): void {
    const rows = [...this.dataSource.filteredData];
    const orderedRows = this.dataSource.sort
      ? this.dataSource.sortData(rows, this.dataSource.sort)
      : rows;
    this.contactListNavigation.setContext(
      orderedRows.map(row => row.contactId),
      this.router.url,
    );
    this.router.navigate(['/contacts', contact.contactId], { queryParams: { listNav: 1 } });
  }

  showPreview(contact: Contact, mouseEvent: MouseEvent): void {
    const row = mouseEvent.currentTarget as HTMLElement;
    const bounds = row.getBoundingClientRect();
    const previewWidth = 310;
    const previewHeight = 150;
    this.previewX.set(Math.max(12, Math.min(bounds.left + 24, window.innerWidth - previewWidth - 12)));
    this.previewY.set(bounds.bottom + previewHeight + 10 <= window.innerHeight
      ? bounds.bottom + 6
      : Math.max(12, bounds.top - previewHeight - 6));
    this.hoveredContact.set(contact);
  }

  hidePreview(): void { this.hoveredContact.set(null); }

  openForm(contact?: Contact, mouseEvent?: MouseEvent): void {
    mouseEvent?.stopPropagation();
    const ref = this.dialog.open(ContactFormComponent, {
      data: { contact }, width: '680px', maxWidth: '94vw', maxHeight: '92vh', disableClose: true,
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  deleteContact(contact: Contact, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    this.appDialog.confirm({ title: 'Delete contact?', message: `Delete ${this.contactName(contact)}?`,
      detail: 'Their links to tasks will also be removed.', tone: 'danger', confirmText: 'Delete contact' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.contacts.delete(contact.contactId).subscribe({
        next: () => this.load(), error: () => this.errorMessage.set('The contact could not be deleted.'),
      });
    });
  }
}
