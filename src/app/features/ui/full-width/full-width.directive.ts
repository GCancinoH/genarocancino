import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[fullWidth]',
})
export class FullWidthDirective {
  @HostBinding('style.width') width = '100%';
}
