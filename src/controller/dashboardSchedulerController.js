import sql from 'mssql'
import {getPool} from '../db/db.js'
import dataValidator from '../utils/dataValidation.js'
import cron from 'node-cron'
import {refreshBenchmarking, refreshPPNI, refreshSI, refreshTOPS, refreshCID, refreshSpecialList} from '../utils/refreshDashboard.js'

const getDashboard = async(req,res)=>{
    const pool = await getPool();
    
try {  
      const query = ` use [z_scope] select tCode,Dashboard from DB_DashboardMaster where status = 1`
      const result = await pool.request().query(query)
      
      return res.status(200).json({Data:result.recordset})
} catch (error) {
  if(error.message=== `Invalid object name'DB_DashboardMaster'.`){
    console.log(`Something Wrong`);
    
  }
     console.log(error.message);
     
    res.status(500).json({details:error.message})
}
}
const getBrandsforDashboard = async (req, res) => {
  const pool = await getPool();
  try {
    const { DashboardCode } = req.body;

    // Validate that DashboardCodes is an array and not empty
    if (!Array.isArray(DashboardCode) || DashboardCode.length === 0) {
      return res.status(400).json({ error: "DashboardCodes must be a non-empty array." });
    }

    // Construct a dynamic query with placeholders for each DashboardCode
    const placeholders = DashboardCode.map((_, index) => `@DashboardCode${index}`).join(', ');
    const query = `
      USE [z_scope];
      SELECT li.brand, li.brandid
      FROM [dbo].[DB_DashboardLocMapping] dlm
      JOIN locationinfo li ON li.locationid = dlm.LocationID
      WHERE dlm.DashboardCode IN (${placeholders}) and li.ogsstatus = 1 and li.status =1 and dlm.status = 1
      GROUP BY li.brand, li.brandid
      HAVING COUNT(DISTINCT dlm.DashboardCode) = @TotalDashboardCodes
      ORDER BY li.brandid;
    `;

    // Bind each DashboardCode to a parameter
    const request = pool.request();
    DashboardCode.forEach((code, index) => {
      request.input(`DashboardCode${index}`, sql.Int, code);
    });

    // Bind the total count of DashboardCodes
    request.input("TotalDashboardCodes", sql.Int, DashboardCode.length);

    const result = await request.query(query);

    // Respond with the result
    res.status(200).json({Brands:result.recordset });
  } catch (error) {
    console.error("Error fetching common brands for dashboards:", error.message);
    res.status(500).send(error.message);
  }
};
const getDealersforDashboard = async(req,res)=>{
const pool = await getPool();
try {
  const {DashboardCode,brandid} = req.body

  if (!Array.isArray(DashboardCode) || DashboardCode.length === 0) {
    return res.status(400).json({ error: "DashboardCodes must be a non-empty array." });
  }
  const placeholders = DashboardCode.map((_, index) => `@DashboardCode${index}`).join(', ');
  const query =`USE [z_scope];
      SELECT li.dealer, li.dealerid
      FROM [dbo].[DB_DashboardLocMapping] dlm
      JOIN locationinfo li ON li.locationid = dlm.LocationID
      WHERE dlm.DashboardCode IN (${placeholders}) and brandid = @brandid and li.ogsstatus = 1 and li.status =1 and dlm.status = 1
	  GROUP BY li.dealer, li.dealerid
      HAVING COUNT(DISTINCT dlm.DashboardCode) = @TotalDashboardCodes 
	  ORDER BY li.dealerid;`
  // const result = await pool.request().input('brandid',sql.Int,brandid).input('DashboardCode',sql.Int,DashboardCode).query(query)
  // console.log(result.recordset);

  const request = pool.request();
    DashboardCode.forEach((code, index) => {
      request.input(`DashboardCode${index}`, sql.Int, code);
    });

    // Bind the total count of DashboardCodes
    request.input("TotalDashboardCodes", sql.Int, DashboardCode.length);

    const result = await request.input('brandid',sql.Int,brandid).query(query);

  res.status(200).json({Dealers:result.recordset})
} catch (error) {
  res.status(500).send(error.message)
}

}
const uploadSchedule = async (req, res) => {
    const pool = getPool();
    try {
      const {dashboardcodes, brandid, brand, dealer, dealerid, scheduledon, addedby } = req.body;
      if(!addedby){
        res.status(400).send(`Userid is Required`)
      }

      let query = `use [z_scope] select designation , isBDM from adminmaster_gen where bintid_pk = @addedby`
      const result = await pool.request().input('addedby',sql.Int,addedby).query(query)
      let isUserValid;
      if(result.recordset[0].designation == 5 || result.recordset[0].isBDM == 'Y'){
         isUserValid = true;
      }else{
        isUserValid = false;
      }
      // console.log(`User isValid -> ${isUserValid}`);
      
      
      // Validate dashboardcodes as an array
      if (isUserValid) {
        let parsedDashboardCodes;
        try {
          parsedDashboardCodes = JSON.parse(JSON.stringify(dashboardcodes)); // Ensure it's a proper array
          if (!Array.isArray(parsedDashboardCodes) || parsedDashboardCodes.length === 0) {
            throw new Error("Invalid dashboardcodes format.");
          }
        } catch (err) {
          return res.status(400).json({ error: "Invalid or missing dashboardcodes. It must be a JSON array." });
        }
    
        // Validate other required fields
        if (!brandid || !brand || !dealer || !dealerid || !scheduledon || !addedby) {
          return res.status(400).json({ error: "All fields are required." });
        }
    
        // Parse and validate the `scheduledon` field
        const scheduledDate = new Date(scheduledon);
        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({ error: "Invalid date format for 'scheduledon'." });
        }
    
        // Check if the date is at least 24 hours in the future
        const currentDate = new Date();
        const futureThreshold = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        if (scheduledDate <= futureThreshold) {
          return res.status(400).json({
            error: "Scheduled date must be at least 24 hours after the current date.",
          });
        }
    
        // Validate dealer data
        const isDataValid = await dataValidator(dealerid);
        console.log(isDataValid);
    
        if (!isDataValid) {
          return res.status(400).json({message:"Data for Dealer is not Updated"});
        }
    
        // Insert each dashboardcode into the database
        for (const dashboardcode of parsedDashboardCodes) {
          const query = ` use norms
            INSERT INTO ScheduledDashboard (Dashboardcode, Brandid, Brand, Dealerid, Dealer, Scheduledon, Addedby, Addedon)
            VALUES (@dashboardcode, @brandid, @brand, @dealerid, @dealer, @scheduledon, @addedby, GETDATE());
          `;
    
          await pool.request()
            .input("dashboardcode", sql.Int, dashboardcode)  // Unique input for each iteration
            .input("brand", sql.VarChar, brand)
            .input("brandid", sql.Int, brandid)
            .input("dealer", sql.VarChar, dealer)
            .input("dealerid", sql.Int, dealerid)
            .input("scheduledon", sql.DateTime, scheduledDate)
            .input("addedby", sql.Int, addedby)
            .query(query);
        }
    
        console.log("Dashboard successfully uploaded.");
        res.status(201).json({ message: "Dashboard Successfully Scheduled" });
      }
      else{
        res.status(401).json({message:'You are not Authorised to Schedule any Dashboard'})
      }
    } catch (error) {
      console.error("Error uploading schedules:", error.message);
      res.status(500).json({ message: error.message });
    }
};
function scheduleTask() {
  cron.schedule('*/1 * * * *', async () => {
    console.log("Running scheduler in every 5 minutes")
    try {
      const pool = await getPool()

      // Fetch tasks to be executed
      // status = 0 (when request is pending)
      const query = `use [norms]
                SELECT reqid, dashboardcode, brand, brandid, dealer, dealerid, scheduledon
                FROM scheduleddashboard where status = 0

          `
      const result = await pool.request().query(query)
      const tasks = result.recordset
      // console.log(tasks);
      
      if (Array.isArray(tasks) && !tasks.length) {
        console.log(`No request Scheduled in 5 minutes`)
      }

      for (const task of tasks) {        
        // console.log(`Processing task for dashboardcode: ${task.dashboardcode}, dealer :${task.dealer} ,scheduledon: ${task.scheduledon}`);

        // Mark Status
        // status = 1 (when request is went for data refresh "SP IS RUNNING")
        await pool.request()
          .input('reqid', sql.Int, task.reqid)
          .query(`use [norms]
                      UPDATE scheduleddashboard
                      SET status = 1
                      WHERE reqid = @reqid
                  `)

        // Perform the refresh logic here
        if (task.dashboardcode == 7)  { await refreshPPNI(task.brandid, task.dealerid,task.reqid)} 
        if (task.dashboardcode == 8)  { await refreshTOPS(task.dealerid,task.reqid)} 
        if (task.dashboardcode == 9)  { await refreshSpecialList(task.reqid)} 
        if (task.dashboardcode == 12) { await refreshBenchmarking(task.dealerid,task.reqid)} 
        if (task.dashboardcode == 13 || task.dashboardcode == 14) { await refreshSI(task.brand, task.dealer, task.brandid, task.dealerid,task.reqid)} 
        if (task.dashboardcode == 15) { await refreshCID(task.dealerid,task.reqid)} 
      }
    } catch (error) {
      console.error("Error processing scheduled tasks:", error.message)
    }
  })
}
const getBDM = async(req,res)=>{
  const pool = await getPool()
try {
    const {bigint_pk} = req.body
    const query = `use [z_scope] select bintId_Pk, vcFirstName , vcLastName from AdminMaster_GEN where isBDM = 'y' and bintId_Pk = @bigint_pk`
  
    const result = await pool.request().input('bigint_pk',sql.Int,bigint_pk).query(query)
    res.status(200).json(result.recordset)
} catch (error) {
  res.status(500).send(error.message)
}
}
const getRequests = async (req, res) => {
    try {
      const requests = await fetchRequests();
      res.status(200).json({ Request: requests });
    } catch (error) {
      res.status(500).json({ details: error.message });
    }
};  
const editSchedule = async (req, res) => {
  const pool = await getPool();
  try {
    const { reqid, bintid_pk, scheduledon } = req.body;

    if (!reqid || !bintid_pk || !scheduledon) {
      return res.status(400).json({ message: 'Invalid input. All fields are required.' });
    }
    // Parse and validate the `scheduledon` field
    const scheduledDate = new Date(scheduledon);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format for 'scheduledon'." });
    }

    // Check if the date is at least 24 hours in the future
    const currentDate = new Date();
    const futureThreshold = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    if (scheduledDate <= futureThreshold) {
      return res.status(400).json({
        error: "Scheduled date must be at least 24 hours after the current date.",
      });
    }
    // Fetch data from both databases
    const query = `
      SELECT addedby, status FROM norms.dbo.ScheduledDashboard WHERE reqid = @reqid;
      SELECT designation, isBDM FROM z_scope.dbo.adminmaster_gen WHERE bintid_pk = @bintid_pk;
    `;

    const result = await pool
      .request()
      .input('reqid', sql.Int, reqid)
      .input('bintid_pk', sql.Int, bintid_pk)
      .query(query);
    // console.log(result.recordsets);
    
    const scheduleData = result.recordsets[0]?.[0];
    const userData = result.recordsets[1]?.[0];
    //  console.log(scheduleData,userData);
     
    if (!scheduleData || !userData) {
      return res.status(404).json({ message: 'Request or user not found.' });
    }

    const { addedby, status } = scheduleData;
    const { designation, isBDM } = userData;
  // console.log(addedby,status,designation,isBDM);
  
    if (status !== 0) {
      return res.status(500).json({ message: 'Cannot edit schedule. Data uploading is in progress.' });
    }

    if (bintid_pk !== addedby && !(designation == 5 && isBDM === 'N')) {
      return res.status(403).json({ message: 'You are not authorized to edit this schedule.' });
    }

    // Update schedule
    const updateQuery = `
      UPDATE norms.dbo.ScheduledDashboard
      SET scheduledon = @scheduledon, editedby = @editedby, editedon = GETDATE()
      WHERE reqid = @reqid;
    `;

    await pool
      .request()
      .input('reqid', sql.Int, reqid)
      .input('scheduledon', sql.DateTime, scheduledon)
      .input('editedby', sql.Int, bintid_pk)
      .query(updateQuery);

    // Fetch updated requests
    const updatedRequests = await fetchRequests();
     res.status(200).json({ message: 'Schedule updated successfully.', Requests: updatedRequests });
  } catch (error) {
    console.error('Error in editSchedule:', error.message);
    res.status(500).json({ details: error.message });
  }
};
const deleteReq = async(req,res)=>{
try {
    const pool = await getPool()
  const {reqid,bintid_pk} = req.body
  if(!reqid , !bintid_pk){
    return res.status(401).json({details:'reqid and userid is required in this request'})
  }
  // status = 6 (Marked status = 6 when schedule is deleted explicitly only be done when status = 0)
  const query = `use norms update scheduledDashboard set status = 6 , Deletedby = @bintid_pk , Deletedon = GETDATE() where reqid = @reqid`
  await pool.request().input('reqid',sql.Int,reqid).input('bintid_pk',sql.Int,bintid_pk).query(query)
  const updatedRequests = await fetchRequests();
     res.status(200).json({ message: 'Schedule Deleted successfully.', Requests: updatedRequests.recordset });
} catch (error) {
  res.status(500).json({details:error.message})
}
}
const fetchRequests = async () => {
  const pool = await getPool();
  try {
    const query = `
      USE norms;
      SELECT sd.reqid, dm.Dashboard, sd.Brand, sd.Dealer, sd.ScheduledOn,
             CONCAT(amg1.vcFirstName, ' ', amg1.vcLastName) AS Addedby,
             CASE WHEN sd.Editedby = amg2.bintId_Pk THEN CONCAT(amg2.vcFirstName, ' ', amg2.vcLastName) END AS Editedby,
             sd.Editedon, sm.statusname
      FROM ScheduledDashboard sd
      LEFT JOIN z_scope..DB_DashboardMaster dm ON sd.DashboardCode = dm.tCode
      LEFT JOIN z_scope..AdminMaster_GEN amg1 ON sd.Addedby = amg1.bintId_Pk
      LEFT JOIN z_scope..AdminMaster_GEN amg2 ON sd.Editedby = amg2.bintId_Pk
      LEFT JOIN UAD_BI..SBS_DBS_STATUS_MASTER sm on sd.status = sm.status;`;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching requests:', error.message);
    throw new Error('Failed to fetch requests.');
  }
};
export {getDashboard,getBrandsforDashboard,getDealersforDashboard,uploadSchedule,getRequests,getBDM,editSchedule,scheduleTask,deleteReq}

