import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TodoService } from '../../../core/services/todo.service';
import { TodoSummary } from '../../../shared/models/todo.model';

// Dashboard uses the GraphQL todoSummary query — one request returns all aggregate data.
// This is the "why GraphQL" story: a REST equivalent would need multiple calls
// or a bespoke endpoint. Here the client declares exactly what it needs.

@Component({
  selector: 'app-todo-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <a mat-stroked-button routerLink="/todos">
        <mat-icon>checklist</mat-icon> View All Todos
      </a>
    </div>

    <ng-container *ngIf="summary$ | async as summary; else loading">
      <div class="stat-grid">
        <mat-card class="stat-card total">
          <mat-card-content>
            <mat-icon>assignment</mat-icon>
            <div class="stat-value">{{ summary.total }}</div>
            <div class="stat-label">Total</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card completed">
          <mat-card-content>
            <mat-icon>check_circle</mat-icon>
            <div class="stat-value">{{ summary.completed }}</div>
            <div class="stat-label">Completed</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card pending">
          <mat-card-content>
            <mat-icon>pending</mat-icon>
            <div class="stat-value">{{ summary.pending }}</div>
            <div class="stat-label">Pending</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card progress">
          <mat-card-content>
            <mat-icon>percent</mat-icon>
            <div class="stat-value">
              {{ summary.total > 0 ? ((summary.completed / summary.total) * 100 | number:'1.0-0') : 0 }}%
            </div>
            <div class="stat-label">Complete</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="priority-card">
        <mat-card-header>
          <mat-card-title>By Priority</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="priority-row" *ngFor="let item of priorityItems(summary)">
            <span class="priority-badge" [class]="item.class">{{ item.label }}</span>
            <div class="priority-bar-wrap">
              <div class="priority-bar" [style.width.%]="summary.total > 0 ? (item.count / summary.total) * 100 : 0" [class]="item.class"></div>
            </div>
            <span class="priority-count">{{ item.count }}</span>
          </div>
        </mat-card-content>
      </mat-card>
    </ng-container>

    <ng-template #loading>
      <div class="loading-center">
        <mat-spinner diameter="48" />
      </div>
    </ng-template>
  `,
  styles: [`
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { margin: 0; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card mat-card-content { display: flex; flex-direction: column; align-items: center; padding: 24px 16px; }
    .stat-card mat-icon { font-size: 36px; width: 36px; height: 36px; margin-bottom: 8px; }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-label { font-size: 0.85rem; color: #666; }
    .stat-card.total mat-icon { color: #1976d2; }
    .stat-card.completed mat-icon { color: #388e3c; }
    .stat-card.pending mat-icon { color: #f57c00; }
    .stat-card.progress mat-icon { color: #7b1fa2; }
    .priority-card { margin-top: 8px; }
    .priority-row { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
    .priority-badge { width: 64px; text-align: center; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
    .priority-badge.high, .priority-bar.high { background: #ffcdd2; color: #c62828; }
    .priority-badge.medium, .priority-bar.medium { background: #fff3e0; color: #e65100; }
    .priority-badge.low, .priority-bar.low { background: #e8f5e9; color: #2e7d32; }
    .priority-bar-wrap { flex: 1; height: 12px; background: #eee; border-radius: 6px; overflow: hidden; }
    .priority-bar { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
    .priority-count { width: 24px; text-align: right; font-weight: 600; }
    .loading-center { display: flex; justify-content: center; margin-top: 80px; }
  `],
})
export class TodoDashboardComponent implements OnInit {
  private todoService = inject(TodoService);
  summary$!: Observable<TodoSummary>;

  ngOnInit(): void {
    this.summary$ = this.todoService.getTodoSummary();
  }

  priorityItems(s: TodoSummary) {
    return [
      { label: 'High', class: 'high', count: s.byPriority.high },
      { label: 'Medium', class: 'medium', count: s.byPriority.medium },
      { label: 'Low', class: 'low', count: s.byPriority.low },
    ];
  }
}
