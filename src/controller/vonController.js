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

export {viewMax}