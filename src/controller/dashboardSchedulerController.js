import sql from 'mssql'
import {getPool} from '../db/db.js'
import dataValidator from '../utils/dataValidation.js'
import cron from 'node-cron'
import {refreshBenchmarking, refreshPPNI, refreshSI, refreshTOPS, refreshCID} from '../utils/refreshDashboard.js'

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
      WHERE dlm.DashboardCode IN (${placeholders})
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
      WHERE dlm.DashboardCode IN (${placeholders}) and brandid = @brandid
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
  // const uploadSchedule = async (req, res) => {
  //   const pool = getPool(); 

  //   try {
  //     const { dashboardcodes, brandid,brand,dealer, dealerid, scheduledon, addedby } = req.body;

  //     if (!dashboardcodes || !Array.isArray(dashboardcodes) || dashboardcodes.length === 0) {
  //       return res.status(400).json({ error: "At least one dashboardcode is required." });
  //     }
  //     // Validate required fields
  //     if (!brandid || !brand || !dealer || !dealerid || !scheduledon || !addedby) {
  //       return res.status(400).json({ error: "All fields are required." });
  //     }

  //     // Parse and validate the `scheduledon` field
  //     const scheduledDate = new Date(scheduledon);
  //     if (isNaN(scheduledDate.getTime())) {
  //       return res.status(400).json({ error: "Invalid date format for 'scheduledon'." });
  //     }

  //     // Check if the date is at least 24 hours in the future
  //     const currentDate = new Date();
  //     const futureThreshold = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  //     if (scheduledDate <= futureThreshold) {
  //       return res.status(400).json({
  //         error: "Scheduled date must be at least 24 hours after the current date.",
  //       });
  //     }
  //      // Here is to be Validated
  //       const isDataValid  = await dataValidator(dealerid)
  //       // console.log(isDataValid);
        
  //       if(isDataValid == true){

        
  //     // Query to insert data
      
        
  //     // Execute the query
  //     const request = await pool.request()
  //     for(const dashboardcode of dashboardcodes){
  //       const query = `use [norms]
  //       INSERT INTO ScheduledDashboard (Dashboardcode, Brandid,Brand,Dealerid,Dealer,Scheduledon, addedby, addedon)
  //       VALUES (@dashboardcode,@brandid,@brand,@dealerid, @dealer, @scheduledon, @addedby, GETDATE());
  //     `;
  //       await request
  //       .input("dashboardcode", sql.Int, dashboardcode)
  //       .input("brand", sql.VarChar, brand)
  //       .input("brandid", sql.Int, brandid)
  //       .input("dealer", sql.VarChar, dealer)
  //       .input("dealerid", sql.Int, dealerid)
  //       .input("scheduledon", sql.DateTime, scheduledDate)
  //       .input("addedby", sql.Int, addedby)
  //       .query(query);
  //     }
  //     console.log("Schedule successfully uploaded.");
  //     res.status(201).json({ message: "Successfully Scheduled" });
  //   }
  //   else{
  //     res.send(`Data for Dealer is not Updated`)
  //   }
  // } catch (error) {
  //     console.error("Error uploading schedule:", error.message);
  //     res.status(500).json({ error: "Internal Server Error", details: error.message });
  //   }
    
  // };

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
      if(result.recordset.designation == 5 || result.recordset.isBDM == 'Y'){
         isUserValid = true;
      }else{
        isUserValid = false;
      }

      
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
          return res.status(400).send("Data for Dealer is not Updated");
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
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};
function scheduleTask() {
  cron.schedule('*/5 * * * *', async () => {
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
      if (Array.isArray(tasks) && !tasks.length) {
        console.log(`No request Scheduled in 5 minutes`)

      }
      else {
        console.log(tasks)
      }


      for (const task of tasks) {
        // console.log(`Processing task for dashboardcode: ${task.dashboardcode}, dealerid :${task.dealerid} ,scheduledon: ${task.scheduledon}`);
        // Perform the refresh logic here
        if (task.dashboardcode == 13) { await refreshSI(task.brand, task.dealer, task.brandid, task.dealerid)} 
        if (task.dashboardcode == 7) { await refreshPPNI(task.brandid, task.dealerid)} 
        if (task.dashboardcode == 12) { await refreshBenchmarking(task.dealerid)} 
        if (task.dashboardcode == 15) { await refreshCID(task.dealerid)} 
        if (task.dashboardcode == 8) { await refreshTOPS(task.dealerid)} 

        // Mark Status
        // status = 1 (when request is went for data refresh "SP IS RUNNING")
        await pool.request()
          .input('reqid', sql.Int, task.reqid)
          .query(`use [norms]
                      UPDATE scheduleddashboard
                      SET status = 1
                      WHERE reqid = @reqid
                  `)
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
const getRequests = async(req,res)=>{
  const pool = await getPool()
  
try {
   const query = `use norms select sd.reqid,dm.Dashboard,sd.Brand,sd.Dealer,sd.ScheduledOn,CONCAT(amg1.vcFirstName,' ',amg1.vcLastName)as Addedby,
	  case when sd.Updatedby = amg2.bintId_Pk then CONCAT(amg2.vcFirstName,' ',amg2.vcLastName) end Updatedby,sd.Updatedon
	  from ScheduledDashboard sd
	  inner join z_scope..DB_DashboardMaster dm on sd.DashboardCode=dm.tCode
	  inner join z_scope..AdminMaster_GEN amg1 on sd.Addedby=amg1.bintId_Pk
	  left join z_scope..AdminMaster_GEN amg2 on sd.Updatedby=amg2.bintId_Pk`
    const result =await pool.request().query(query)
    
    res.status(200).json({Request:result.recordset})
} catch (error) {
  res.status(500).json(error.message)
}
}
const editSchedule = async(req,res)=>{
  const pool = await getPool()
  try {
    const {bintid_pk} = req.params
    const {reqid , scheduledon} = req.body
     
  
    // console.log(bintid_pk);
    
    let  query = `use [norms] select addedby , status from ScheduledDashboard where reqid = @reqid 
                  use [z_scope] select designation , isBDM from adminmaster_gen where bintid_pk = @bintid_pk`
  
    const result =await pool.request().input('reqid',sql.Int,reqid).input('bintid_pk',sql.Int,bintid_pk).query(query)
    const addedby = result.recordsets[0][0].addedby; 
    const designation = result.recordsets[1][0].designation; 
    const isBDM = result.recordsets[1][0].isBDM;
  
    // Checking User is Authorised to Update the request or not
    if(bintid_pk ==  addedby || (designation == 5 && isBDM == 'N')){
         query = ` use [norms]
                  UPDATE scheduleddashboard
                  SET 
                 -- dashboardcode = @dashboardcode,
                 -- brandid = @brandid,
                 -- dealerid = @dealerid,
                  scheduledon = @scheduledon,
                  updatedby = @updatedby,
                  updatedon = GETDATE()
                  WHERE reqid = @reqid;` 
  
         await pool.request()
         .input('reqid',sql.Int,reqid)
        //  .input('dashboardcode',sql.Int,dashboardcode)
        //  .input('brandid',sql.Int,brandid)
        //  .input('dealerid',sql.Int,dealerid)
         .input('scheduledon',sql.DateTime,scheduledon)
         .input('updatedby',sql.Int,bintid_pk)
         .query(query)

         query = `use norms select sd.reqid,dm.Dashboard,sd.Brand,sd.Dealer,sd.ScheduledOn,CONCAT(amg1.vcFirstName,' ',amg1.vcLastName)as Addedby,
	  case when sd.Updatedby = amg2.bintId_Pk then CONCAT(amg2.vcFirstName,' ',amg2.vcLastName) end Updatedby,sd.Updatedon
	  from ScheduledDashboard sd
	  inner join z_scope..DB_DashboardMaster dm on sd.DashboardCode=dm.tCode
	  inner join z_scope..AdminMaster_GEN amg1 on sd.Addedby=amg1.bintId_Pk
	  left join z_scope..AdminMaster_GEN amg2 on sd.Updatedby=amg2.bintId_Pk`
    const result =await pool.request().query(query)
        return res.status(200).json({message:"kam done👍🦁",Requests:result.recordset})
    }
    else{
      return res.status(401).send(`You are not authorised`)
    }
  } catch (error) {
     res.status(500).json({details:error.message})
  }
}

export {getDashboard,getBrandsforDashboard,getDealersforDashboard,uploadSchedule,getRequests,getBDM,editSchedule,scheduleTask}


