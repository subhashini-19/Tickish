import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { Todo, TodoSummary, CreateTodoInput, UpdateTodoInput } from '../../shared/models/todo.model';
import {
  GET_TODOS, GET_TODO_SUMMARY, CREATE_TODO,
  UPDATE_TODO, DELETE_TODO, BULK_COMPLETE_TODOS
} from '../graphql/todo.queries';

// The service is the single point of contact between components and the API.
// Components never call Apollo directly — they call this service.
// This matches the pattern you'd use in a banking app where API calls need
// audit logging, error normalisation, or retry logic in one place.

@Injectable({ providedIn: 'root' })
export class TodoService {
  private apollo = inject(Apollo);

  getTodos(filters?: { completed?: boolean; priority?: string; tag?: string }): Observable<Todo[]> {
    return this.apollo
      .watchQuery<{ todos: Todo[] }>({
        query: GET_TODOS,
        variables: filters ?? {},
      })
      .valueChanges.pipe(map((result) => (result.data?.todos ?? []) as Todo[]));
  }

  getTodoSummary(): Observable<TodoSummary> {
    return this.apollo
      .watchQuery<{ todoSummary: TodoSummary }>({ query: GET_TODO_SUMMARY })
      .valueChanges.pipe(map((result) => result.data?.todoSummary as TodoSummary));
  }

  createTodo(input: CreateTodoInput): Observable<Todo> {
    return this.apollo
      .mutate<{ createTodo: Todo }>({
        mutation: CREATE_TODO,
        variables: { input },
        // Update the cache so the list refreshes without a network round-trip
        update: (cache, { data }) => {
          const existing = cache.readQuery<{ todos: Todo[] }>({ query: GET_TODOS, variables: {} });
          if (existing && data?.createTodo) {
            cache.writeQuery({
              query: GET_TODOS,
              variables: {},
              data: { todos: [data.createTodo, ...existing.todos] },
            });
          }
        },
        refetchQueries: [{ query: GET_TODO_SUMMARY }],
      })
      .pipe(map((result) => result.data!.createTodo));
  }

  updateTodo(id: string, input: UpdateTodoInput): Observable<Todo> {
    return this.apollo
      .mutate<{ updateTodo: Todo }>({
        mutation: UPDATE_TODO,
        variables: { id, input },
        refetchQueries: [{ query: GET_TODO_SUMMARY }],
      })
      .pipe(map((result) => result.data!.updateTodo));
  }

  deleteTodo(id: string): Observable<boolean> {
    return this.apollo
      .mutate<{ deleteTodo: boolean }>({
        mutation: DELETE_TODO,
        variables: { id },
        update: (cache) => {
          const existing = cache.readQuery<{ todos: Todo[] }>({ query: GET_TODOS, variables: {} });
          if (existing) {
            cache.writeQuery({
              query: GET_TODOS,
              variables: {},
              data: { todos: existing.todos.filter((t) => t.id !== id) },
            });
          }
        },
        refetchQueries: [{ query: GET_TODO_SUMMARY }],
      })
      .pipe(map((result) => result.data!.deleteTodo));
  }

  bulkComplete(ids: string[]): Observable<number> {
    return this.apollo
      .mutate<{ bulkCompleteTodos: number }>({
        mutation: BULK_COMPLETE_TODOS,
        variables: { ids },
        refetchQueries: [{ query: GET_TODOS, variables: {} }, { query: GET_TODO_SUMMARY }],
      })
      .pipe(map((result) => result.data!.bulkCompleteTodos));
  }
}
