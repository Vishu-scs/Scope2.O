import Router from 'express'
import { partNature , model} from '../controller/vonController.js'
const router = Router()

router.route('/nature').get(partNature)
router.route('/model').post(model)

export default router