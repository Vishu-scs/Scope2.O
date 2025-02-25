import Router from 'express'
import { userFeedbacklog, viewMax } from '../controller/vonController.js'
const router = Router()

router.route('/view').post(viewMax)
router.route('/userlog').post(userFeedbacklog)

export default router