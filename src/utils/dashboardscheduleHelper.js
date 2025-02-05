import { getPool1 } from "../db/db.js";
import sql from 'mssql';

const dataValidator = async (dealerid) => {    
  const pool = await getPool1();

  try {
    const dynamicTable = `dealer_sale_upload1_td001_${dealerid}`;
    // console.log(dynamicTable);
    
    
    const query = `use [z_scope]
                select 
                sum(case 
            when dsm.NonMovingSale = 'BS' then 2
            when dsm.NonMovingSale in ('WS', 'CS') then 1
            else 0 -- Optional: Count as 0 for any other values
        end) as RequiredCount
from Dealer_Setting_master dsm
join locationinfo li
    on dsm.locationid = li.LocationID
where li.DealerID = @dealerid 
  and li.OgsStatus = 1;
-----------------------------------------
with LocationSaleType as (
    -- Step 1: Get all active locations and their NonMovingSale types
    select 
        li.LocationID, 
        dsm.NonMovingSale 
    from Dealer_Setting_master dsm
    join locationinfo li
        on dsm.locationid = li.LocationID
    where li.DealerID = @dealerid
      and li.OgsStatus = 1
),
FilteredSales as (
    -- Main query to filter data based on conditions
    select 
        ds.locationid,
        ds.saletype,
        ds.StockDateMonth,
        ds.StockDateYear
    from ${dynamicTable} ds
    where ds.locationid in (
        select LocationID 
        from LocationSaleType
    )
    and (
        -- Conditional filtering based on SaleType
        (exists (
            select 1 
            from LocationSaleType lst
            where lst.LocationID = ds.locationid 
              and lst.NonMovingSale = 'WS'
        ) and ds.saletype = 'WS')
        or
        (exists (
            select 1 
            from LocationSaleType lst
            where lst.LocationID = ds.locationid 
              and lst.NonMovingSale = 'CS'
        ) and ds.saletype = 'CS')
        or
        (exists (
            select 1 
            from LocationSaleType lst
            where lst.LocationID = ds.locationid 
              and lst.NonMovingSale = 'BS'
        ) and ds.saletype in ('WS', 'CS'))  
    )
    and ds.StockDateMonth = format(DATEADD(month, -1, getdate()), 'MM')  
    and ds.StockDateYear = case 
        when format(getdate(), 'MM') = '01' then format(getdate(), 'yyyy') - 1
        else format(getdate(), 'yyyy')
    end

)
-- Counting the number of rows
select count(*) as GettingRowCount
from FilteredSales;`

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

// const checkisAlreadyScheduled = async(dashboardcode,brandid,dealerid,scheduledon)=>{
//   const pool = await getPool1()
//   console.log(`Dash - ${dashboardcode}, brand - ${brandid}, dealer - ${dealerid} , schedule - ${scheduledon}`)
//   const query = `use norms select status , scheduledon  from scheduledDashboard sd where dashboardcode = @dashboardcode and dealerid = @dealerid and brandid = @brandid
//                  select * from scheduledDashboard sd where dashboardcode = @dashboardcode and dealerid = @dealerid and brandid = @brandid`
//   const result = await pool.request()
//                   .input('dashboardcode',sql.Int,dashboardcode)
//                   .input('brandid',sql.Int,brandid)
//                   .input('dealerid',sql.Int,dealerid)
//                   .input('scheduledon',sql.DateTime,scheduledon)
//                   .query(query)
//                   console.log(`hi`);
//                   // console.log(result.recordsets);
//             const status = result.recordsets[0][0].status
//             const lastscheduledfor = result.recordsets[0][0].scheduledon
//             const allowedtoscheduleon = new Date (lastscheduledfor)
//             allowedtoscheduleon.setDate(allowedtoscheduleon.getdate()+1)
//       //       if((status == 5 || status == 6) && (lastscheduledfor > allowedtoscheduleon)){

//       //       }
//       // console.log(status);
//       // console.log(lastscheduledfor); 
//       if(result.recordsets[1] === 0 || (result.recordsets[1][0].status = status && result.recordsets[1][0].Scheduledon > allowedtoscheduleon ) ){
//         return true;
//       }
//       return false;
    
// }
// const checkisAlreadyScheduled = async (dashboardcode, brandid, dealerid) => {
//   const pool = await getPool1();
//   // console.log(`Dash - ${dashboardcode}, brand - ${brandid}, dealer - ${dealerid} , schedule - ${scheduledon}`);
  
//   const query = `
//     use norms 
//     select  scheduledon from scheduledDashboard  where dashboardcode = @dashboardcode and dealerid = @dealerid and brandid = @brandid;
//     select * from scheduledDashboard sd where dashboardcode = @dashboardcode and dealerid = @dealerid and brandid = @brandid;
//   `;
  
//   const result = await pool.request()
//     .input('dashboardcode', sql.Int, dashboardcode)
//     .input('brandid', sql.Int, brandid)
//     .input('dealerid', sql.Int, dealerid)
//     // .input('scheduledon', sql.DateTime, scheduledon)
//     .query(query);
  
//   // const status = result.recordsets[0][0].status;
//   const lastscheduledfor = result.recordsets[0][0].scheduledon;
  
//   // Create a new Date object from last scheduled date
//   const allowedtoscheduleon = new Date(lastscheduledfor);
  
//   // Add 1 day to the last scheduled date
//   allowedtoscheduleon.setDate(allowedtoscheduleon.getDate() + 1);

//   // Check if the conditions are met
//   if (result.recordsets[1].length === 0 || ((result.recordsets[1][0].Status === 5 || result.recordsets[1][0].Status === 6) && result.recordsets[1][0].ScheduledOn > allowedtoscheduleon)) {
//     return true;
//   }

//   return false;
// };
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
    const lastscheduledfor = result.recordsets[0]?.[0]?.scheduledon;

    if (!lastscheduledfor) {
      console.log('No previous schedule found.');
      return true; // Allow scheduling if no previous schedule exists
    }

    const allowedtoscheduleon = new Date(lastscheduledfor);
    allowedtoscheduleon.setDate(allowedtoscheduleon.getDate() + 0);

    // Check if scheduling conditions are met
    if (result.recordsets[1].length === 0 || 
        ((result.recordsets[1][0].Status === 5 || result.recordsets[1][0].Status === 6) && 
         new Date(result.recordsets[1][0].ScheduledOn) > allowedtoscheduleon)) {
      return true;
    }

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
  const query = `  use z_scope SELECT  CASE 
        WHEN EXISTS (SELECT 1 FROM Dealer_setting_master WHERE dealerid = @dealerid AND locationid = 0) THEN 'YES'
        ELSE 'NO'
    END AS CID;`
  const result = await pool.request().input('dealerid',sql.Int,dealerid).query(query)
  if(result.recordset[0].CID === 'YES'){
    return true;
  }
  return false;
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
    const dashboardcode = result.recordset.dashboardcode
    const dealerid = result.recordset.dealerid
    console.log(`true`);
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
