import Router from 'express'
import { getDashboard , getBrandsforDashboard,getDealersforDashboard, uploadSchedule, getRequests,getBDM, editSchedule , deleteReq} from '../controller/dashboardSchedulerController.js'
const router = Router()

router.route('/getdashboard').get(getDashboard)
router.route('/getbrands').post(getBrandsforDashboard)
router.route('/getdealers').post(getDealersforDashboard)
router.route('/setschedule').post(uploadSchedule)
router.route('/getbdm').post(getBDM)
router.route('/getrequests').get(getRequests)
router.route('/delrequest').post(deleteReq)
router.route('/editschedule').post(editSchedule)



export default  router