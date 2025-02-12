import sql from 'mssql'
import cron from 'node-cron'
import {getPool1} from '../db/db.js'
import {dataValidator,checkisAlreadyScheduled,checkisUserValid, checkisMappingExists,checkGroupSetting} from '../utils/dashboardscheduleHelper.js'
import {refreshBenchmarking, refreshPPNI, refreshSI, refreshTOPS, refreshCID, refreshSpecialList, refreshGainerMini} from '../utils/refreshDashboard.js'

// const getBrandsforDashboard = async (req, res) => {
//   const pool = await getPool1();
//   try {
//     const { DashboardCode } = req.body;

//     // Validate that DashboardCodes is an array and not empty
//     if (!Array.isArray(DashboardCode) || DashboardCode.length === 0) {
//       return res.status(400).json({ error: "DashboardCodes must be a non-empty array." });
//     }

//     // Construct a dynamic query with placeholders for each DashboardCode
//     const placeholders = DashboardCode.map((_, index) => `@DashboardCode${index}`).join(', ');
//     const query = `
//       USE [z_scope];
//       SELECT li.brand, li.brandid
//       FROM [dbo].[DB_DashboardLocMapping] dlm
//       JOIN locationinfo li ON li.locationid = dlm.LocationID
//       WHERE dlm.DashboardCode IN (${placeholders}) and li.ogsstatus = 1 and li.status =1 and dlm.status = 1
//       GROUP BY li.brand, li.brandid
//       HAVING COUNT(DISTINCT dlm.DashboardCode) = @TotalDashboardCodes
//       ORDER BY li.brandid;
//     `;

//     // Bind each DashboardCode to a parameter
//     const request = pool.request();
//     DashboardCode.forEach((code, index) => {
//       request.input(`DashboardCode${index}`, sql.Int, code);
//     });

//     // Bind the total count of DashboardCodes
//     request.input("TotalDashboardCodes", sql.Int, DashboardCode.length);

//     const result = await request.query(query);

//     // Respond with the result
//     res.status(200).json({Brands:result.recordset });
//   } catch (error) {
//     console.error("Error fetching common brands for dashboards:", error.message);
//     res.status(500).send(error.message);
//   }
// };
// const getDealersforDashboard = async(req,res)=>{
// const pool = await getPool1();
// try {
//   const {DashboardCode,brandid} = req.body

//   if (!Array.isArray(DashboardCode) || DashboardCode.length === 0) {
//     return res.status(400).json({ error: "DashboardCodes must be a non-empty array." });
//   }
//   const placeholders = DashboardCode.map((_, index) => `@DashboardCode${index}`).join(', ');
//   const query =`USE [z_scope];
//       SELECT li.dealer, li.dealerid
//       FROM [dbo].[DB_DashboardLocMapping] dlm
//       JOIN locationinfo li ON li.locationid = dlm.LocationID
//       WHERE dlm.DashboardCode IN (${placeholders}) and brandid = @brandid and li.ogsstatus = 1 and li.status =1 and dlm.status = 1
// 	  GROUP BY li.dealer, li.dealerid
//       HAVING COUNT(DISTINCT dlm.DashboardCode) = @TotalDashboardCodes 
// 	  ORDER BY li.dealerid;`
//   // const result = await pool.request().input('brandid',sql.Int,brandid).input('DashboardCode',sql.Int,DashboardCode).query(query)
//   // console.log(result.recordset);

//   const request = pool.request();
//     DashboardCode.forEach((code, index) => {
//       request.input(`DashboardCode${index}`, sql.Int, code);
//     });

//     // Bind the total count of DashboardCodes
//     request.input("TotalDashboardCodes", sql.Int, DashboardCode.length);

//     const result = await request.input('brandid',sql.Int,brandid).query(query);

//   res.status(200).json({Dealers:result.recordset})
// } catch (error) {
//   res.status(500).send(error.message)
// }

// }

