import Router from 'express'
import { viewMax } from '../controller/vonController.js'
const router = Router()

router.route('/view').post(viewMax)

export default router