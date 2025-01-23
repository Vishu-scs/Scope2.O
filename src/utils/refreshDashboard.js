import { getPool } from "../db/db.js";
import sql from 'mssql'


const refreshSI = async(brand,dealer,brandid,dealerid) =>{
const pool = await getPool() 

const query = `use [UAD_BI] 
                Insert into si_dealer_list (brand,dealer,brandid,dealerid)
                Values (@brand,@dealer,@brandid,@dealerid)`

        await pool.request()
          .input('brand',sql.VarChar,brand)
          .input('dealer',sql.VarChar,dealer)
          .input('brandid',sql.Int,brandid)
          .input('dealerid',sql.Int,dealerid)
          .query(query)

console.log(`Data Refreshing SI`);
       
}
const refreshBenchmarking = async(dealerid)=>{
   try {
     const pool = await getPool()
     // const query = `use [UAD_BI] exec DRD_Adjustment_Dealer '@dealerid'`
     const test = `use uad_bi select * from BackupTbl`
      await pool.request().input('dealerid',sql.Int,dealerid).query(test)
      console.log(`Data Refreshing Benchmarking`);
   } catch (error) {
    res.status(500).send(error.message)
   }
}
const refreshCID = async(dealerid)=>{
   try {
     const pool = await getPool()
     
     // const query = `use UAD_BI_CID exec UAD_Cinv_Compile '@dealerid'`
     const test = `use uad_bi select * from BackupTbl`
      await pool.request().input('dealerid',sql.Int,dealerid).query(test)
      console.log(`Data Refreshing CID`);
   } catch (error) {
    res.status(500).send(error.message)
   }
}
const refreshPPNI = async(brandid,dealerid)=>{
   try {
     const pool = await getPool()
     // const query = `use [UAD_BI] exec UAD_PPNI_Report_LS @brandid,@dealerid'`
     const test = `use uad_bi select * from BackupTbl`
      await pool.request().input('brandid',sql.TinyInt,brandid).input('dealerid',sql.Int,dealerid).query(test)
      console.log(`Data Refreshing PPNI`);
   } catch (error) {
    res.status(500).send(error.message)
   }
}
const refreshTOPS = async(dealerid)=>{
   try {
     const pool = await getPool()
     // const query = `use [UAD_BI] exec Tops_vs_scs_norms_dealerwise_test1 '@dealerid'`
     const test = `use uad_bi select * from BackupTbl`
      await pool.request().input('dealerid',sql.Int,dealerid).query(test)
      console.log(`Data Refreshing TOPS`);
   } catch (error) {
    res.status(500).send(error.message)
   }
}

export  {refreshSI,refreshBenchmarking,refreshCID,refreshPPNI,refreshTOPS}