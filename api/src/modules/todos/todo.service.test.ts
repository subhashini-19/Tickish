import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as todoService from './todo.service';

// Why MongoMemoryReplSet instead of MongoMemoryServer?
// MongoDB transactions require a replica set — a standalone node rejects them.
// Atlas always runs as a replica set, so using MongoMemoryReplSet in tests
// matches production behaviour exactly. This is the same reason the error
// "Transaction numbers are only allowed on a replica set member" appears
// when you run transactions against a local standalone MongoDB.

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  // Clean up between tests — each test starts with a fresh slate
  await mongoose.connection.dropDatabase();
});

// ─── getTodos ────────────────────────────────────────────────────────────────

describe('getTodos', () => {
  it('returns an empty array when the user has no todos', async () => {
    const todos = await todoService.getTodos('user-1');
    expect(todos).toEqual([]);
  });

  it('returns only todos belonging to the requesting user', async () => {
    await todoService.createTodo('user-1', { title: 'User 1 task' });
    await todoService.createTodo('user-2', { title: 'User 2 task' });

    const todos = await todoService.getTodos('user-1');

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('User 1 task');
  });

  it('returns todos sorted newest first', async () => {
    await todoService.createTodo('user-1', { title: 'First' });
    await todoService.createTodo('user-1', { title: 'Second' });

    const todos = await todoService.getTodos('user-1');
    expect(todos[0].title).toBe('Second');
  });
});

// ─── createTodo ──────────────────────────────────────────────────────────────

describe('createTodo', () => {
  it('creates a todo with the correct userId and defaults', async () => {
    const todo = await todoService.createTodo('user-1', { title: 'Buy milk' });

    expect(todo.title).toBe('Buy milk');
    expect(todo.userId).toBe('user-1');
    expect(todo.completed).toBe(false);
    expect(todo.priority).toBe('medium');
    expect(todo.tags).toEqual([]);
  });

  it('creates a todo with all provided fields', async () => {
    const todo = await todoService.createTodo('user-1', {
      title: 'Submit report',
      description: 'Q4 financial summary',
      priority: 'high',
      tags: ['work', 'finance'],
    });

    expect(todo.description).toBe('Q4 financial summary');
    expect(todo.priority).toBe('high');
    expect(todo.tags).toContain('work');
  });
});

// ─── getTodoById ─────────────────────────────────────────────────────────────

describe('getTodoById', () => {
  it('returns a todo by id for the correct user', async () => {
    const created = await todoService.createTodo('user-1', { title: 'Test todo' });
    const found = await todoService.getTodoById(created._id.toString(), 'user-1');
    expect(found.title).toBe('Test todo');
  });

  it('throws 404 when todo does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(todoService.getTodoById(fakeId, 'user-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'TODO_NOT_FOUND',
    });
  });

  it('throws 404 when todo belongs to a different user', async () => {
    const created = await todoService.createTodo('user-1', { title: 'Private todo' });
    await expect(
      todoService.getTodoById(created._id.toString(), 'user-2')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── updateTodo ──────────────────────────────────────────────────────────────

describe('updateTodo', () => {
  it('updates specified fields only', async () => {
    const todo = await todoService.createTodo('user-1', { title: 'Original', priority: 'low' });

    const updated = await todoService.updateTodo(todo._id.toString(), 'user-1', {
      title: 'Updated',
    });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('low'); // unchanged
  });

  it('marks a todo as completed', async () => {
    const todo = await todoService.createTodo('user-1', { title: 'Task' });
    const updated = await todoService.updateTodo(todo._id.toString(), 'user-1', {
      completed: true,
    });
    expect(updated.completed).toBe(true);
  });
});

// ─── deleteTodo ──────────────────────────────────────────────────────────────

describe('deleteTodo', () => {
  it('deletes a todo successfully', async () => {
    const todo = await todoService.createTodo('user-1', { title: 'To delete' });
    await todoService.deleteTodo(todo._id.toString(), 'user-1');

    const todos = await todoService.getTodos('user-1');
    expect(todos).toHaveLength(0);
  });

  it('throws 404 when deleting a non-existent todo', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(todoService.deleteTodo(fakeId, 'user-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── bulkCompleteTodos (transaction) ─────────────────────────────────────────

describe('bulkCompleteTodos', () => {
  it('marks multiple todos as complete in one atomic operation', async () => {
    const t1 = await todoService.createTodo('user-1', { title: 'Task 1' });
    const t2 = await todoService.createTodo('user-1', { title: 'Task 2' });

    const count = await todoService.bulkCompleteTodos(
      [t1._id.toString(), t2._id.toString()],
      'user-1'
    );

    expect(count).toBe(2);

    const todos = await todoService.getTodos('user-1');
    expect(todos.every((t) => t.completed)).toBe(true);
  });

  it('throws when no matching todos are found', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      todoService.bulkCompleteTodos([fakeId], 'user-1')
    ).rejects.toMatchObject({ statusCode: 400, code: 'NOTHING_TO_UPDATE' });
  });
});
