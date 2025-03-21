import Router from 'express'
import {remarkMaster, adminView, userFeedbacklog, userView, viewLog, newRemark, viewRemark, adminFeedbackLog, partFamily, countPending, partFamilySale } from '../controller/vonController.js'
const router = Router()

router.route('/remark').post(remarkMaster)
router.route('/newremark').post(newRemark)
router.route('/viewremark').post(viewRemark)

router.route('/viewuser').post(userView)
router.route('/userlog').post(userFeedbacklog)
router.route('/viewlog').post(viewLog)

router.route('/viewadmin').post(adminView)
router.route('/adminlog').post(adminFeedbackLog)

router.route('/partfamily').post(partFamily)
router.route('/countpending').get(countPending)
router.route('/partfamilysale').post(partFamilySale)
export default router