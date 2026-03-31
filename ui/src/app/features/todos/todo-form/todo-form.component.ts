import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Todo } from '../../../shared/models/todo.model';

export interface TodoFormData {
  todo?: Todo; // undefined = create mode, defined = edit mode
}

// Typed Reactive Forms — Angular 14+ feature.
// TypeScript knows the shape of the form value at compile time.
// This is the pattern you'd use in a KYC onboarding form where fields
// map directly to a domain model.

@Component({
  selector: 'app-todo-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Todo' : 'New Todo' }}</h2>

    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Title</mat-label>
        <input matInput formControlName="title" placeholder="What needs to be done?" />
        <mat-error *ngIf="form.get('title')?.hasError('required')">Title is required</mat-error>
        <mat-error *ngIf="form.get('title')?.hasError('maxlength')">Max 200 characters</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Description</mat-label>
        <textarea matInput formControlName="description" rows="3" placeholder="Optional details"></textarea>
      </mat-form-field>

      <div class="row-fields">
        <mat-form-field appearance="outline" class="half-width">
          <mat-label>Priority</mat-label>
          <mat-select formControlName="priority">
            <mat-option value="low">Low</mat-option>
            <mat-option value="medium">Medium</mat-option>
            <mat-option value="high">High</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="half-width">
          <mat-label>Due Date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="dueDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Tags</mat-label>
        <mat-chip-grid #chipGrid>
          <mat-chip-row *ngFor="let tag of tags" (removed)="removeTag(tag)">
            {{ tag }}
            <button matChipRemove><mat-icon>cancel</mat-icon></button>
          </mat-chip-row>
          <input
            placeholder="Add tag..."
            [matChipInputFor]="chipGrid"
            [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
            (matChipInputTokenEnd)="addTag($event)"
          />
        </mat-chip-grid>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        {{ isEdit ? 'Save' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { display: flex; flex-direction: column; gap: 4px; min-width: 480px; padding-top: 8px; }
    .full-width { width: 100%; }
    .row-fields { display: flex; gap: 16px; }
    .half-width { flex: 1; }
  `],
})
export class TodoFormComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TodoFormComponent>);

  data: TodoFormData = inject(MAT_DIALOG_DATA);
  isEdit = !!this.data?.todo;
  separatorKeysCodes = [ENTER, COMMA];
  tags: string[] = this.data?.todo?.tags ? [...this.data.todo.tags] : [];

  form = this.fb.group({
    title: [this.data?.todo?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.data?.todo?.description ?? ''],
    priority: [this.data?.todo?.priority ?? 'medium'],
    dueDate: [this.data?.todo?.dueDate ? new Date(this.data.todo.dueDate) : null],
  });

  addTag(event: any): void {
    const value = (event.value ?? '').trim();
    if (value && !this.tags.includes(value) && this.tags.length < 10) {
      this.tags.push(value);
    }
    event.chipInput?.clear();
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  submit(): void {
    if (this.form.invalid) return;
    const { title, description, priority, dueDate } = this.form.getRawValue();
    this.dialogRef.close({
      title: title!,
      description: description || undefined,
      priority: priority as 'low' | 'medium' | 'high',
      dueDate: dueDate ? (dueDate as Date).toISOString() : undefined,
      tags: this.tags,
    });
  }
}
