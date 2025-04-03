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

//----------ROW BY ROW INSERTION -----------

const insertData = async (formattedData,tableName)=>{
  const pool = await getPool1()
  const transaction = pool.transaction()

  await transaction.begin();
   console.log(`Inserting Data...`);
   
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


// -----------BULK INSERTION ---------------------------
// const insertData = async (formattedData, tableName) => {
//   const pool = await getPool1();
//   const transaction = pool.transaction();
//   await transaction.begin();

//   try {
//       const table = new sql.Table('dbo.UAD_VON_SPMFeedback_Type'); // Using 'sql' from 'mssql' package
//       table.columns.add("brandid", sql.Int);
//       table.columns.add("dealerid", sql.Int);
//       table.columns.add("locationid", sql.Int);
//       table.columns.add("maxvalue", sql.Decimal(18, 2));
//       table.columns.add("partid", sql.Int);
//       table.columns.add("latestpartid", sql.Int);
//       table.columns.add("UserID", sql.Int);
//       table.columns.add("UserFBRemarkID", sql.Int);
//       table.columns.add("CustomRem", sql.NVarChar(sql.MAX));
//       table.columns.add("ProposedQty", sql.Int);
//       table.columns.add("PreviousFBID", sql.Int);

//       // Add all rows at once
//       formattedData.forEach(row => {
//           table.rows.add(
//               row.brandid,
//               row.dealerid,
//               row.locationid,
//               row.maxvalue,
//               row.partid,
//               row.latestpartid,
//               row.UserID,
//               row.UserFBRemarkID,
//               row.CustomRem,
//               row.ProposedQty,
//               row.PreviousFBID
//           );
//       });

//       // Use a single query to insert the entire  dataset
//       await pool
//           .request()
//           .input("TVP", table) // Table-Valued Parameter
//           .query(`INSERT INTO ${tableName} SELECT * FROM @TVP`);

//       await transaction.commit();
//   } catch (error) {
//       await transaction.rollback();
//       throw error;
//   }
// };



export {partBrandCheck,readExcel,insertData}