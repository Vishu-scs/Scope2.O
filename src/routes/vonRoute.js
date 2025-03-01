import Router from 'express'
import {remarkMaster, adminView, userFeedbacklog, userView, userViewLog, newRemark, viewRemark } from '../controller/vonController.js'
const router = Router()

router.route('/remark').post(remarkMaster)
router.route('/newremark').post(newRemark)
router.route('/viewremark').post(viewRemark)

router.route('/viewuser').post(userView)
router.route('/userlog').post(userFeedbacklog)
router.route('/userviewlog').post(userViewLog)

router.route('/viewadmin').post(adminView)

export default router