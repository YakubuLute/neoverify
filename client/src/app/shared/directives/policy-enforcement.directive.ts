import { Directive, Input, OnInit, OnDestroy, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { OrganizationService } from '../../core/services/organization.service';

@Directive({
    selector: '[appPolicyEnforcement]',
    standalone: true
})
export class PolicyEnforcementDirective implements OnInit, OnDestroy {
    private readonly organizationService = inject(OrganizationService);
    private readonly templateRef = inject(TemplateRef<any>);
    private readonly viewContainer = inject(ViewContainerRef);
    private readonly destroy$ = new Subject<void>();

    @Input() appPolicyEnforcement!: string; // Setting path to check
    @Input() policyEnforcementValue?: any; // Value to validate against
    @Input() policyEnforcementMode: 'hide' | 'disable' | 'show-restriction' = 'disable';

    private hasView = false;

    ngOnInit(): void {
        this.checkPolicyEnforcement();

        // // Re-check when organization context changes
        // this.organizationService.currentOrganizationContext.subscribe(() => {
        //     this.checkPolicyEnforcement();
        // });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private checkPolicyEnforcement(): void {
        const isRestricted = this.organizationService.isSettingRestricted(this.appPolicyEnforcement);

        // If we have a value to validate, check it against policies
        let isValid = true;
        if (this.policyEnforcementValue !== undefined) {
            const validation = this.organizationService.validateSettingChange(
                this.appPolicyEnforcement,
                this.policyEnforcementValue
            );
            isValid = validation.isValid;
        }

        const shouldShow = !isRestricted && isValid;

        switch (this.policyEnforcementMode) {
            case 'hide':
                this.updateView(shouldShow);
                break;
            case 'disable':
                this.updateView(true); // Always show but may disable
                this.updateDisabledState(!shouldShow);
                break;
            case 'show-restriction':
                this.updateView(true); // Always show
                this.updateRestrictionDisplay(!shouldShow);
                break;
        }
    }

    private updateView(shouldShow: boolean): void {
        if (shouldShow && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!shouldShow && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }

    private updateDisabledState(shouldDisable: boolean): void {
        if (this.hasView) {
            const element = this.viewContainer.element.nativeElement.nextElementSibling;
            if (element) {
                if (shouldDisable) {
                    element.setAttribute('disabled', 'true');
                    element.classList.add('policy-disabled');
                } else {
                    element.removeAttribute('disabled');
                    element.classList.remove('policy-disabled');
                }
            }
        }
    }

    private updateRestrictionDisplay(showRestriction: boolean): void {
        if (this.hasView) {
            const element = this.viewContainer.element.nativeElement.nextElementSibling;
            if (element) {
                // Remove existing restriction notice
                const existingNotice = element.querySelector('.policy-restriction-notice');
                if (existingNotice) {
                    existingNotice.remove();
                }

                if (showRestriction) {
                    const restriction = this.organizationService.getSettingRestriction(this.appPolicyEnforcement);
                    if (restriction) {
                        const notice = document.createElement('div');
                        notice.className = 'policy-restriction-notice';
                        notice.innerHTML = `
              <div class="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm mt-1">
                <i class="pi pi-lock"></i>
                <span>${restriction.reason}</span>
              </div>
            `;
                        element.appendChild(notice);
                    }
                }
            }
        }
    }
}