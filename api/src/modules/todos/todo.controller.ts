import { Request, Response } from 'express';
import * as todoService from './todo.service';
import { createTodoSchema, updateTodoSchema } from './todo.validator';
import { AppError } from '../../middleware/errorHandler';

// Controllers are thin — they handle HTTP concerns only:
// parse request → validate → call service → format response.
// No business logic lives here.

// Helper to extract the userId from the JWT (injected by auth middleware later).
// Falls back to a default during early development before auth is wired up.
function getUserId(req: Request): string {
  return (req as any).user?.oid || 'dev-user';
}

function getParam(req: Request, name: string): string {
  return req.params[name] as string;
}

export async function getAll(req: Request, res: Response) {
  const todos = await todoService.getTodos(getUserId(req));
  res.json(todos);
}

export async function getOne(req: Request, res: Response) {
  const todo = await todoService.getTodoById(getParam(req, 'id'), getUserId(req));
  res.json(todo);
}

export async function create(req: Request, res: Response) {
  const { error, value } = createTodoSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw new AppError(
      error.details.map((d) => d.message).join(', '),
      400,
      'VALIDATION_ERROR'
    );
  }
  const todo = await todoService.createTodo(getUserId(req), value);
  res.status(201).json(todo);
}

export async function update(req: Request, res: Response) {
  const { error, value } = updateTodoSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw new AppError(
      error.details.map((d) => d.message).join(', '),
      400,
      'VALIDATION_ERROR'
    );
  }
  const todo = await todoService.updateTodo(getParam(req, 'id'), getUserId(req), value);
  res.json(todo);
}

export async function remove(req: Request, res: Response) {
  await todoService.deleteTodo(getParam(req, 'id'), getUserId(req));
  res.status(204).send();
}

export async function bulkComplete(req: Request, res: Response) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('ids must be a non-empty array', 400, 'VALIDATION_ERROR');
  }
  const count = await todoService.bulkCompleteTodos(ids, getUserId(req));
  res.json({ message: `${count} todo(s) marked as complete` });
}
