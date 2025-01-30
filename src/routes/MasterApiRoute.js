import Router from 'express'
const router = Router()
import { getBrands,getDealers,getLocation } from '../controller/MasterApiController.js'

router.route('/brands').get(getBrands)
router.route('/dealers').post(getDealers)
router.route('/locations').post(getLocation)

export default router