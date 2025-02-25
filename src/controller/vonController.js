import {getPool1} from '../db/db.js'
import sql from 'mssql'

const viewMax = async(req,res)=>{
try {
        const pool = await  getPool1()
        const {dealerid,r1, r2 , partnumber , locationid , flag, seasonalid, modelid, natureid} = req.body
        if(!dealerid){
            return res.status(400).json({Error:`Dealerid is a required Parameter`})
        }
        const query = `use z_scope EXEC GetMAXData @dealerid , @r1, @r2, @partnumber, @locationid, @maxvalueflag ,@seasonalid,@natureid,@modelid;`
        if(!partnumber && !locationid){
            return res.status(400).json({Error:`partnumber or locationid is required`})
        }
         const request = pool.request();
        
        // Handle potential NULL values correctly
        request.input('dealerid',sql.Int,dealerid)
        request.input('r1', sql.Int, r1 ?? null);
        request.input('r2', sql.Int, r2 ?? null);
        request.input('seasonalid', sql.Int, seasonalid ?? null);
        request.input('natureid', sql.Int, natureid ?? null);
        request.input('modelid', sql.Int, modelid ?? null);
        request.input('partnumber', sql.VarChar, partnumber ?? null);
        request.input('locationid', sql.Int, locationid ?? null);
        request.input('maxvalueflag', sql.Bit, flag ?? null);

        const result = await request.query(query);
        
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const userFeedbacklog = async (req,res)=>{
 try {
    const pool = await getPool1()
    const {partid , max , remarkid , customrem , proposedqty } = req.body
    if(!partid || !max || !proposedqty || !remarkid){
        return res.status(400).json({Error:`All Fields are required`})
    }
    let LatestPartID =null;
    try{
        const LatestPartQuery = `select (CASE WHEN pm.BrandID = sm.BrandID AND pm.PartNumber = sm.PartNumber THEN sm.SubPartNumber ELSE pm.PartNumber END) AS LatestPartNumber 
                                from z_scope..substitution_master sm
                                 join part_master pm on pm.brandid = sm.brandid and pm.partnumber = sm.partnumber 
                                where pm.partid = ${partid}`
            const result = await pool.request().query(LatestPartQuery)
            LatestPartID = result.recordset.length > 0 ? result.recordset[0].LatestPartNumber : null;
            // console.log(LatestPartID);  
            
    }catch(error){
        return res.status(500).json({Error:error.message,Error:`Error in Finding LatestPartID`})
    }
    let previousFBID = null;
    try {
        const previousFBQuery = `
        SELECT TOP 1 FeedbackID 
        FROM norms..UserFeedback 
        WHERE PartID = @partid 
        ORDER BY FeedbackDate DESC
       `;
       
       const previousFBResult = await pool.request()
        .input('partid', sql.Int, partid)
        .query(previousFBQuery);
       
        previousFBID =  previousFBResult.recordset.length > 0 ? previousFBResult.recordset[0].FeedbackID : null;
        // console.log(previousFBID);
        
    } catch (error) {
        return res.status(500).json({Error:error.message,Error:`Error in Finding Previous Feedback`})
    }
   
    const query = `
                   Insert into norms..UserFeedback (PartID , LatestPartID , MaxValue , UserID , UserFBRemarkID , CustomRem , ProposedQty , FeedbackDate , PreviousFBID)
                   Values (@partid,@latestid,@max,1,@userfbid,@customrem,@proposedqty,GETDATE(),@previousfbid)`
     const request = await pool.request()
     request.input('partid',sql.Int,partid)            
     request.input('latestid',sql.VarChar,LatestPartID)            
     request.input('max',sql.Int,max)            
     request.input('userfbid',sql.Int,remarkid)            
     request.input('customrem',sql.NVarChar,customrem)            
     request.input('proposedqty',sql.Int,proposedqty)            
     request.input('previousfbid',sql.Int,previousFBID)     
     
     await request.query(query)
     res.status(200).json({message:`Success`})
 } catch (error) {
    res.status(500).json({Error:error.message})
 }
}
// const adminView = async(req,res)=>{

// }
export {viewMax,userFeedbacklog}