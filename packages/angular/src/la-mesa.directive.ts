import { 
  Directive, 
  Input, 
  TemplateRef, 
  ViewContainerRef, 
  signal, 
  inject, 
  OnInit, 
  OnDestroy 
} from '@angular/core';
import { TableCore } from '@lamesa/core';
import { LaMesaContext } from './types';

@Directive({
  name: '[laMesa]',
  standalone: true
})
export class LaMesaDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef<LaMesaContext>);
  private viewContainer = inject(ViewContainerRef);

  // The headless engine instance passed from the parent component
  @Input('laMesa') tableInstance!: TableCore;

  // An Angular signal mapped to the core engine state for template reactivity
  public tableState = signal<any>(null);
  private unsubscribeFn?: () => void;

  ngOnInit(): OnInit {
    if (!this.tableInstance) {
      throw new Error('LaMesa Directive Error: You must provide a valid [laMesa] TableCore instance.');
    }

    // Seed initial state into our signal boundary
    this.tableState.set(this.tableInstance.getState());

    // Connect LaMesa's notification engine directly to our Angular signal update path
    this.unsubscribeFn = this.tableInstance.subscribe((nextState) => {
      this.tableState.set(nextState);
    });

    // Render the structural template context smoothly
    this.viewContainer.createEmbeddedView(this.templateRef, {
      $implicit: this.tableInstance,
      laMesa: this.tableInstance
    });
  }

  ngOnDestroy(): void {
    // Clean up the subscription handler safely to prevent memory leaks
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
    }
    this.viewContainer.clear();
  }
}