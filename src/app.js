import express  from 'express'
import cors from 'cors'
import { scheduleTask } from './controller/dashboardSchedulerController.js'

import dashboardSchedule from './routes/dashboardSchedulerRoute.js'
import salesView from './routes/salesViewRoute.js'
import MasterApi from './routes/MasterApiRoute.js'
import von from './routes/vonRoute.js'
const app = express()
app.use(cors())
app.use(express.json());

scheduleTask()



app.use("/api/v1/master", MasterApi)
app.use("/api/v1/dashboardscheduler", dashboardSchedule)
app.use("/api/v1/salesview", salesView)
app.use("/api/v1/von",von)



export  {app}


