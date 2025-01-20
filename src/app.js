import express  from 'express'
import cors from 'cors'
import { scheduleTask } from './controller/dashboardSchedulerController.js'

import dashboardSchedule from './routes/dashboardSchedulerRoute.js'

const app = express()
app.use(cors())
app.use(express.json());

scheduleTask()


app.use("/api/v1/dashboardscheduler", dashboardSchedule)



export  {app}