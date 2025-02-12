import { getPool1 } from "../db/db.js";
import sql from 'mssql';

const dataValidator = async (dealerid) => {    
  const pool = await getPool1();

  try {
    const dynamicTable = `dealer_sale_upload1_td001_${dealerid}`;
    const query = `USE [z_scope]; 
                select 
                sum(case 
            when dsm.NonMovingSale = 'BS' then 2
            when dsm.NonMovingSale in ('WS', 'CS') then 1
            else 0 -- Optional: Count as 0 for any other values
        end) as RequiredCount
from Dealer_Setting_master dsm
join locationinfo li
    on dsm.locationid = li.LocationID
where li.DealerID = 10038 and li.status = 1
-- Ensure the previous statement is terminated before using CTE
;
WITH LocationSaleType AS (
    -- Step 1: Get all active locations and their NonMovingSale types
    SELECT 
        li.LocationID, 
        dsm.NonMovingSale 
    FROM Dealer_Setting_master dsm
    JOIN locationinfo li
        ON dsm.locationid = li.LocationID
    WHERE li.DealerID = 10038
    -- AND li.OgsStatus = 1
),
FilteredSales AS (
    -- Main query to filter data based on conditions
    SELECT 
        ds.locationid,
        ds.saletype,
        ds.StockDateMonth,
        ds.StockDateYear
    FROM dealer_sale_upload1_td001_10038 ds
    WHERE ds.locationid IN (SELECT LocationID FROM LocationSaleType)
    AND (
        -- Conditional filtering based on SaleType
        (EXISTS (
            SELECT 1 
            FROM LocationSaleType lst
            WHERE lst.LocationID = ds.locationid 
              AND lst.NonMovingSale = 'WS'
        ) AND ds.saletype = 'WS')
        OR
        (EXISTS (
            SELECT 1 
            FROM LocationSaleType lst
            WHERE lst.LocationID = ds.locationid 
              AND lst.NonMovingSale = 'CS'
        ) AND ds.saletype = 'CS')
        OR
        (EXISTS (
            SELECT 1 
            FROM LocationSaleType lst
            WHERE lst.LocationID = ds.locationid 
              AND lst.NonMovingSale = 'BS'
        ) AND ds.saletype IN ('WS', 'CS'))  
    )
    AND ds.StockDateMonth = MONTH(DATEADD(MONTH, -1, GETDATE()))  
    AND ds.StockDateYear = CASE 
        WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1
        ELSE YEAR(GETDATE())
    END
)
-- Counting the number of rows
SELECT COUNT(*) AS GettingRowCount
FROM FilteredSales;
`

    const result = await pool.request()
  .input('dealerid', sql.Int, dealerid).query(query)
  // .input('dynamicTable', sql.VarChar, dynamicTable)
  
const RequiredCount = result.recordsets[0][0].RequiredCount
const GettingRowCount = result.recordsets[1][0].GettingRowCount

if(RequiredCount == GettingRowCount){
    return true;
}
else{
    return false;
}
// console.log(RequiredCount,GettingRowCount);

  } catch (error) {
    console.error("Error from dataValidator: ", error);
    throw error;
  }
};

