import { EventEmitter } from 'events';
import { logger } from '../middleware/logger';
import { ITodo } from '../modules/todos/todo.model';

// Event-driven architecture using Node's built-in EventEmitter.
// The idea: when something meaningful happens (todo completed, todo created),
// we emit an event. Other parts of the system react without the service needing
// to know about them. This is the same pub/sub pattern used in message brokers
// like Azure Service Bus — just in-process for now.
// In a microservices setup, you'd replace this emit() call with a Service Bus publish.

class TodoEventEmitter extends EventEmitter {}

export const todoEvents = new TodoEventEmitter();

export const TODO_EVENTS = {
  CREATED: 'todo.created',
  UPDATED: 'todo.updated',
  COMPLETED: 'todo.completed',
  DELETED: 'todo.deleted',
} as const;

// Listeners — react to events (analytics, notifications, audit log, etc.)
todoEvents.on(TODO_EVENTS.CREATED, (todo: ITodo) => {
  logger.info('Todo created event', { todoId: todo._id, userId: todo.userId, title: todo.title });
});

todoEvents.on(TODO_EVENTS.COMPLETED, (todo: ITodo) => {
  logger.info('Todo completed event', { todoId: todo._id, userId: todo.userId });
  // In a real banking app: trigger a workflow, send a notification, write an audit record
});

todoEvents.on(TODO_EVENTS.DELETED, (payload: { todoId: string; userId: string }) => {
  logger.info('Todo deleted event', payload);
});
