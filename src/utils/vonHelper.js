import sql from 'mssql'
import xlsx from 'xlsx'
import { getPool1 } from '../db/db.js'

const partBrandCheck = async(dealerid,locationid,partid)=>{
    try {
        const pool = await getPool1()
        const partCheck = `use [z_scope]  SELECT CASE 
                          WHEN EXISTS (SELECT 1 FROM locationinfo WHERE brandid = (SELECT brandid FROM Part_Master WHERE partid = ${partid})
                          AND dealerid = ${dealerid} 
                          AND locationid = ${locationid}
                          ) THEN 'YES' ELSE 'NO' END AS PartCheck;`

        const result = await pool.request().query(partCheck)                        
        if(result.recordset[0].PartCheck === 'NO' ){
             return false
        }
        else{
            return true
        }
        } catch (error) {
          res.status(500).json({Error:error.message})
        }
}

const readExcel = async (filePath)=>{
      let data
      //  filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Read the first sheet
      return data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
}
const insertData = async (formattedData,tableName)=>{
  const pool = await getPool1()
  const transaction = pool.transaction()

  await transaction.begin();
  
  for (const row of formattedData) {
    const columns = Object.keys(row).join(", ");
    const values = Object.keys(row)
      .map((_, idx) => `@val${idx}`)
      .join(", ");

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;

    const request = transaction.request();

    // Bind parameters dynamically
    Object.values(row).forEach((val, idx) => {
      request.input(`val${idx}`, val);
    });

    await request.query(query);
  }
  await transaction.commit(); // Commit transaction
}



export {partBrandCheck,readExcel,insertData}