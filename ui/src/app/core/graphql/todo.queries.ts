import { gql } from 'apollo-angular';

// Keeping queries in a dedicated file means they're easy to find and reuse.
// Each gql tagged template is parsed at build time by Apollo tooling.

export const GET_TODOS = gql`
  query GetTodos($completed: Boolean, $priority: Priority, $tag: String) {
    todos(completed: $completed, priority: $priority, tag: $tag) {
      id
      title
      description
      completed
      priority
      dueDate
      tags
      createdAt
    }
  }
`;

export const GET_TODO_SUMMARY = gql`
  query GetTodoSummary {
    todoSummary {
      total
      completed
      pending
      byPriority {
        low
        medium
        high
      }
    }
  }
`;

export const CREATE_TODO = gql`
  mutation CreateTodo($input: CreateTodoInput!) {
    createTodo(input: $input) {
      id
      title
      description
      completed
      priority
      dueDate
      tags
      createdAt
    }
  }
`;

export const UPDATE_TODO = gql`
  mutation UpdateTodo($id: ID!, $input: UpdateTodoInput!) {
    updateTodo(id: $id, input: $input) {
      id
      title
      description
      completed
      priority
      dueDate
      tags
      updatedAt
    }
  }
`;

export const DELETE_TODO = gql`
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id)
  }
`;

export const BULK_COMPLETE_TODOS = gql`
  mutation BulkCompleteTodos($ids: [ID!]!) {
    bulkCompleteTodos(ids: $ids)
  }
`;
