import mongoose from 'mongoose';
import { Todo, ITodo } from './todo.model';
import { AppError } from '../../middleware/errorHandler';
import { todoEvents, TODO_EVENTS } from '../../events/todoEvents';

// The service layer holds all business logic.
// Controllers call the service; the service calls the model.
// This separation is what makes TDD easy — you test the service directly,
// without needing HTTP.

export interface CreateTodoDto {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTodoDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | null;
  tags?: string[];
}

export async function getTodos(userId: string): Promise<ITodo[]> {
  return Todo.find({ userId }).sort({ createdAt: -1 });
}

export async function getTodoById(id: string, userId: string): Promise<ITodo> {
  const todo = await Todo.findOne({ _id: id, userId });
  if (!todo) throw new AppError('Todo not found', 404, 'TODO_NOT_FOUND');
  return todo;
}

export async function createTodo(userId: string, dto: CreateTodoDto): Promise<ITodo> {
  const todo = await Todo.create({ ...dto, userId });
  todoEvents.emit(TODO_EVENTS.CREATED, todo);
  return todo;
}

export async function updateTodo(id: string, userId: string, dto: UpdateTodoDto): Promise<ITodo> {
  const todo = await Todo.findOneAndUpdate(
    { _id: id, userId },
    { $set: dto },
    { new: true, runValidators: true } // new:true returns updated doc; runValidators re-runs schema validation
  );

  if (!todo) throw new AppError('Todo not found', 404, 'TODO_NOT_FOUND');

  if (dto.completed === true) {
    todoEvents.emit(TODO_EVENTS.COMPLETED, todo);
  } else {
    todoEvents.emit(TODO_EVENTS.UPDATED, todo);
  }

  return todo;
}

export async function deleteTodo(id: string, userId: string): Promise<void> {
  const result = await Todo.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw new AppError('Todo not found', 404, 'TODO_NOT_FOUND');
  todoEvents.emit(TODO_EVENTS.DELETED, { todoId: id, userId });
}

// --- Transaction example ---
// Bulk complete: marks multiple todos as done atomically.
// If any step fails, the whole operation rolls back — nothing is partially saved.
// This is a key MongoDB interview topic: multi-document transactions require a replica set,
// which Atlas provides out of the box.
export async function bulkCompleteTodos(ids: string[], userId: string): Promise<number> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const result = await Todo.updateMany(
      { _id: { $in: ids }, userId, completed: false },
      { $set: { completed: true } },
      { session } // passing session opts this operation into the transaction
    );

    // Business rule: if none were updated, treat it as a client error
    if (result.modifiedCount === 0) {
      throw new AppError('No matching todos to complete', 400, 'NOTHING_TO_UPDATE');
    }

    await session.commitTransaction();
    return result.modifiedCount;
  } catch (error) {
    await session.abortTransaction(); // rollback — all changes within the session are undone
    throw error;
  } finally {
    session.endSession();
  }
}
