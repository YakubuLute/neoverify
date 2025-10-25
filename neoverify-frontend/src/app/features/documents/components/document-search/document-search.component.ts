import { Component, Input, Output, EventEmitter, signal, OnInit, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SHARED_IMPORTS } from '../../../../shared';
import { DocumentFilters, DocumentType, DocumentStatus, VerificationStatus } from '../../../../shared/models/document.models';

@Component({
    selector: 'app-document-search',
    standalone: true,
    imports: [SHARED_IMPORTS, ReactiveFormsModule],
    templateUrl: './document-search.component.html',
    styleUrl: './document-search.component.scss'
})
export class DocumentSearchComponent implements OnInit, OnDestroy {
    @Input() initialQuery = '';
    @Input() initialFilters: DocumentFilters = {};
    @Input() showAdvancedFilters = false;
    @Input() searchPlaceholder = 'Search documents by title, description, or tags...';

    @Output() searchChange = new EventEmitter<string>();
    @Output() filtersChange = new EventEmitter<DocumentFilters>();
    @Output() clearFilters = new EventEmitter<void>();

    private readonly destroy$ = new Subject<void>();

    // Form controls
    readonly searchControl = new FormControl('');
    readonly filters = signal<DocumentFilters>({});
    readonly hasActiveFilters = signal(false);

    // Filter options
    readonly documentTypeOptions = [
        { label: 'Degree', value: DocumentType.DEGREE },
        { label: 'Certificate', value: DocumentType.CERTIFICATE },
        { label: 'License', value: DocumentType.LICENSE },
        { label: 'Transcript', value: DocumentType.TRANSCRIPT },
        { label: 'ID Document', value: DocumentType.ID_DOCUMENT },
        { label: 'Other', value: DocumentType.OTHER }
    ];

    readonly statusOptions = [
        { label: 'Active', value: DocumentStatus.ACTIVE },
        { label: 'Pending', value: DocumentStatus.PENDING },
        { label: 'Revoked', value: DocumentStatus.REVOKED },
        { label: 'Expired', value: DocumentStatus.EXPIRED }
    ];

    readonly verificationStatusOptions = [
        { label: 'Verified', value: VerificationStatus.VERIFIED },
        { label: 'Pending', value: VerificationStatus.PENDING },
        { label: 'Failed', value: VerificationStatus.FAILED },
        { label: 'Expired', value: VerificationStatus.EXPIRED }
    ];

    // Enum references for template
    readonly DocumentType = DocumentType;
    readonly DocumentStatus = DocumentStatus;
    readonly VerificationStatus = VerificationStatus;

    ngOnInit(): void {
        // Initialize form values
        this.searchControl.setValue(this.initialQuery);
        this.filters.set(this.initialFilters);
        this.updateHasActiveFilters();

        // Setup search debouncing
        this.searchControl.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(query => {
                this.searchChange.emit(query || '');
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onDocumentTypeChange(selectedTypes: DocumentType[]): void {
        const currentFilters = this.filters();
        const updatedFilters = {
            ...currentFilters,
            documentType: selectedTypes.length > 0 ? selectedTypes : undefined
        };
        this.updateFilters(updatedFilters);
    }

    onStatusChange(selectedStatuses: DocumentStatus[]): void {
        const currentFilters = this.filters();
        const updatedFilters = {
            ...currentFilters,
            status: selectedStatuses.length > 0 ? selectedStatuses : undefined
        };
        this.updateFilters(updatedFilters);
    }

    onVerificationStatusChange(selectedStatuses: VerificationStatus[]): void {
        const currentFilters = this.filters();
        const updatedFilters = {
            ...currentFilters,
            verificationStatus: selectedStatuses.length > 0 ? selectedStatuses : undefined
        };
        this.updateFilters(updatedFilters);
    }

    onDateRangeChange(dateRange: Date[] | null): void {
        const currentFilters = this.filters();
        const updatedFilters = {
            ...currentFilters,
            dateRange: dateRange && dateRange.length === 2
                ? { start: dateRange[0], end: dateRange[1] }
                : undefined
        };
        this.updateFilters(updatedFilters);
    }

    onIssuerChange(issuers: string[]): void {
        const currentFilters = this.filters();
        const updatedFilters = {
            ...currentFilters,
            issuer: issuers.length > 0 ? issuers : undefined
        };
        this.updateFilters(updatedFilters);
    }

    onTagsChange(tags: string[]): void {
        const currentFilters = this.filters();
        const updatedFilters = {
            ...currentFilters,
            tags: tags.length > 0 ? tags : undefined
        };
        this.updateFilters(updatedFilters);
    }

    onClearFilters(): void {
        this.searchControl.setValue('');
        this.filters.set({});
        this.updateHasActiveFilters();
        this.clearFilters.emit();
    }

    private updateFilters(newFilters: DocumentFilters): void {
        this.filters.set(newFilters);
        this.updateHasActiveFilters();
        this.filtersChange.emit(newFilters);
    }

    private updateHasActiveFilters(): void {
        const currentFilters = this.filters();
        const hasFilters = Object.keys(currentFilters).some(key => {
            const value = currentFilters[key as keyof DocumentFilters];
            return value !== undefined && value !== null &&
                (Array.isArray(value) ? value.length > 0 : true);
        });
        this.hasActiveFilters.set(hasFilters || !!this.searchControl.value);
    }

    // Helper methods for getting current filter values
    getCurrentDocumentTypes(): DocumentType[] {
        return this.filters().documentType || [];
    }

    getCurrentStatuses(): DocumentStatus[] {
        return this.filters().status || [];
    }

    getCurrentVerificationStatuses(): VerificationStatus[] {
        return this.filters().verificationStatus || [];
    }

    getCurrentDateRange(): Date[] | null {
        const dateRange = this.filters().dateRange;
        return dateRange ? [dateRange.start, dateRange.end] : null;
    }

    getCurrentIssuers(): string[] {
        return this.filters().issuer || [];
    }

    getCurrentTags(): string[] {
        return this.filters().tags || [];
    }
}