import Router from 'express'
const router = Router()
import { getBrands,getDashboard,getDealers,getLocation, getWorkspace } from '../controller/MasterApiController.js'

router.route('/brands').get(getBrands)
router.route('/dealers').post(getDealers)
router.route('/locations').post(getLocation)
router.route('/workspaces').get(getWorkspace)
router.route('/dashboards').get(getDashboard)


export default router