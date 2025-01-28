import Router from 'express'
import { getBrands,  getDealers, getLedgerbyPartid, getLocation, partDetails } from '../controller/salesViewController.js'

const router = Router()

router.route('/brands').get(getBrands)
router.route('/dealers').post(getDealers)
router.route('/location').post(getLocation)
router.route('/partdetails').post(partDetails)
router.route('/ledger').post(getLedgerbyPartid)


export default router