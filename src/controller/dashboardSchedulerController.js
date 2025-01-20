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
const getBrandsforDashboard = async(req,res)=>{
  const pool = await getPool();
  try {
    const {DashboardCode}= req.body
    const query = `use[z_scope] select li.brand ,li.brandid from [dbo].[DB_DashboardLocMapping] dlm
                   join locationinfo li
                   on li.locationid = dlm.LocationID
                   where DashboardCode = @DashboardCode
                   group by brandid , brand
                   order by BrandID`
                   
    const result = await pool.request().input('DashboardCode',sql.Int,DashboardCode).query(query)
    // console.log(result.recordset);
    
    res.status(200).json({Brands:result.recordset})
  } catch (error) {
    res.status(500).send(error.message)
  }
}
const getDealersforDashboard = async(req,res)=>{
const pool = await getPool();
try {
  const {DashboardCode,brandid} = req.body
  const query =`use[z_scope] select li.Dealer ,li.DealerID from [dbo].[DB_DashboardLocMapping] dlm
                join locationinfo li
                on li.locationid = dlm.LocationID
                where DashboardCode = @DashboardCode and Brandid = @brandid
                group by DealerID , Dealer
                order by Dealerid`
  const result = await pool.request().input('brandid',sql.Int,brandid).input('DashboardCode',sql.Int,DashboardCode).query(query)
  // console.log(result.recordset);
  res.status(200).json({Dealers:result.recordset})
} catch (error) {
  res.status(500).send(error.message)
}

}
const uploadSchedule = async (req, res) => {
  const pool = getPool(); 

  try {
    const { dashboardcode, brandid,brand,dealer, dealerid, scheduledon, addedby } = req.body;

    // Validate required fields
    if (!dashboardcode || !brandid || !brand || !dealer || !dealerid || !scheduledon || !addedby) {
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
     // Here is to be Validated
      const isDataValid  = await dataValidator(dealerid)
      console.log(isDataValid);
      
      if(isDataValid == true){

      
    // Query to insert data
    const query = `use [norms]
      INSERT INTO ScheduledDashboard (Dashboardcode, Brandid,Brand,Dealerid,Dealer,Scheduledon, addedby, addedon)
      VALUES (@dashboardcode,@brandid,@brand,@dealerid, @dealer, @scheduledon, @addedby, GETDATE());
    `;
      
    // Execute the query
    await pool.request()
      .input("dashboardcode", sql.Int, dashboardcode)
      .input("brand", sql.VarChar, brand)
      .input("brandid", sql.Int, brandid)
      .input("dealer", sql.VarChar, dealer)
      .input("dealerid", sql.Int, dealerid)
      .input("scheduledon", sql.DateTime, scheduledDate)
      .input("addedby", sql.Int, addedby)
      .query(query);

    console.log("Schedule successfully uploaded.");
    res.status(201).json({ message: "Successfully Scheduled" });
  }
  else{
    res.send(`Data for Dealer is not Updated`)
  }
} catch (error) {
    console.error("Error uploading schedule:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
  
};

const scheduleTask =   () => {
  cron.schedule('*/5 * * * *', async () => {
      console.log("Running scheduler in every 5 minutes");
      try {
          const pool = await getPool();

          // Fetch tasks to be executed
          // status = 0 (when request in pending)
          const query = `use [norms]
                SELECT reqid, dashboardcode, brand, brandid, dealer, dealerid, scheduledon
                FROM scheduleddashboard where status = 0

          `;
          const result = await pool.request().query(query);
          const tasks = result.recordset;
          if (Array.isArray(tasks) && !tasks.length){
            console.log(`No request Scheduled in 5 minutes`);
            
          }
          else{
            console.log(tasks);
          }
          

          for (const task of tasks) {
              // console.log(`Processing task for dashboardcode: ${task.dashboardcode}, dealerid :${task.dealerid} ,scheduledon: ${task.scheduledon}`);

              // Perform the refresh logic here
              if(task.dashboardcode == 13){ await refreshSI(task.brand,task.dealer,task.brandid,task.dealerid);}
              if(task.dashboardcode == 7){ await refreshPPNI(task.brandid,task.dealerid);}
              if(task.dashboardcode == 8){ await refreshBenchmarking(task.dealerid);}
              if(task.dashboardcode == 12){ await refreshCID(task.dealerid);}
              if(task.dashboardcode == 15){ await refreshTOPS(task.dealerid);}

              // Mark task as scheduled
              // status = 3 (when request is scheduled)
              await pool.request()
                  .input('reqid', sql.Int, task.reqid)
                  .query(`use [norms]
                      UPDATE scheduleddashboard
                      SET status = 3
                      WHERE reqid = @reqid
                  `);
          }
      } catch (error) {
          console.error("Error processing scheduled tasks:", error.message);
      }
  });
};


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
    const result =await pool.request().query(`use [norms]  select * from ScheduledDashboard`)
    
    res.status(200).json({Request:result.recordset})
} catch (error) {
  res.status(500).json(error.message)
}
}
const editSchedule = async(req,res)=>{
  const pool = await getPool()
  try {
    const {bintid_pk} = req.params
    const {reqid , dashboardcode , brandid , dealerid , scheduledon} = req.body
     
  
    // console.log(bintid_pk);
    
    let  query = `use [norms] select addedby from ScheduledDashboard where reqid = @reqid 
                    use [z_scope] select designation , isBDM from adminmaster_gen where bintid_pk = @bintid_pk
                    `
  
    const result =await pool.request().input('reqid',sql.Int,reqid).input('bintid_pk',sql.Int,bintid_pk).query(query)
    const addedby = result.recordsets[0][0].addedby; 
    const designation = result.recordsets[1][0].designation; 
    const isBDM = result.recordsets[1][0].isBDM;
  
    if(bintid_pk ==  addedby || (designation == 5 && isBDM == 'N')){
         query = ` use [norms]
                  UPDATE scheduleddashboard
                  SET 
                  dashboardcode = @dashboardcode,
                  brandid = @brandid,
                  dealerid = @dealerid,
                  scheduledon = '2025-01-10 19:36:15.000',
                  updatedby = @updatedby,
                  updatedon = GETDATE()
                  WHERE reqid = @reqid;` 
  
         await pool.request()
         .input('reqid',sql.Int,reqid)
         .input('dashboardcode',sql.Int,dashboardcode)
         .input('brandid',sql.Int,brandid)
         .input('dealerid',sql.Int,dealerid)
         .input('scheduledon',sql.DateTime,scheduledon)
         .input('updatedby',sql.Int,bintid_pk)
         .query(query)
         return res.status(200).send(`kam done`)
    }
    else{
      return res.status(401).send(`You are not authorised`)
    }
  } catch (error) {
     res.status(500).json({details:error.message})
  }
}

export {getDashboard,getBrandsforDashboard,getDealersforDashboard,uploadSchedule,getRequests,getBDM,editSchedule,scheduleTask}


