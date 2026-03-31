import { Router, IRouter } from 'express';
import * as todoController from './todo.controller';

export const todoRoutes: IRouter = Router();

todoRoutes.get('/', todoController.getAll);
todoRoutes.get('/:id', todoController.getOne);
todoRoutes.post('/', todoController.create);
todoRoutes.patch('/:id', todoController.update);
todoRoutes.delete('/:id', todoController.remove);
todoRoutes.post('/bulk-complete', todoController.bulkComplete);
