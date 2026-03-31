import * as todoService from '../modules/todos/todo.service';
import { ITodo } from '../modules/todos/todo.model';
import { AppError } from '../middleware/errorHandler';

// Context is injected into every resolver — it carries the authenticated user.
// This is how GraphQL auth works: the Apollo Server context function extracts
// req.user (already validated by the auth middleware) and passes it here.
export interface GraphQLContext {
  userId: string;
}

// Resolvers map 1:1 to the schema's Query and Mutation fields.
// Each resolver receives: (parent, args, context, info)
// - parent: result from the parent resolver (used in nested types)
// - args: the arguments from the query/mutation
// - context: our GraphQLContext with userId
export const resolvers = {
  Query: {
    // Flexible filtering — a single query replaces multiple REST endpoints
    todos: async (
      _: unknown,
      args: { completed?: boolean; priority?: string; tag?: string },
      ctx: GraphQLContext
    ) => {
      const todos = await todoService.getTodos(ctx.userId);

      // Filter in-memory after fetch — fine for a todo app.
      // In a high-scale system you'd push filters into the MongoDB query.
      let result = todos;
      if (args.completed !== undefined) {
        result = result.filter((t) => t.completed === args.completed);
      }
      if (args.priority) {
        result = result.filter((t) => t.priority === args.priority);
      }
      if (args.tag) {
        result = result.filter((t) => t.tags.includes(args.tag!));
      }
      return result.map(mapTodo);
    },

    todo: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const todo = await todoService.getTodoById(args.id, ctx.userId);
      return mapTodo(todo);
    },

    // Aggregate query — this is where GraphQL shines over REST.
    // One request, shaped exactly how the dashboard UI needs it.
    todoSummary: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const todos = await todoService.getTodos(ctx.userId);
      const completed = todos.filter((t) => t.completed).length;
      return {
        total: todos.length,
        completed,
        pending: todos.length - completed,
        byPriority: {
          low: todos.filter((t) => t.priority === 'low').length,
          medium: todos.filter((t) => t.priority === 'medium').length,
          high: todos.filter((t) => t.priority === 'high').length,
        },
      };
    },
  },

  Mutation: {
    createTodo: async (
      _: unknown,
      args: { input: todoService.CreateTodoDto },
      ctx: GraphQLContext
    ) => {
      const todo = await todoService.createTodo(ctx.userId, args.input);
      return mapTodo(todo);
    },

    updateTodo: async (
      _: unknown,
      args: { id: string; input: todoService.UpdateTodoDto },
      ctx: GraphQLContext
    ) => {
      const todo = await todoService.updateTodo(args.id, ctx.userId, args.input);
      return mapTodo(todo);
    },

    deleteTodo: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      await todoService.deleteTodo(args.id, ctx.userId);
      return true;
    },

    bulkCompleteTodos: async (
      _: unknown,
      args: { ids: string[] },
      ctx: GraphQLContext
    ) => {
      return todoService.bulkCompleteTodos(args.ids, ctx.userId);
    },
  },
};

// Map Mongoose document to plain GraphQL-friendly object.
// Mongoose documents have _id (ObjectId), GraphQL expects id (string).
function mapTodo(todo: ITodo) {
  return {
    id: todo._id.toString(),
    userId: todo.userId,
    title: todo.title,
    description: todo.description,
    completed: todo.completed,
    priority: todo.priority,
    dueDate: todo.dueDate?.toISOString() ?? null,
    tags: todo.tags,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}
