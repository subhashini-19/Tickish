import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionStatus, AuthenticationResult } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <ng-container *ngIf="isIframe; else appContent"></ng-container>

    <ng-template #appContent>
      <ng-container *ngIf="loginDisplay; else loginPrompt">
        <mat-toolbar color="primary">
          <span>Tickish</span>
          <span class="spacer"></span>
          <a mat-button routerLink="/todos" routerLinkActive="active-link">
            <mat-icon>checklist</mat-icon> My Todos
          </a>
          <a mat-button routerLink="/dashboard" routerLinkActive="active-link">
            <mat-icon>dashboard</mat-icon> Dashboard
          </a>
          <button mat-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon> {{ userName }}
          </button>
          <mat-menu #userMenu>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Sign out
            </button>
          </mat-menu>
        </mat-toolbar>
      </ng-container>

      <ng-template #loginPrompt>
        <mat-toolbar color="primary">
          <span>Tickish</span>
          <span class="spacer"></span>
          <button mat-button (click)="login()">
            <mat-icon>login</mat-icon> Sign in
          </button>
        </mat-toolbar>
        <div class="login-center" *ngIf="!isRedirectRoute">
          <p>Please sign in to manage your todos.</p>
          <button mat-flat-button color="primary" (click)="login()">Sign in</button>
        </div>
      </ng-template>

      <!-- Always rendered so /redirect route can process the auth code -->
      <main class="container">
        <router-outlet />
      </main>
    </ng-template>
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    .container { max-width: 960px; margin: 24px auto; padding: 0 16px; }
    .active-link { background: rgba(255,255,255,0.15); border-radius: 4px; }
    .login-center { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100vh - 64px); gap: 16px; color: #666; }
  `],
})
export class App implements OnInit, OnDestroy {
  private msalService = inject(MsalService);
  private broadcastService = inject(MsalBroadcastService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  isIframe = false;
  loginDisplay = false;
  userName = '';
  isRedirectRoute = false;

  ngOnInit(): void {
    this.isIframe = window !== window.parent && !window.opener;

    // Track current route to suppress login prompt on /redirect
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        this.isRedirectRoute = (e as NavigationEnd).urlAfterRedirects.startsWith('/redirect');
      });

    // handleRedirectObservable processes the auth code at /redirect and navigates to /todos.
    // navigateToLoginRequestUrl: false avoids CIAM issues with replaying the original request URL.
    this.msalService.handleRedirectObservable({ navigateToLoginRequestUrl: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: AuthenticationResult | null) => {
          if (result?.account) {
            this.msalService.instance.setActiveAccount(result.account);
            this.router.navigate(['/todos']);
          }
        },
        error: (err) => console.error('MSAL redirect error:', err),
      });

    // Only show app once MSAL is settled
    this.broadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.setLoginDisplay();
        this.checkAndSetActiveAccount();
      });

    // Keep display in sync when login completes
    this.broadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this.destroy$)
      )
      .subscribe((result: EventMessage) => {
        const payload = result.payload as AuthenticationResult;
        this.msalService.instance.setActiveAccount(payload.account);
        this.setLoginDisplay();
      });

    // Keep display in sync when logout completes
    this.broadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGOUT_SUCCESS),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.setLoginDisplay());
  }

  setLoginDisplay(): void {
    this.loginDisplay = this.msalService.instance.getAllAccounts().length > 0;
    this.userName =
      this.msalService.instance.getActiveAccount()?.name ??
      this.msalService.instance.getAllAccounts()[0]?.username ?? '';
  }

  checkAndSetActiveAccount(): void {
    const active = this.msalService.instance.getActiveAccount();
    if (!active && this.msalService.instance.getAllAccounts().length > 0) {
      this.msalService.instance.setActiveAccount(
        this.msalService.instance.getAllAccounts()[0]
      );
    }
  }

  login(): void {
    this.msalService.loginRedirect({ scopes: ['offline_access'] });
  }

  logout(): void {
    this.msalService.logoutRedirect({
      account: this.msalService.instance.getActiveAccount(),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
