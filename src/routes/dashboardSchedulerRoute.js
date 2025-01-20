import Router from 'express'
import { getDashboard , getBrandsforDashboard,getDealersforDashboard, uploadSchedule, getRequests,getBDM, editSchedule} from '../controller/dashboardSchedulerController.js'
const router = Router()

router.route('/getdashboard').get(getDashboard)
router.route('/getbrands').post(getBrandsforDashboard)
router.route('/getdealers').post(getDealersforDashboard)
router.route('/setschedule').post(uploadSchedule)
router.route('/getbdm').post(getBDM)
router.route('/getrequests').get(getRequests)
router.route('/editschedule/:bintid_pk').post(editSchedule)



export default  router