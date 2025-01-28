import { getPool1 } from "../db/db.js";
import sql from 'mssql'
import { checkGroupSetting } from "./dataValidation.js";

const refreshSI = async(brand,dealer,brandid,dealerid,reqid) =>{
try {
   const pool = await getPool1() 
   let query = `use [UAD_BI] 
                   Insert into si_dealer_list (brand,dealer,brandid,dealerid)
                   Values (@brand,@dealer,@brandid,@dealerid)`
   
           await pool.request()
             .input('brand',sql.VarChar,brand)
             .input('dealer',sql.VarChar,dealer)
             .input('brandid',sql.Int,brandid)
             .input('dealerid',sql.Int,dealerid)
             .query(query)
   
   console.log(`Data Refreshing SI`);
   query = `use norms Update ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)

} catch (error) {
   console.error("Error refreshing SI and GSI:", error.message);
}
       
}
const refreshBenchmarking = async(dealerid,reqid)=>{
   try {
     const pool = await getPool1()
     let query = `use [UAD_BI] exec DRD_Adjustment_Dealer @dealerid`
     let result =  await pool.request().input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing Benchmarking`);

      let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      if(Check){
         query = `use norms Update ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      }
      //Data Refresh Failed 
      // else{
      //    query = `use norms Update ScheduledDashboard set status = 2 where reqid = @reqid`
      //    await pool.request().input('reqid',sql.Int,reqid).query(query)
      // }
   } 
   // if SP fails then error is catched in catch block and then status = 2 (Data Refresh Failed) is updated here 
   catch (error) {
      console.error("Error refreshing Benchmarking:", error.message);
      // Handle the failure scenario: update status to 2
      try {
        const pool = await getPool1();
        const query = `use norms Update ScheduledDashboard set status = 2 where reqid = @reqid`;
        await pool.request().input('reqid', sql.Int, reqid).query(query);
      } catch (updateError) {
        console.error("Error updating ScheduledDashboard:", updateError.message);
      }
    }
}
const refreshCID = async(dealerid,reqid)=>{
   try {
    const isGroupSettingDone = checkGroupSetting(dealerid) 
    if(isGroupSettingDone === 'NO'){
      return result.status(400).json({message:`Group Setting Not done`})
    }
     const pool = await getPool1()
     let query = `use UAD_BI_CID exec UAD_Cinv_Compile @dealerid`
   //   const test = `use uad_bi select * from BackupTbl`
     const result =  await pool.request().input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing CID`);
      let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      if(Check){
         query = `use norms Update ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      }

      // if SP fails then error is catched in catch block and then status = 2 (Data Refresh Failed) is updated here 
   } catch (error) {
   //  res.status(500).send(error.message)
   console.error("Error refreshing CID:", error.message);
   try {
      const pool = await getPool1();
      const query = `use norms Update ScheduledDashboard set status = 2 where reqid = @reqid`;
      await pool.request().input('reqid', sql.Int, reqid).query(query);
    } catch (updateError) {
      console.error("Error updating ScheduledDashboard:", updateError.message);
    }
   }
}
const refreshPPNI = async(brandid,dealerid,reqid)=>{
   try {
     const pool = await getPool1()
     let query = `use UAD_BI_PPNI exec UAD_PPNI_Report_LS @brandid,@dealerid`
   //   const test = `use uad_bi select * from BackupTbl`
     const result =  await pool.request().input('brandid',sql.TinyInt,brandid).input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing PPNI`);
      let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      if(Check){
         query = `use norms Update ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      }
      //Data Refresh Failed 
      // else{
      //    query = `use norms Update ScheduledDashboard set status = 2 where reqid = @reqid`
      //    await pool.request().input('reqid',sql.Int,reqid).query(query)
      // }
      // if SP fails then error is catched in catch block and then status = 2 (Data Refresh Failed) is updated here 
   } catch (error) {
   //  res.status(500).send(error.message)
   console.error("Error refreshing PPNI:", error.message);
   try {
      const pool = await getPool1();
      const query = `use norms Update ScheduledDashboard set status = 2 where reqid = @reqid`;
      await pool.request().input('reqid', sql.Int, reqid).query(query);
    } catch (updateError) {
      console.error("Error updating ScheduledDashboard:", updateError.message);
    }
   }
}
const refreshSpecialList = async(reqid)=>{
   try {
      const pool = await getPool1()
      console.log(`Data Refreshing Special List`);
      //Data is Always Refreshed in Special List 
      let query = `use norms Update ScheduledDashboard set status = 3 where reqid = @reqid`
       await pool.request().input('reqid',sql.Int,reqid).query(query)
   } catch (error) {
   //  res.status(500).send(error.message)
   console.error("Error refreshing spl:", error.message);
   }
}
const refreshTOPS = async(dealerid,reqid)=>{
   try {
     const pool = await getPool1()
     let query = `EXEC [103.153.58.143,2498].[z_scope].[dbo].Tops_vs_scs_norms_dealerwise_test1 @dealerid`
   //   const test = `use uad_bi select * from BackupTbl`
     const result =  await pool.request().input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing TOPS`)
      let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      if(Check){
         query = `use norms Update ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      }
      //Data Refresh Failed 
      // else{
      //    query = `use norms Update ScheduledDashboard set status = 2 where reqid = @reqid`
      //    await pool.request().input('reqid',sql.Int,reqid).query(query)
      // }
   
   } catch (error) {
      console.error("Error refreshing Benchmarking:", error.message);
      // Handle the failure scenario: update status to 2
      try {
        const pool = await getPool1();
        const query = `use norms Update ScheduledDashboard set status = 2 where reqid = @reqid`;
        await pool.request().input('reqid', sql.Int, reqid).query(query);
      } catch (updateError) {
        console.error("Error updating ScheduledDashboard:", updateError.message);
      }
    }
}
function isDataRefreshed(result) {
   if(result){
      return  true;
   }
   else{
      return false;
   }
} 
export  {refreshSI,refreshBenchmarking,refreshCID,refreshPPNI,refreshTOPS,refreshSpecialList}