const checkisAlreadyScheduled = async (dashboardcode, brandid, dealerid) => {
  const pool = await getPool1();

  const query = `
    use [UAD_BI] 
    SELECT scheduledon 
    FROM SBS_DBS_ScheduledDashboard  
    WHERE dashboardcode = @dashboardcode 
      AND dealerid = @dealerid 
      AND brandid = @brandid;
    SELECT * 
    FROM SBS_DBS_ScheduledDashboard 
    WHERE dashboardcode = @dashboardcode 
      AND dealerid = @dealerid 
      AND brandid = @brandid;
  `;

  try {
    const result = await pool.request()
      .input('dashboardcode', sql.Int, dashboardcode)
      .input('brandid', sql.Int, brandid)
      .input('dealerid', sql.Int, dealerid)
      .query(query);

    console.log('Query results:', result.recordsets);

    // Check for the last scheduled date
    // const lastscheduledfor = result.recordsets[0]?.[0]?.scheduledon;
    // console.log("last",lastscheduledfor);
    

    // if (!lastscheduledfor) {
    //   console.log('No previous schedule found.');
    //   return true; // Allow scheduling if no previous schedule exists
    // }

    // const allowedtoscheduleon = new Date(lastscheduledfor);
    // allowedtoscheduleon.setDate(allowedtoscheduleon.getDate() + 0);
    // console.log("allowed",allowedtoscheduleon);
    
    // // Check if scheduling conditions are met
    // if (result.recordsets[1].length === 0 || 
    //     ((result.recordsets[1][0].Status === 5 || result.recordsets[1][0].Status === 6) && 
    //      new Date(result.recordsets[1][0].ScheduledOn) < allowedtoscheduleon)) {
    //   return true;
    //   console.log(`true`);
    // }

    // return false;
    // console.log(`false`);
    const lastscheduledfor = result.recordsets[0]?.[0]?.ScheduledOn;
    console.log(result.recordsets[0]);
    console.log(result.recordsets[1]);


// if (!lastscheduledfor) {
//     console.log('No previous schedule found. Scheduling allowed.');
//     return true;
// }

const allowedtoscheduleon = new Date(lastscheduledfor);
console.log("Allowed to Schedule On:", allowedtoscheduleon);

if (result.recordsets[1].length === 0) {
    console.log("No existing scheduled requests. Scheduling allowed.");
    return true;
}

const firstRecord = result.recordsets[1][0];
const scheduledDate = new Date(firstRecord.ScheduledOn);
console.log(firstRecord);


if ((firstRecord.Status === 5 || firstRecord.Status === 6) && scheduledDate < allowedtoscheduleon) {
    console.log("Status is 5 or 6 and scheduled date is earlier than allowed date. Scheduling allowed.");
    return true;
}

console.log("Scheduling not allowed.");
return false;

    
  } catch (error) {
    console.error('Error in checkisAlreadyScheduled:', error.message);
    throw error;
  }
};
// Checking User is Authorised to Perform Actions or not 
const checkisUserValid = async(addedby)=>{
  const pool = await getPool1()
  const query = `use [z_scope] select designation , isBDM from adminmaster_gen where bintid_pk = @addedby`
  const result = await pool.request().input('addedby',sql.Int,addedby).query(query)
  if(result.recordset[0].designation == 5 || result.recordset[0].isBDM == 'Y'){
    return true;
  }else{
    return false;
  }
}
const checkGroupSetting = async(dealerid)=>{
  const pool = await getPool1()
  let query = `select count(dealerid) from locationinfo where dealerid =  @dealerid `
  let result = await pool.request().input('dealerid',sql.Int,dealerid).query(query)
  if(result.recordset.count = 1 ){
    return true
  }
  else{
    query = ` use z_scope 
                  SELECT  CASE WHEN EXISTS (SELECT 1 FROM Dealer_setting_master WHERE dealerid = @dealerid AND locationid = 0) THEN 'YES'
                  ELSE 'NO' END AS CID;`
   result = await pool.request().input('dealerid',sql.Int,dealerid).query(query)
  if(result.recordset[0].CID === 'YES'){
    return true;
  }
  return false;
  }   
}
const checkisMappingExists = async (dashboardcode,dealerid)=>{
  console.log(dashboardcode,dealerid);
  try {
    const pool  = await getPool1()
    const query = `select dashboardcode , dealerid from UAD_BI..SBS_DBS_DashboardDealerMapping where dealerid = @dealerid and dashboardcode = @dashboardcode`
    const result =  await pool.request()
                    .input('dealerid',sql.Int,dealerid)
                    .input('dashboardcode',sql.Int,dashboardcode)
                    .query(query)
    // const dashboardcode = result.recordset.dashboardcode
    // const dealerid = result.recordset.dealerid
    if (dashboardcode == result.recordset.dashboardcode && dealerid == result.recordset.dealerid){
      return false
    }
    else{
     true
    }
  } catch (error) {
    console.log(error.message);
    throw error;
  }
  
}
export  {dataValidator,checkisAlreadyScheduled,checkisUserValid,checkGroupSetting,checkisMappingExists};
