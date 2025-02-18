import {getPool1} from '../db/db.js'
import sql from 'mssql'

const partNature = async(req,res)=>{
try {
     const pool = await getPool1()
     const query = `select  tCode , Description  from PartNatureMaster`
     const result = await pool.request().query(query)
     res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const model = async(req,res)=>{
try {
     const pool = await getPool1()
     const {brandid} = req.body
     const query = `select ModelID , Model  from ModelMaster where Brandid = ${brandid}`
     const result = await pool.request().query(query)
     res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}

export {partNature,model}