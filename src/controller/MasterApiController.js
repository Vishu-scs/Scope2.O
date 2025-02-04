import sql from 'mssql'
import { getPool1 } from '../db/db.js'

const getBrands = async(req,res)=>{
    try {
        const pool = getPool1();
        const result = await pool
        .request()
        .query('use z_scope select bigid , vcbrand from Brand_master')
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
    }
}
const getDealers =  async(req,res)=>{
    try {
        const pool = getPool1();
        const {brandid} = req.body;
        const result = await pool.request().input('brandid',sql.Int,brandid).query(` use z_scope select distinct(dealerid),dealer from locationinfo where brandid = @brandid`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getLocation = async(req,res)=>{
    try {
        const pool = getPool1();
        const {dealerid} = req.body;
        const result = await pool.request().input('dealerid',sql.Int,dealerid).query(`use z_scope select locationid,location from locationinfo where dealerid = @dealerid`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getWorkspace = async(req,res)=>{
    try {
        const pool = getPool1();
        // const {dealerid} = req.body;
        const result = await pool.request().query(`select WorkspaceID, Workspace from UAD_BI..SBS_DBS_WorkspaceMaster`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getDashboard = async(req,res)=>{
    try {
        const pool = getPool1();
        // const {dealerid} = req.body;
        const result = await pool.request().query(`select tcode , Dashboard from z_scope..DB_DASHboardmaster where status = 1`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}

export {getBrands,getDealers,getLocation,getWorkspace,getDashboard}