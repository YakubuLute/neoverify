import {
    Directive,
    ElementRef,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    inject,
    signal,
    computed
} from '@angular/core';
import { fromEvent, Subject, throttleTime, takeUntil } from 'rxjs';

export interface VirtualScrollConfig {
    itemHeight: number;
    bufferSize?: number;
    threshold?: number;
}

export interface VirtualScrollViewport {
    startIndex: number;
    endIndex: number;
    visibleItems: any[];
    totalHeight: number;
    offsetY: number;
}

@Directive({
    selector: '[appVirtualScroll]',
    standalone: true
})
export class VirtualScrollDirective implements OnInit, OnDestroy {
    private readonly elementRef = inject(ElementRef);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroy$ = new Subject<void>();

    @Input() items: any[] = [];
    @Input() config: VirtualScrollConfig = { itemHeight: 100, bufferSize: 5, threshold: 50 };

    @Output() viewportChange = new EventEmitter<VirtualScrollViewport>();
    @Output() scrollEnd = new EventEmitter<void>();

    private containerHeight = signal(0);
    private scrollTop = signal(0);

    readonly viewport = computed(() => {
        const containerH = this.containerHeight();
        const scrollT = this.scrollTop();
        const itemHeight = this.config.itemHeight;
        const bufferSize = this.config.bufferSize || 5;

        if (!containerH || !this.items.length) {
            return {
                startIndex: 0,
                endIndex: 0,
                visibleItems: [],
                totalHeight: 0,
                offsetY: 0
            };
        }

        const visibleCount = Math.ceil(containerH / itemHeight);
        const startIndex = Math.max(0, Math.floor(scrollT / itemHeight) - bufferSize);
        const endIndex = Math.min(
            this.items.length - 1,
            startIndex + visibleCount + (bufferSize * 2)
        );

        const visibleItems = this.items.slice(startIndex, endIndex + 1);
        const totalHeight = this.items.length * itemHeight;
        const offsetY = startIndex * itemHeight;

        return {
            startIndex,
            endIndex,
            visibleItems,
            totalHeight,
            offsetY
        };
    });

    ngOnInit(): void {
        this.setupScrollListener();
        this.setupResizeObserver();
        this.updateContainerHeight();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private setupScrollListener(): void {
        const element = this.elementRef.nativeElement;

        fromEvent(element, 'scroll')
            .pipe(
                throttleTime(16), // ~60fps
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.scrollTop.set(element.scrollTop);
                this.checkScrollEnd();
                this.emitViewportChange();
            });
    }

    private setupResizeObserver(): void {
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                this.updateContainerHeight();
            });

            resizeObserver.observe(this.elementRef.nativeElement);

            // Clean up on destroy
            this.destroy$.subscribe(() => {
                resizeObserver.disconnect();
            });
        } else {
            // Fallback for browsers without ResizeObserver
            fromEvent(window, 'resize')
                .pipe(
                    throttleTime(100),
                    takeUntil(this.destroy$)
                )
                .subscribe(() => {
                    this.updateContainerHeight();
                });
        }
    }

    private updateContainerHeight(): void {
        const element = this.elementRef.nativeElement;
        this.containerHeight.set(element.clientHeight);
        this.emitViewportChange();
    }

    private checkScrollEnd(): void {
        const element = this.elementRef.nativeElement;
        const threshold = this.config.threshold || 50;

        if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
            this.scrollEnd.emit();
        }
    }

    private emitViewportChange(): void {
        const currentViewport = this.viewport();
        this.viewportChange.emit(currentViewport);
    }

    /**
     * Scroll to specific item index
     */
    scrollToIndex(index: number): void {
        const element = this.elementRef.nativeElement;
        const scrollTop = index * this.config.itemHeight;
        element.scrollTop = scrollTop;
    }

    /**
     * Scroll to top
     */
    scrollToTop(): void {
        this.elementRef.nativeElement.scrollTop = 0;
    }

    /**
     * Get current scroll position
     */
    getScrollPosition(): number {
        return this.elementRef.nativeElement.scrollTop;
    }

    /**
     * Set scroll position
     */
    setScrollPosition(position: number): void {
        this.elementRef.nativeElement.scrollTop = position;
    }
}