const getDashboardbyDealer = async(req,res)=>{
  const pool = await getPool1();
  const {dealerid} = req.body
try {  
    const query = `use [z_scope] select dm.tCode , dm.Dashboard from DB_DashboardLocMapping dlm                  
                  join LocationInfo li on li.LocationID = dlm.LocationID
                  join DB_DashboardMaster dm on dm.tCode = dlm.DashboardCode
                  where dealerid = @dealerid and dlm.Status = 1  
                  -- and li.OgsStatus = 1 
                  and li.Status = 1 and dm.Status = 1
                  group by dm.tcode , dm.Dashboard`
    const result = await pool.request().input('dealerid',sql.Int,dealerid).query(query)
    if(Array.isArray(result.recordset) && result.recordset.length === 0){
        return res.status(400).json({message:`No Dashboard Exist for Dealerid. You can request a New Dashboard`})
    }
    
    return res.status(200).json({Data:result.recordset})
} catch (error) {
if(error.message=== `Invalid object name'DB_DashboardMaster'.`){
  console.log(`Something Wrong`);
  
}
   console.log(error.message);
   
  res.status(500).json({details:error.message})
}
}
const uploadSchedule = async (req, res) => {
    const pool = getPool1();
    try {
      const {dashboardcodes, brandid, brand, dealer, dealerid, scheduledon, addedby } = req.body;

       // Validate other required fields
       if (!brandid || !brand || !dealer || !dealerid || !scheduledon || !dashboardcodes) {
        return res.status(400).json({ error: "All fields are required." });
      }
      if(!addedby){
        res.status(400).send(`Userid is Required`)
      }
        // Checking User is Authorised to Perform Actions or not 
          const isUserValid = await checkisUserValid(addedby)

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
            message: "Scheduled date must be at least 24 hours after the current date.",
          });
        }
    
        // Validate dealer data
        const isDataValid = await dataValidator(dealerid);
        console.log(`isDataUploaded: `,isDataValid);
    
        if (!isDataValid) {
          return res.status(400).json({message:"Data for Dealer is not Updated"});
        }
    
        // Insert each dashboardcode into the database
        for (const dashboardcode of parsedDashboardCodes) {

        const isAlreadyScheduled = await checkisAlreadyScheduled(dashboardcode,brandid,dealerid)
         console.log(`already scheduled: `,isAlreadyScheduled);
         if(!isAlreadyScheduled){
          return res.status(401).json({message:`Dashboard Already Scheduled`})
         }
         const isGroupSettingDone = await checkGroupSetting(dealerid) 
           console.log(isGroupSettingDone);
    
          if(!isGroupSettingDone){
          return res.status(400).json({message:`Group Setting Not done`})
    }
        const query = ` use [UAD_BI]
            INSERT INTO SBS_DBS_ScheduledDashboard (Dashboardcode, Brandid, Brand, Dealerid, Dealer, Scheduledon, Addedby, Addedon)
            VALUES (@dashboardcode, @brandid, @brand, @dealerid, @dealer, @scheduledon, @addedby, GETDATE());`;
          await pool.request()
            .input("dashboardcode", sql.Int, dashboardcode)  // Unique input for each iteration
            .input("brand", sql.VarChar, brand)
            .input("brandid", sql.Int, brandid)
            .input("dealer", sql.VarChar, dealer)
            .input("dealerid", sql.Int, dealerid)
            .input("scheduledon", sql.DateTime, scheduledon)
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
const getBDM = async(req,res)=>{
  const pool = await getPool1()
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
  const pool = await getPool1();
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
      SELECT addedby, status FROM UAD_BI.dbo.SBS_DBS_ScheduledDashboard WHERE reqid = @reqid;
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
      UPDATE UAD_BI.dbo.SBS_DBS_ScheduledDashboard
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
    const pool = await getPool1()
  const {reqid,bintid_pk} = req.body
  if(!reqid , !bintid_pk){
    return res.status(401).json({details:'reqid and userid is required in this request'})
  }
  // status = 6 (Marked status = 6 when schedule is deleted explicitly only be done when status = 0)
  const query = `use UAD_BI update SBS_DBS_ScheduledDashboard set status = 6 , Deletedby = @bintid_pk , Deletedon = GETDATE() where reqid = @reqid`
  await pool.request().input('reqid',sql.Int,reqid).input('bintid_pk',sql.Int,bintid_pk).query(query)
  const updatedRequests = await fetchRequests();
     res.status(200).json({ message: 'Schedule Deleted successfully.', Requests: updatedRequests.recordset });
} catch (error) {
  res.status(500).json({details:error.message})
}
}
const fetchRequests = async () => {
  const pool = await getPool1();
  try {
    const query = `
      use [UAD_BI] select 
      sd.reqid, dm.Dashboard , sd.Brand, sd.Dealer, sd.ScheduledOn ,sm.StatusName , 
      CONCAT(amg1.vcFirstName, ' ', amg1.vcLastName) AS Addedby , sd.Addedon ,
      CASE WHEN sd.Editedby = amg2.bintId_Pk THEN CONCAT(amg2.vcFirstName, ' ', amg2.vcLastName) END AS Editedby, sd.Editedon , 
      CASE WHEN sd.Deletedby = amg3.bintId_Pk THEN CONCAT(amg3.vcFirstName, ' ', amg3.vcLastName) END AS Deletedby, sd.Deletedon,
      CASE WHEN d.BDMCode = amg4.bintId_Pk THEN CONCAT(amg4.vcFirstName, ' ', amg4.vcLastName) END AS BDM
      from SBS_DBS_ScheduledDashboard sd
      join z_scope..DB_DashboardMaster dm ON sd.DashboardCode = dm.tCode
      join UAD_BI..SBS_DBS_STATUS_MASTER sm on sd.status = sm.status
      join z_scope..Dealer_Master d on d.bigid = sd.Dealerid
      LEFT JOIN z_scope..AdminMaster_GEN amg1 ON sd.Addedby = amg1.bintId_Pk
      LEFT JOIN z_scope..AdminMaster_GEN amg2 ON sd.Editedby = amg2.bintId_Pk
      LEFT JOIN z_scope..AdminMaster_GEN amg3 ON sd.Editedby = amg3.bintId_Pk
      LEFT JOIN z_scope..AdminMaster_GEN amg4 ON d.BDMCode = amg4.bintId_Pk
      order by reqid desc`;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching requests:', error.message);
    throw new Error('Failed to fetch requests.');
  }
};
const changeLog = async(req,res)=>{
try {
    const pool = await getPool1()
    const {dashboardcode , workspaceid , refbrandid , refdealerid ,changeby , requestby , requeston , url , remarks} = req.body
    if(!dashboardcode || !workspaceid || !refbrandid || !refdealerid || !changeby || !requestby || !requeston || !url || !remarks){
      return res.status(400).json({message:`All fields are required`})
    }
    const query = `insert into UAD_BI..SBS_DBS_ChangeLog(dashboardcode,workspaceid,refbrandid, refdealerid,changedby,changedon,requestby,requeston,url,remarks)
                  values(@dashboardcode,@workspaceid,@refbrandid,@refdealerid,@changeby,GETDATE(),@requestby,@requeston,@url,@remarks)`
    await pool.request().input('dashboardcode',sql.TinyInt,dashboardcode)
                                      .input('workspaceid',sql.TinyInt,workspaceid)
                                      .input('refbrandid',sql.SmallInt,refbrandid)
                                      .input('refdealerid',sql.Int,refdealerid)
                                      .input('changeby',sql.Int,changeby)
                                      .input('requestby',sql.Int,requestby)
                                      .input('requeston',sql.DateTime,requeston)
                                      .input('url',sql.NVarChar,url)
                                      .input('remarks',sql.VarChar,remarks)
                                      .query(query)
        res.status(201).json({message:"Dashboard Changes are Successfully Tracked"})
} catch (error) {
   res.status(500).json({Error:error.message});
  console.log(error.message);
  
}
}
const changelogView = async(req,res)=>{
    try {
      const pool  = await getPool1()
      const query = ` use [UAD_BI]
                      SELECT DISTINCT dm.Dashboard,  wm.Workspace,  li.Brand,  li.Dealer,  CONCAT(adm.vcFirstName, ' ', adm.vcLastName) AS ChangedBy,   cl.ChangedOn, am.Name AS RequestedBy,   cl.RequestOn,   cl.Url , cl.remarks 
                      FROM SBS_DBS_ChangeLog cl  
                      LEFT JOIN z_scope..locationinfo li ON li.dealerid = cl.refdealerid  
                      LEFT JOIN z_scope..db_dashboardmaster dm ON dm.tcode = cl.DashboardCode  
                      LEFT JOIN SBS_DBS_AdminMaster am ON am.Aid = cl.Requestby  
                      LEFT JOIN SBS_DBS_WorkspaceMaster wm ON wm.WorkspaceID = cl.Workspaceid  
                      LEFT JOIN z_scope..AdminMaster_GEN adm ON adm.bintId_Pk = cl.Changedby  
                      GROUP BY  dm.Dashboard,  wm.Workspace,  li.Brand,  li.Dealer,  adm.vcFirstName,  adm.vcLastName,  cl.ChangedOn,  am.Name,  cl.RequestOn,  cl.Url , cl.remarks;`
  
      const result = await pool.request().query(query)
      res.status(200).json({Data:result.recordset})
    } catch (error) {
       res.status(500).json(error.message)    
      }
  
  }
