import { getPool1 } from "../db/db.js";
import sql from 'mssql';

const dataValidator = async (dealerid) => {    
  const pool = await getPool1();

  try {
    const dynamicTable = `z_scope..dealer_sale_upload1_td001_${dealerid}`;
    const query = ` use [z_scope] 
    WITH data AS (
    SELECT li.locationid, dsm.NonMovingSale
    FROM z_scope..Dealer_Setting_Master dsm
    JOIN locationinfo li ON li.LocationID = dsm.locationid
    WHERE dsm.dealerid = @dealerid AND li.Status = 1
)
SELECT li.location, d.NonMovingSale
FROM data d
LEFT JOIN ${dynamicTable} ds 
    ON d.locationid = ds.locationid 
    AND (
        (d.NonMovingSale = 'BS' AND ds.SaleType IN ('WS', 'CS'))
        OR (d.NonMovingSale = 'WS' AND ds.SaleType = 'CS')
        OR (d.NonMovingSale = 'CS' AND ds.SaleType = 'WS')
    )
    AND ds.StockDateMonth = MONTH(DATEADD(MONTH, -1, GETDATE()))  
    AND ds.StockDateYear = 
        CASE 
            WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1
            ELSE YEAR(GETDATE()) 
        END
JOIN locationinfo li ON d.LocationID = li.LocationID AND li.Status = 1
WHERE ds.locationid IS NULL;`
//     const query = `
//     WITH data AS (
//     SELECT li.locationid, dsm.NonMovingSale
//     FROM z_scope..Dealer_Setting_Master dsm
//     JOIN locationinfo li ON li.LocationID = dsm.locationid
//     WHERE dsm.dealerid = @dealerid and li.Status = 1
// )
// SELECT li.location, d.NonMovingSale
// FROM data d
// LEFT JOIN z_scope..${dynamicTable} ds 
//     ON d.locationid = ds.locationid 
//     AND d.NonMovingSale = ds.SaleType
//     AND ds.StockDateMonth = MONTH(DATEADD(MONTH, -1, GETDATE()))  
//     AND ds.StockDateYear = 
//         CASE 
//             WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1
//             ELSE YEAR(GETDATE()) 
//         END
//         join locationinfo li on d.LocationID = li.LocationID and li.Status = 1
// WHERE ds.locationid IS NULL;`

const result = await pool.request()
    .input('dealerid', sql.Int, dealerid)
    .query(query);

// Extracting location IDs and NonMovingSale values
const locations = result.recordset.map(row => row.location);
const saleTypes = result.recordset.map(row => row.NonMovingSale);
const pending = ({ locations, saleTypes });
// console.log(pending);


if ( typeof pending === 'object' &&
  pending !== null &&
  (Array.isArray(pending.locations) && pending.locations.length === 0 || 
   Array.isArray(pending.saleTypes) && pending.saleTypes.length === 0)) {
  return true;
}
// Otherwise, return the pending object
return pending;


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

    const lastscheduledfor = result.recordsets[0]?.[0]?.ScheduledOn;

const allowedtoscheduleon = new Date(lastscheduledfor);
// console.log("Allowed to Schedule On:", allowedtoscheduleon);

if (result.recordsets[1].length === 0) {
    // console.log("No existing scheduled requests. Scheduling allowed.");
    return true;
}

const firstRecord = result.recordsets[1][0];
const scheduledDate = new Date(firstRecord.ScheduledOn);
// console.log(firstRecord);
if ((firstRecord.Status === 5 || firstRecord.Status === 6) ) {
    console.log("Status is 5 or 6 and scheduled date is earlier than allowed date. Scheduling allowed.");
    return true;
}
if(firstRecord.Status === 0 ){
  console.log("Scheduling not allowed.");
return false;
}

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
  // console.log(dashboardcode,dealerid);
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
