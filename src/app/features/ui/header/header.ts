import { Component, inject, input, model } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
// Material
import { MatBadge } from '@angular/material/badge';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

type headerUse = "main" | "ascenso" | "dashboard";

@Component({
  selector: 'gc-header',
  imports: [
    RouterLink,
    MatBadge, MatButton, MatIcon, MatIconButton, MatMenu, MatMenuTrigger, MatMenuItem, MatDivider
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // injects
  private router = inject(Router);

  // inputs
  useWhen = input.required<headerUse>();
  showDrawer = model<boolean>(false);

  useDrawer() {
    this.showDrawer.update(v => !v);
    console.log(this.showDrawer());
  }

}