const newDashboardSchedule = async (req, res) => {
  try {
    const pool = await getPool1();
    const { brandid, brand, dealer, dealerid, dashboardcodes, scheduledon, addedby } = req.body;

    // Validate required fields
    if (!brandid || !brand || !dealer || !dealerid || !dashboardcodes || !scheduledon || !addedby) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Checking if the user is authorized
    const isUserValid = checkisUserValid(addedby);
    if (!isUserValid) {
      return res.status(403).json({ message: "Unauthorized access." });
    }

    // Validate `dashboardcodes` as an array
    if (!Array.isArray(dashboardcodes) ||
     dashboardcodes.length === 0) {
      return res.status(400).json({ error: "Invalid or missing dashboardcodes. It must be a non-empty array." });
    }

    // Validate `scheduledon` as a proper date
    const scheduledDate = new Date(scheduledon);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format for 'scheduledon'." });
    }

    // Ensure the scheduled date is at least 24 hours in the future
    const currentDate = new Date();
    const futureThreshold = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    if (scheduledDate <= futureThreshold) {
      return res.status(400).json({
        error: "Scheduled date must be at least 24 hours after the current date.",
      });
    }

    // Validate dealer data
    const isDataValid = await dataValidator(dealerid);
    console.log(`isDataValid:`, isDataValid);

    if (!isDataValid) {
      return res.status(400).json({ message: "Data for Dealer is not updated." });
    }

    for (const dashboardcode of dashboardcodes) {
      const isAlreadyScheduled = await checkisAlreadyScheduled(dashboardcode, brandid, dealerid);
      console.log(`Already scheduled:`, isAlreadyScheduled);

      if (!isAlreadyScheduled) {
        return res.status(400).json({ message: `Dashboard ${dashboardcode} is already scheduled.` });
      }
      //Checking Mapping Exists or not

      let isMappingExists = checkisMappingExists(dashboardcode,dealerid)
      if(!isMappingExists){
        return res.status(400).json({message:`Mapping Already Exists`})
      }

      // Insert into SBS_DBS_DashboardDealerMapping
      try {
        await pool
          .request()
          .input("dashboardcode", sql.Int, dashboardcode)
          .input("dealerid", sql.Int, dealerid)
          .query(
            `INSERT INTO SBS_DBS_DashboardDealerMapping (DashboardCode, DealerID)
             VALUES (@dashboardcode, @dealerid);`
          );
      } catch (error) {
        console.error("Error in mapping dashboard and dealer:", error);
        return res.status(500).json({ message: "Error in mapping new dashboard and dealer", error: error.message });
      }
      // Insert into SBS_DBS_newrequesttracker
      try {
        await pool
          .request()
          .input("brandid", sql.Int, brandid)
          .input("dashboardcode", sql.Int, dashboardcode)
          .input("dealerid", sql.Int, dealerid)
          .input("addedby", sql.Int, addedby)
          .query(
            `INSERT INTO SBS_DBS_newrequesttracker (brandid,dealerid,dashboardcode,addedby,addedon)
             VALUES (@brandid,@dealerid,@dashboardcode,@addedby,GETDATE());`
          );
      } catch (error) {
        console.error("Error in mapping dashboard and dealer:", error);
        return res.status(500).json({ message: "Error in mapping new dashboard and dealer", error: error.message });
      }
      // Insert into SBS_DBS_ScheduledDashboard
      try {
        await pool
          .request()
          .input("dashboardcode", sql.Int, dashboardcode)
          .input("brand", sql.VarChar, brand)
          .input("brandid", sql.Int, brandid)
          .input("dealer", sql.VarChar, dealer)
          .input("dealerid", sql.Int, dealerid)
          .input("scheduledon", sql.DateTime, scheduledon)
          .input("addedby", sql.Int, addedby)
          .query(
            `INSERT INTO SBS_DBS_ScheduledDashboard 
             (DashboardCode, Brandid, Brand, DealerID, Dealer, ScheduledOn, AddedBy, AddedOn)
             VALUES (@dashboardcode, @brandid, @brand, @dealerid, @dealer, @scheduledon, @addedby, GETDATE());`
          );
      } catch (error) {
        console.error("Error in inserting into scheduled dashboard:", error);
        return res.status(500).json({ message: "Error in scheduling the dashboard", error: error.message });
      }
    }

    return res.status(201).json({ message: "Request for new Dashboard successfully submitted." });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
const requestNewDashboard = async (req,res)=>{
 try {
   const pool = await getPool1()
   const {dealerid} = req.body
   const query = `select tcode , Dashboard from DB_DashboardMaster where tcode not in (
                   select dm.tCode  from DB_DashboardLocMapping dlm                  
 				          join LocationInfo li on li.LocationID = dlm.LocationID
                  join DB_DashboardMaster dm on dm.tCode = dlm.DashboardCode
                  where dealerid = @dealerid and dlm.Status = 1 and li.OgsStatus = 1 and li.Status = 1 and dm.Status = 1
                  group by dm.tcode , dm.Dashboard
                 ) and status = 1`
       const result =  await pool.request().input('dealerid',sql.Int,dealerid).query(query)
         res.status(200).json(result.recordset)
 }  
  catch (error) {
   res.status(500).json(error.message)
 }
}
const requestBy = async(req,res)=>{
  try {
    const pool = await getPool1()
    const query = `select * from UAD_BI..SBS_DBS_AdminMaster`
    const result = await pool.request().query(query)
    res.status(200).json({Data:result.recordset})
  }
   catch (error) {
    res.status(500).json({message:error.message})
  }
}
const newDashboardView = async(req,res)=>{
try {
    const pool = await getPool1()
    const query = `use [UAD_BI] select distinct  nrt.id,  li.brand , li.dealer , dm.dashboard ,concat(amg.vcFirstName,' ',amg.vcLastName) as Addedby,nrt.addedon  from UAD_BI..SBS_DBS_newrequesttracker nrt
                    join locationinfo li on li.DealerID = nrt.dealerid and li.BrandID = nrt.brandid
                    join z_scope..DB_DashboardMaster dm on dm.tcode = nrt.dashboardcode 
                    join z_scope..AdminMaster_GEN amg on amg.bintId_Pk =  nrt.addedby
                    group by nrt.id,  li.brand , li.dealer , dm.dashboard , nrt.addedon ,concat(amg.vcFirstName,' ',amg.vcLastName)`
    const result = await pool.request().query(query)
    res.status(200).json({Data:result.recordset})
} catch (error) {
  res.status(500).json({error:error.message})
}
}
//  '0,30 0-9 * * *'  for every 30 minutes interval between 12 midnight to 9 am 
function scheduleTask() {
  cron.schedule('*/10 * * * *', async () => { 
    console.log("Running scheduler every 10 minutes")

    try {
      const pool = await getPool1()

      // Fetch tasks to be executed (status = 0 means pending)
      const query = `use [UAD_BI]
                     SELECT TOP 5  reqid, dashboardcode, brand, brandid, dealer, dealerid, scheduledon
                     FROM SBS_DBS_ScheduledDashboard 
                     WHERE status = 0`
      const result = await pool.request().query(query)
      const tasks = result.recordset

      if (!tasks.length) {
        console.log(`No requests scheduled in the last 10 minutes.`)
        return
      }

      // Process all tasks in parallel
      const taskPromises = tasks.map(async (task) => {
        console.log(`Processing task for dashboardcode: ${task.dashboardcode}, dealer: ${task.dealer}, scheduledon: ${task.scheduledon}`)

        try {
          // Mark status as "SP IS RUNNING In-Progress" (1)
          await pool.request()
            .input('reqid', sql.Int, task.reqid)
            .query(`use [UAD_BI] UPDATE SBS_DBS_ScheduledDashboard SET status = 1 WHERE reqid = @reqid`)

          // Call refresh functions asynchronously
          switch (task.dashboardcode) {
            case 7: return refreshPPNI(task.brandid, task.dealerid, task.reqid)
            case 8: return refreshTOPS(task.dealerid, task.reqid)
            case 9: return refreshSpecialList(task.reqid)
            case 12: return refreshBenchmarking(task.dealerid, task.reqid)
            case 13: return refreshSI(task.brand, task.dealer, task.brandid, task.dealerid, task.reqid)
            // case 14: return refreshGSI(task.brand, task.dealer, task.brandid, task.dealerid, task.reqid)
            case 15: return refreshCID(task.dealerid, task.reqid)
            case 17: return refreshGainerMini(task.reqid)
            default:
              console.error(`Invalid dashboardCode: ${task.dashboardcode} for reqid: ${task.reqid}`)
          }
        } catch (error) {
          console.error(`Error processing dashboardCode ${task.dashboardcode} for reqid: ${task.reqid}:`, error.message)
        }
      })

      // Wait for all tasks to push queries to the DB asynchronously
      await Promise.allSettled(taskPromises)

      console.log("All scheduled tasks processed asynchronously")
    } catch (error) {
      console.error("Error processing scheduled tasks:", error.message)
    }
  })
}
function siScheduler() {
  cron.schedule('*/10 * * * *', async () => { 
    console.log("Running scheduler for si every 10 minutes")

    try {
      const pool = await getPool1()
      const today = new Date();
      const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const firstDayLastMonth = new Date(year, month, 1);
      
      // Format date properly in YYYY-MM-DD format
      const date = firstDayLastMonth.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
      
      // console.log(date); // Correctly outputs "2025-01-01"
      // Fetch tasks to be executed (status = 0 means pending)
      let query = `use UAD_BI_SI;
                    exec uad_si_report_3 '${date}'`

      await pool.request().query(query)
        query = `use UAD_BI 
                Update SBS_DBS_ScheduledDashboard set Status = 3 where reqid in (select reqid from si_dealer_list where status = 1) and status = 1`
      await pool.request().query(query)
      
    }
    catch(error){
      console.log("Error in SI Scheduler",error.message);
      
        throw new error
    }
  })
}
export {getDashboardbyDealer,uploadSchedule,getRequests,getBDM,editSchedule,scheduleTask,deleteReq,changeLog,changelogView,requestNewDashboard,newDashboardSchedule,requestBy,siScheduler,newDashboardView}





