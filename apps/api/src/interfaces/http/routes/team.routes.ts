import { Router } from 'express'
import type { TeamController } from '../controllers/team.controller'

export function createTeamRouter(controller: TeamController): Router {
  const router = Router()

  router.get('/', controller.list)
  router.post('/', controller.create)
  router.get('/:id', controller.getById)
  router.put('/:id', controller.update)
  router.delete('/:id', controller.remove)

  return router
}
