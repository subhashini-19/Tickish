import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { resolvers, GraphQLContext } from './resolvers';
import * as todoService from '../modules/todos/todo.service';

// Resolver tests call resolvers directly as plain functions — no HTTP, no Apollo server.
// This is the fastest and most focused way to test resolver logic.
// The resolver unit tests for the service layer run alongside the service tests.

let replSet: MongoMemoryReplSet;
const ctx: GraphQLContext = { userId: 'resolver-test-user' };

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

// ─── Query.todos ─────────────────────────────────────────────────────────────

describe('Query.todos', () => {
  it('returns all todos for the user', async () => {
    await todoService.createTodo(ctx.userId, { title: 'A' });
    await todoService.createTodo(ctx.userId, { title: 'B' });

    const todos = await resolvers.Query.todos(undefined, {}, ctx);
    expect(todos).toHaveLength(2);
  });

  it('filters by completed status', async () => {
    await todoService.createTodo(ctx.userId, { title: 'Done' });
    const pending = await todoService.createTodo(ctx.userId, { title: 'Pending' });
    await todoService.updateTodo(pending._id.toString(), ctx.userId, { completed: true });

    const result = await resolvers.Query.todos(undefined, { completed: false }, ctx);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Done');
  });

  it('filters by priority', async () => {
    await todoService.createTodo(ctx.userId, { title: 'Low', priority: 'low' });
    await todoService.createTodo(ctx.userId, { title: 'High', priority: 'high' });

    const result = await resolvers.Query.todos(undefined, { priority: 'high' }, ctx);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('High');
  });

  it('filters by tag', async () => {
    await todoService.createTodo(ctx.userId, { title: 'Work', tags: ['work'] });
    await todoService.createTodo(ctx.userId, { title: 'Personal', tags: ['personal'] });

    const result = await resolvers.Query.todos(undefined, { tag: 'work' }, ctx);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Work');
  });
});

// ─── Query.todoSummary ───────────────────────────────────────────────────────

describe('Query.todoSummary', () => {
  it('returns correct aggregate counts', async () => {
    const t1 = await todoService.createTodo(ctx.userId, { title: 'T1', priority: 'high' });
    await todoService.createTodo(ctx.userId, { title: 'T2', priority: 'low' });
    await todoService.updateTodo(t1._id.toString(), ctx.userId, { completed: true });

    const summary = await resolvers.Query.todoSummary(undefined, undefined, ctx);

    expect(summary.total).toBe(2);
    expect(summary.completed).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.byPriority.high).toBe(1);
    expect(summary.byPriority.low).toBe(1);
    expect(summary.byPriority.medium).toBe(0);
  });
});

// ─── Mutation.createTodo ─────────────────────────────────────────────────────

describe('Mutation.createTodo', () => {
  it('creates a todo and returns it with an id field', async () => {
    const result = await resolvers.Mutation.createTodo(
      undefined,
      { input: { title: 'GraphQL todo', priority: 'high' } },
      ctx
    );

    expect(result.id).toBeDefined();       // id (string), not _id (ObjectId)
    expect(result.title).toBe('GraphQL todo');
    expect(result.priority).toBe('high');
  });
});

// ─── Mutation.updateTodo ─────────────────────────────────────────────────────

describe('Mutation.updateTodo', () => {
  it('updates a todo', async () => {
    const todo = await todoService.createTodo(ctx.userId, { title: 'Old title' });

    const result = await resolvers.Mutation.updateTodo(
      undefined,
      { id: todo._id.toString(), input: { title: 'New title', completed: true } },
      ctx
    );

    expect(result.title).toBe('New title');
    expect(result.completed).toBe(true);
  });
});

// ─── Mutation.deleteTodo ─────────────────────────────────────────────────────

describe('Mutation.deleteTodo', () => {
  it('deletes a todo and returns true', async () => {
    const todo = await todoService.createTodo(ctx.userId, { title: 'To delete' });

    const result = await resolvers.Mutation.deleteTodo(
      undefined,
      { id: todo._id.toString() },
      ctx
    );

    expect(result).toBe(true);
    const remaining = await todoService.getTodos(ctx.userId);
    expect(remaining).toHaveLength(0);
  });
});
