import { Router } from 'express'
import type { TaskController } from '../controllers/task.controller'

export function createTaskRouter(controller: TaskController): Router {
  const router = Router()

  router.get('/', controller.list)
  router.post('/', controller.create)
  router.get('/:id', controller.getById)
  router.put('/:id', controller.update)

  router.patch('/:id/status', controller.changeStatus)
  router.delete('/:id', controller.remove)

  return router
}
