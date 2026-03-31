import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable, switchMap, combineLatest, startWith, map } from 'rxjs';
import { TodoService } from '../../../core/services/todo.service';
import { Todo, Priority } from '../../../shared/models/todo.model';
import { TodoFormComponent, TodoFormData } from '../todo-form/todo-form.component';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule,
  ],
  template: `
    <div class="list-header">
      <h1>My Todos</h1>
      <button mat-fab color="primary" (click)="openCreateDialog()" matTooltip="New Todo">
        <mat-icon>add</mat-icon>
      </button>
    </div>

    <!-- Filters -->
    <mat-card class="filters-card">
      <mat-card-content>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [formControl]="statusFilter">
            <mat-option [value]="null">All</mat-option>
            <mat-option [value]="false">Pending</mat-option>
            <mat-option [value]="true">Completed</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select [formControl]="priorityFilter">
            <mat-option [value]="null">All</mat-option>
            <mat-option value="high">High</mat-option>
            <mat-option value="medium">Medium</mat-option>
            <mat-option value="low">Low</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button
          *ngIf="selectedIds().length > 0"
          (click)="bulkComplete()"
          color="accent">
          <mat-icon>done_all</mat-icon>
          Complete {{ selectedIds().length }} selected
        </button>
      </mat-card-content>
    </mat-card>

    <ng-container *ngIf="todos$ | async as todos; else loading">
      <div *ngIf="todos.length === 0" class="empty-state">
        <mat-icon>check_circle_outline</mat-icon>
        <p>No todos here. Create one!</p>
      </div>

      <mat-card *ngFor="let todo of todos" class="todo-card" [class.completed]="todo.completed">
        <mat-card-content>
          <div class="todo-row">
            <mat-checkbox
              [checked]="isSelected(todo.id)"
              (change)="toggleSelect(todo.id)"
              class="select-box"
            />

            <div class="todo-main" (click)="toggleComplete(todo)">
              <div class="todo-title" [class.strike]="todo.completed">{{ todo.title }}</div>
              <div class="todo-meta">
                <span class="priority-chip" [class]="todo.priority">{{ todo.priority }}</span>
                <span *ngIf="todo.dueDate" class="due-date">
                  <mat-icon inline>event</mat-icon>
                  {{ todo.dueDate | date:'MMM d' }}
                </span>
                <mat-chip *ngFor="let tag of todo.tags" class="tag-chip">{{ tag }}</mat-chip>
              </div>
              <div *ngIf="todo.description" class="todo-desc">{{ todo.description }}</div>
            </div>

            <div class="todo-actions">
              <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu>
                <button mat-menu-item (click)="openEditDialog(todo)">
                  <mat-icon>edit</mat-icon> Edit
                </button>
                <button mat-menu-item (click)="toggleComplete(todo)">
                  <mat-icon>{{ todo.completed ? 'undo' : 'check' }}</mat-icon>
                  {{ todo.completed ? 'Mark Pending' : 'Mark Complete' }}
                </button>
                <button mat-menu-item (click)="deleteTodo(todo)" class="delete-item">
                  <mat-icon color="warn">delete</mat-icon> Delete
                </button>
              </mat-menu>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </ng-container>

    <ng-template #loading>
      <div class="loading-center"><mat-spinner diameter="48" /></div>
    </ng-template>
  `,
  styles: [`
    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h1 { margin: 0; }
    .filters-card { margin-bottom: 16px; }
    .filters-card mat-card-content { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 12px 16px; }
    .filters-card mat-form-field { margin-bottom: -1.25em; }
    .todo-card { margin-bottom: 12px; transition: opacity 0.2s; }
    .todo-card.completed { opacity: 0.6; }
    .todo-row { display: flex; align-items: flex-start; gap: 8px; }
    .select-box { padding-top: 2px; }
    .todo-main { flex: 1; cursor: pointer; }
    .todo-title { font-size: 1rem; font-weight: 500; }
    .todo-title.strike { text-decoration: line-through; color: #999; }
    .todo-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
    .priority-chip { padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .priority-chip.high { background: #ffcdd2; color: #c62828; }
    .priority-chip.medium { background: #fff3e0; color: #e65100; }
    .priority-chip.low { background: #e8f5e9; color: #2e7d32; }
    .due-date { font-size: 0.8rem; color: #666; display: flex; align-items: center; gap: 2px; }
    .tag-chip { font-size: 0.75rem !important; min-height: 22px !important; }
    .todo-desc { font-size: 0.85rem; color: #666; margin-top: 4px; }
    .todo-actions { flex-shrink: 0; }
    .delete-item { color: #c62828; }
    .empty-state { text-align: center; padding: 60px 0; color: #999; }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; }
    .loading-center { display: flex; justify-content: center; margin-top: 80px; }
  `],
})
export class TodoListComponent implements OnInit {
  private todoService = inject(TodoService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  statusFilter = new FormControl<boolean | null>(null);
  priorityFilter = new FormControl<Priority | null>(null);

  // Signals for selection state — Angular 17 signals are reactive primitives,
  // like a simpler version of BehaviorSubject for local component state
  selectedIds = signal<string[]>([]);
  pendingIds = computed(() => this.selectedIds());

  todos$!: Observable<Todo[]>;

  ngOnInit(): void {
    // combineLatest merges two observables — emits when either filter changes.
    // switchMap cancels the previous query and fires a new one.
    // This is idiomatic RxJS for dependent async calls.
    this.todos$ = combineLatest([
      this.statusFilter.valueChanges.pipe(startWith(null)),
      this.priorityFilter.valueChanges.pipe(startWith(null)),
    ]).pipe(
      switchMap(([completed, priority]) =>
        this.todoService.getTodos({
          completed: completed ?? undefined,
          priority: priority ?? undefined,
        })
      )
    );
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSelect(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    );
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(TodoFormComponent, {
      data: {} as TodoFormData,
      width: '560px',
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.todoService.createTodo(result).subscribe({
        next: () => this.notify('Todo created'),
        error: () => this.notify('Failed to create todo', true),
      });
    });
  }

  openEditDialog(todo: Todo): void {
    const ref = this.dialog.open(TodoFormComponent, {
      data: { todo } as TodoFormData,
      width: '560px',
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.todoService.updateTodo(todo.id, result).subscribe({
        next: () => this.notify('Todo updated'),
        error: () => this.notify('Failed to update todo', true),
      });
    });
  }

  toggleComplete(todo: Todo): void {
    this.todoService.updateTodo(todo.id, { completed: !todo.completed }).subscribe({
      next: () => this.notify(todo.completed ? 'Marked as pending' : 'Marked as complete'),
      error: () => this.notify('Failed to update todo', true),
    });
  }

  deleteTodo(todo: Todo): void {
    this.todoService.deleteTodo(todo.id).subscribe({
      next: () => this.notify('Todo deleted'),
      error: () => this.notify('Failed to delete todo', true),
    });
  }

  bulkComplete(): void {
    const ids = this.selectedIds();
    this.todoService.bulkComplete(ids).subscribe({
      next: (count) => {
        this.notify(`${count} todo(s) marked complete`);
        this.selectedIds.set([]);
      },
      error: () => this.notify('Bulk complete failed', true),
    });
  }

  private notify(message: string, isError = false): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 3000,
      panelClass: isError ? ['snack-error'] : [],
    });
  }
}
