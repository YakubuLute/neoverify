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
    enableSmoothScrolling?: boolean;
    dynamicHeight?: boolean;
    overscan?: number; // Additional items to render outside viewport
}

export interface VirtualScrollViewport {
    startIndex: number;
    endIndex: number;
    visibleItems: any[];
    totalHeight: number;
    offsetY: number;
    scrollTop: number;
    containerHeight: number;
}

export interface VirtualScrollPerformanceMetrics {
    renderTime: number;
    scrollEvents: number;
    visibleItemCount: number;
    totalItemCount: number;
    memoryUsage: number;
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
    @Input() config: VirtualScrollConfig = {
        itemHeight: 100,
        bufferSize: 5,
        threshold: 50,
        enableSmoothScrolling: true,
        dynamicHeight: false,
        overscan: 3
    };

    @Output() viewportChange = new EventEmitter<VirtualScrollViewport>();
    @Output() scrollEnd = new EventEmitter<void>();
    @Output() performanceMetrics = new EventEmitter<VirtualScrollPerformanceMetrics>();

    private containerHeight = signal(0);
    private scrollTop = signal(0);
    private itemHeights = new Map<number, number>(); // For dynamic height support
    private lastRenderTime = 0;
    private scrollEventCount = 0;
    private isScrolling = false;
    private scrollTimeout?: number;

    readonly viewport = computed(() => {
        const startTime = performance.now();
        const containerH = this.containerHeight();
        const scrollT = this.scrollTop();
        const itemHeight = this.config.itemHeight;
        const bufferSize = this.config.bufferSize || 5;
        const overscan = this.config.overscan || 3;

        if (!containerH || !this.items.length) {
            return {
                startIndex: 0,
                endIndex: 0,
                visibleItems: [],
                totalHeight: 0,
                offsetY: 0,
                scrollTop: scrollT,
                containerHeight: containerH
            };
        }

        let totalHeight = 0;
        let offsetY = 0;
        let startIndex = 0;
        let endIndex = 0;

        if (this.config.dynamicHeight && this.itemHeights.size > 0) {
            // Calculate with dynamic heights
            let currentHeight = 0;
            let foundStart = false;

            for (let i = 0; i < this.items.length; i++) {
                const height = this.itemHeights.get(i) || itemHeight;

                if (!foundStart && currentHeight + height > scrollT) {
                    startIndex = Math.max(0, i - bufferSize - overscan);
                    foundStart = true;
                }

                if (foundStart && currentHeight > scrollT + containerH) {
                    endIndex = Math.min(this.items.length - 1, i + bufferSize + overscan);
                    break;
                }

                currentHeight += height;
            }

            // Calculate offset for dynamic heights
            for (let i = 0; i < startIndex; i++) {
                offsetY += this.itemHeights.get(i) || itemHeight;
            }

            totalHeight = currentHeight;
        } else {
            // Fixed height calculation (optimized)
            const visibleCount = Math.ceil(containerH / itemHeight);
            startIndex = Math.max(0, Math.floor(scrollT / itemHeight) - bufferSize - overscan);
            endIndex = Math.min(
                this.items.length - 1,
                startIndex + visibleCount + (bufferSize * 2) + (overscan * 2)
            );

            totalHeight = this.items.length * itemHeight;
            offsetY = startIndex * itemHeight;
        }

        const visibleItems = this.items.slice(startIndex, endIndex + 1);

        // Track performance
        this.lastRenderTime = performance.now() - startTime;
        this.emitPerformanceMetrics();

        return {
            startIndex,
            endIndex,
            visibleItems,
            totalHeight,
            offsetY,
            scrollTop: scrollT,
            containerHeight: containerH
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
                throttleTime(8), // ~120fps for smoother scrolling
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.scrollEventCount++;
                this.isScrolling = true;

                // Clear existing timeout
                if (this.scrollTimeout) {
                    clearTimeout(this.scrollTimeout);
                }

                // Set scroll end timeout
                this.scrollTimeout = window.setTimeout(() => {
                    this.isScrolling = false;
                    this.optimizeAfterScroll();
                }, 150);

                this.scrollTop.set(element.scrollTop);
                this.checkScrollEnd();
                this.emitViewportChange();
            });

        // Add passive scroll listener for better performance
        element.addEventListener('scroll', this.onPassiveScroll.bind(this), { passive: true });
    }

    private onPassiveScroll(): void {
        // Lightweight scroll handler for immediate feedback
        if (this.config.enableSmoothScrolling) {
            requestAnimationFrame(() => {
                this.cdr.detectChanges();
            });
        }
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

    /**
     * Update item height for dynamic sizing
     */
    updateItemHeight(index: number, height: number): void {
        if (this.config.dynamicHeight) {
            this.itemHeights.set(index, height);
            // Trigger viewport recalculation
            this.emitViewportChange();
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): VirtualScrollPerformanceMetrics {
        const viewport = this.viewport();
        return {
            renderTime: this.lastRenderTime,
            scrollEvents: this.scrollEventCount,
            visibleItemCount: viewport.visibleItems.length,
            totalItemCount: this.items.length,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Optimize performance after scrolling stops
     */
    private optimizeAfterScroll(): void {
        // Clean up unused item heights
        if (this.config.dynamicHeight && this.itemHeights.size > this.items.length * 1.5) {
            const validIndices = new Set(Array.from({ length: this.items.length }, (_, i) => i));
            for (const [index] of this.itemHeights) {
                if (!validIndices.has(index)) {
                    this.itemHeights.delete(index);
                }
            }
        }

        // Reset scroll event counter periodically
        if (this.scrollEventCount > 1000) {
            this.scrollEventCount = 0;
        }
    }

    private emitPerformanceMetrics(): void {
        if (this.scrollEventCount % 10 === 0) { // Emit every 10th scroll event
            this.performanceMetrics.emit(this.getPerformanceMetrics());
        }
    }

    private estimateMemoryUsage(): number {
        const viewport = this.viewport();
        const itemSize = 1000; // Estimated bytes per item
        return viewport.visibleItems.length * itemSize;
    }
}