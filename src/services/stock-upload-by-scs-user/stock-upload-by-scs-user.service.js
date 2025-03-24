import { getPool1 } from "../../db/db.js"
import { readExcelFile, readExcelFileWithSubColumns } from "../utilities/utilities.service.js";
import sql from 'mssql'
const singleUploadStockInService=async(req,res)=>{

    try{

  const pool=await getPool1();
  let locationId = req.body.location_id;
  let addedBy = req.body.user_id;
  let rowData;
  let brandId=req.body.brand_id;
  let dealerId=req.body.dealer_id;
  let date=req.body.date;
  const date1= new Date(date);
  const formattedDate = date1.toISOString().split('T')[0];  // Extract the date portion of the ISO string
  // console.log(typeof formattedDate,formattedDate);
//   console.log("date ",date)
  let getMappingQuery = `use [StockUpload] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

  const mappingResult = await pool
    .request()
    .input("brandId", brandId)
    .query(getMappingQuery);

  if (mappingResult.recordset.length == 0) {
    return { mappingNotPresent: true };
  }
//   console.log("mapping result ",mappingResult)
  let mappedData = mappingResult.recordset[0];
  let fileData;
  let headers;
  let rowDataArray;
  if (brandId == 11 || brandId == 33) {
    fileData = await readExcelFileWithSubColumns(req.file.path);
    // rowData=fileData.data.splice(2);
    rowDataArray = fileData.data.splice(1);
  } else {
    fileData = await readExcelFile(req.file.path);
    // rowData=fileData.data.splice(1);
    rowDataArray = fileData.data;
  }

  headers = fileData.headers;

  rowData = rowDataArray.map((rowData1) => ({
    part_number: rowData1[mappedData.part_number],
    qty: rowData1[mappedData.stock_qty],
    availability: rowData1["availability"],
    status: rowData1["status"],
  }));

    // console.log("mapped data ",mappedData)
    let filteredRowData = rowData.filter((row) => {
      // Convert qty to a number safely (handle undefined/null cases)
      const stockQty = parseInt(row.qty, 10) ;
      // console.log("parse int ",stockQty)
      // Check if part_number exists and is not empty
      const hasPartNumber = row.part_number && row.part_number.trim() !== "";
    
      // Normalize headers
      const availabilityHeader = Object.keys(headers).find(
        (header) => header.toLowerCase() === "availability"
      );
      const statusHeader = Object.keys(headers).find(
        (header) => header.toLowerCase() === "status"
      );
    
      // Get availability and status values
      const availability = row[availabilityHeader]?.toLowerCase().trim();
      const status = row[statusHeader]?.toLowerCase().trim();
    
      // Remove rows where part_number is null/empty and qty > 0
      if (hasPartNumber && stockQty > 0) {
        return true;
      }
    
      // For brandId 17, 28, and 13, remove if availability is "on-hand" and status is not "good"
      if ([17, 28, 13].includes(brandId)) {
        if (availability === "on-hand" && status == "good") {
          return true;
        }
      }
    
      // return true; // Keep the row if it passed all filters
    });

    //  console.log("filtered data without null",filteredRowData.length)

  let partMasterQuery = `use [z_scope] select partnumber1 ,partID from part_master where brandId=@brandId`;

  const result = await pool
    .request()
    .input("brandId", brandId)
    .query(partMasterQuery);
  let partMasterResult = result.recordset;

  let partNotInMasterArray = [];
  //   console.log(partMasterResult)
  const getPartNumberQuery = `use [StockUpload] select partnumber from part_not_in_master where brand_id=@brandId`;
  let res123 = await pool
    .request()
    .input("brandId", brandId)
    .query(getPartNumberQuery);
  partNotInMasterArray = res123.recordset;

  let deletePartMasterQuery = `use [StockUpload] delete from part_not_in_master where brand_id=@brandId`;
  await pool.request().input("brandId", brandId).query(deletePartMasterQuery);

  let updatedFilteredRowData = [];

  let query12=`use [StockUpload] Select tcode from currentStock1 where locationId=@locationId`;
  const res45=await pool.request().input('locationId',locationId).query(query12);
 let  StockCode=res45?.recordset[0]?.tcode;
  let countPrevRecords=0;
  let insertedDataResult=[];
  let quantitySumPrev = 0;
  if(res45.recordset.length>0){

      let insertedDataQuery = `use [StockUpload] Select partNumber,partID,qty from currentStock2 where Stockcode=@StockCode`;
    
      let result56 = await pool
        .request()
        .input("StockCode", StockCode)
        .query(insertedDataQuery);
       insertedDataResult = result56.recordset;
      countPrevRecords = insertedDataResult.length;
      // console.log("stock code ",StockCode)
      if (insertedDataResult.length != 0) {
        // console.log("countRecords inserted ",countPrevRecords)
        // StockCode = insertedDataResult[0].StockCode;
        let quanitySumQuery = `use [StockUpload] Select sum(qty) as QuantSum from currentStock2 where StockCode=@StockCode`;
    
        let result567 = await pool
          .request()
          .input("StockCode", StockCode)
          .query(quanitySumQuery);
        // console.log("quantity sum ",result567.recordset)
        if (result567.recordset.length != 0) {
          quantitySumPrev = result567.recordset[0].QuantSum;
          // console.log("quant sum prev ",quantitySumPrev);
          let deleteQuery = `use [StockUpload] delete from currentStock2  where StockCode=@stockCode`;
          await pool
            .request()
            .input("stockCode", insertedDataResult[0].StockCode)
            .query(deleteQuery);
    
          let deleteQuery1 = `use [StockUpload] delete from currentStock1  where tcode=@stockCode`;
          await pool
            .request()
            .input("stockCode", insertedDataResult[0].StockCode)
            .query(deleteQuery1);
        }
    
       
      }
      let deleteCodeQuery=`use [StockUpload] delete from currentStock1 where tcode=@stockCode`;
      await pool
        .request()
        .input("StockCode", StockCode)
        .query(deleteCodeQuery);
      let deleteStockQuery=`use [StockUpload] delete from currentStock2 where stockcode=@stockCode`;
      let result569 = await pool
        .request()
        .input("StockCode", StockCode)
        .query(deleteStockQuery);
    //   filteredRowData=insertedDataResult;
  }
//   console.log("filtered row data ",filteredRowData.length,insertedDataResult.length)

//   console.log("filtered row data ",combinedData.length)
  for (const item of filteredRowData) {
    let deleteItem = false; // Flag to determine if the item should be deleted

    // Loop over the partMasterResult to find a match
    for (const element of partMasterResult) {
        // console.log("element ",element)
      if (item.part_number === element.partnumber1.trim()) {
        // Add the partid to the item if a match is found
        item.partId = element.partID; // Directly mutate the original item
        updatedFilteredRowData.push(item);
        // Reset deleteItem flag as match was found
        deleteItem = false;
        break; // Exit the loop after finding the match
      } else {
        deleteItem = true;
      }
    }

    // If no match was found, flag for deletion and add to partNotInMasterArray
    if (deleteItem) {
      const partnumber = item.part_number;
    //    console.log("partnumber ",item)
      const exists = partNotInMasterArray.some(
        (item1) => item1.partnumber == partnumber
      );
      if (!exists) {
        // console.log("exists ",partnumber)
        partNotInMasterArray.push({ partnumber: partnumber });
      }
    }
  }

  
//   console.log("part not in master ",partNotInMasterArray)
  // Create a map to track the occurrences of part_number and total stock_qty
  const partCountMap = new Map();

  // First, count the occurrences and accumulate stock_qty for each part_number
  for (const element of updatedFilteredRowData) {
    // Assuming partMasterResult contains part_number and stock_qty
    // console.log("element ",element)
    if (partCountMap.has(element.part_number)) {
      // console.log("part ",element);
      partCountMap.set(element.part_number, {
        partId: element.partId,
        count: partCountMap.get(element.part_number).count + 1,
        stockQty:
          parseFloat(partCountMap.get(element.part_number).stockQty) +
          parseFloat(element.qty),
      });
    } else {
      partCountMap.set(element.part_number, {
        count: 1,
        stockQty: parseFloat(element.qty),
        partId: element.partId,
      });
    }

  }

//    console.log("part count ",partCountMap)

  // console.log("updated filtered data ",partCountMap)
  updatedFilteredRowData = Array.from(
    partCountMap,
    ([partNumber, { stockQty, partId }]) => ({
      partNumber,
      qty: stockQty,
      partId: partId,
    })
  );
  //   console.log("updated filtered data ",partCountMap);

  if(insertedDataResult.length!=0){
     // console.log("updatedFiltered ",updatedFilteredRowData)
     updatedFilteredRowData.forEach((item) => {
        // console.log(item)
        let partID = item.partId;
        let qty = item.qty;
  
        for (let i = 0; i < insertedDataResult.length; i++) {
          const element = insertedDataResult[i];
          // console.log(element,partID)
          if (element.partID === partID) {
            // Add the qty to the item.qty
            item.qty = qty + element.qty;
            break; // Exit the loop after the first match
          }
        }
      });
  }
 
  let rowCount;
  let currentDate;

  let tCode;
    rowCount = updatedFilteredRowData?.length;
    let insertQueryForCurrentStock1 = `use [StockUpload] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;
  
    const result1 = await pool
      .request()
      .input("locationID", locationId)
      .input("formattedDate", formattedDate)
      .input("addedBy", addedBy)
      .query(insertQueryForCurrentStock1);
      StockCode = result1.recordset[0].tcode;
   
//  console.log("part not in master ",partNotInMasterArray)
  const values = partNotInMasterArray.map((item) => {
    return [
      parseInt(brandId, 10), // Ensure brandId is an integer
      item["partnumber"],
    ];
  });
  try {
    const table = new sql.Table("part_not_in_master"); // Updated table name
    table.create = false;

    table.columns.add("brand_id", sql.Int, { nullable: true });
    table.columns.add("partnumber", sql.VarChar(100), { nullable: true });
    // Add rows to the table
    values.forEach((row) => {
      table.rows.add(
        row[0],
        row[1] // brandid
      );
    });
    await pool.request().bulk(table);
  } catch (error) {
    console.error("Error during bulk insert: part not in master", error);
    return error; // Rethrow the error for further handling if necessary
  }

  // console.log(filteredRowData[0])
  const values1 = updatedFilteredRowData.map((item) => {
    return [
      parseInt(StockCode, 10),
      item["partNumber"],
      parseFloat(item["qty"]),
      item["partId"],
    ];
  });

  try {
    const table1 = new sql.Table("currentStock2"); // Updated table name
    table1.create = false;

    table1.columns.add("StockCode", sql.BigInt, { nullable: true });
    table1.columns.add("PartNumber", sql.VarChar(35), { nullable: true });
    table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: true });
    table1.columns.add("PartID", sql.Int, { nullable: true });
    // Add rows to the table
    values1.forEach((row) => {
      table1.rows.add(
        row[0],
        row[1], // brandid
        row[2],
        row[3]
      );
    });
    await pool.request().bulk(table1);
  } catch (error) {
    console.error("Error during bulk insert in single upload: ", error);
    return error; // Rethrow the error for further handling if necessary
  }
  let currentCountQuery = `use [StockUpload] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@StockCode`;
  let result678 = await pool
    .request()
    .input("StockCode", StockCode)
    .query(currentCountQuery);
  let currentQuantSum = 0;
  if (result678.recordset.length != 0) {
    currentQuantSum = result678.recordset[0].currentQuantSum;
  }

  let logQuery = `use [StockUpload] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, stockUploadCount,operation_type,quantitySum,
      prevStockUploadCount,prevQuantitySum,dealer_id) values(@locationId,@StockCode,@addedBy,@brandId,@rowCount,'single stock upload ',@currentQuantSum,@countPrevRecords,@quantitySumPrev,@dealerId)`;
  await pool
    .request()
    .input("StockCode", StockCode)
    .input("addedBy", addedBy)
    .input("currentQuantSum", currentQuantSum)
    .input("brandId", brandId)
    .input("locationId", locationId)
    .input("rowCount", rowCount)
    .input("quantitySumPrev", quantitySumPrev)
    .input("countPrevRecords", countPrevRecords)
    .input("dealerId", dealerId)
    .query(logQuery);

  return {
    currentSumQuantity: currentQuantSum,
    prevSumQuantity: quantitySumPrev,
    currentRecords: rowCount,
    prevRecords: countPrevRecords,
  };
    }
    catch(error){
        console.log("error ",error.message)
        return error;
    }
}

const getPartNotInMasterSingleUploadInService=async(req,res)=>{

    try{
        const pool=await getPool1();
        let brandId=req.brand_id;
        let getQuery = `use [StockUpload] Select partnumber from part_not_in_master where brand_id=@brandId`;
        const result1 = await pool
          .request()
          .input("brandId", brandId)
          .query(getQuery);
        // console.log(result1.recordset)
        return result1.recordset;
    }
    catch(error){
      console.log("error ",error.message)
        return error;
    }
}

const uploadStock=async(req,res)=>{
    try{
        const pool=await getPool1();
    }
    catch(error){
        return error;
    }
}

const getAllRecords=async(req,res)=>{
    try {
        const pool = await getPool1();
        let locationId = req.location_id;
        let userId=req.added_by;
        let getQuery = `use [StockUpload] select added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,prevStockUploadCount from stock_upload_logs where location_id=@locationId and added_by=@userId`;
    
        const result = await pool
          .request()
          .input("locationId", locationId)
          .input("userId", userId)
          .query(getQuery);
    
        return result.recordset;
      } catch (error) {
        console.log(
          "error in stock upload service in getAll records single loc",
          error.message
        );
        return error;
      }
}

const uploadBulkStock=async(req,res)=>{
  try{

    const pool=await getPool1();
    let addedBy = req.body.user_id;
    let rowData;
    let brandId=req.body.brand_id;
    let dealerId=req.body.dealer_id;
   let currentDate = new Date();
   let wrongDealerLocationInFile=[];
    // const date1= new Date(currentDate);
    let date=req.body.date;
    const date1= new Date(date);
    const formattedDate = date1.toISOString().split('T')[0];  // Extract the date portion of the ISO string
    // console.log(typeof formattedDate,formattedDate);
  //   console.log("date ",date)
  getLocationsQuery=`select locationId from locationInfo where dealerId=@dealerId`;
   let res56=await pool.request().input('dealerId',dealerId).query(getLocationsQuery);
   let locations=res56.recordset;

   console.log("locations ",locations)
    let getMappingQuery = `use [StockUpload] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;
  
    const mappingResult = await pool
      .request()
      .input("brandId", brandId)
      .query(getMappingQuery);
  
    if (mappingResult.recordset.length == 0) {
      return { mappingNotPresent: true };
    }
  //   console.log("mapping result ",mappingResult)

  let checkDealerLocationMappingQuery=`use [StockUpload] select inventory_location,locationID as locationId from dealer_location_mapping where dealerId=@dealerId`;
  const resDealerAndLoc=await pool.request().input('dealerId',dealerId).query(checkDealerLocationMappingQuery);
   if(resDealerAndLoc.recordset.length==0){
    return {dealerLocationMappingNotPresent:true}
   }

   let dealerLocationMappedData=resDealerAndLoc.recordset;
   
    let mappedData = mappingResult.recordset[0];
    let fileData;
    let headers;
    let rowDataArray;
    let filteredRowData;
    let combinedExistedData=[];
    if (brandId == 11 || brandId == 33) {
      fileData = await readExcelFileWithSubColumns(req.file.path);
      // rowData=fileData.data.splice(2);
      rowDataArray = fileData.data.splice(1);
    } else {
      fileData = await readExcelFile(req.file.path);
      // rowData=fileData.data.splice(1);
      rowDataArray = fileData.data;
    }
  
    headers = fileData.headers;
  
    rowData = rowDataArray.map((rowData1) => ({
      part_number: rowData1[mappedData.part_number],
      qty: rowData1[mappedData.stock_qty],
      availability: rowData1["availability"],
      status: rowData1["status"],
      location:rowData1[mappedData.loc]
    }));

    filteredRowData = rowData.filter((row) => {
      // Convert qty to a number safely (handle undefined/null cases)
      const stockQty = parseInt(row.qty, 10) ;
      // console.log("parse int ",stockQty)
      // Check if part_number exists and is not empty
      const hasPartNumber = row.part_number && row.part_number.trim() !== "";
    
      // Normalize headers
      const availabilityHeader = Object.keys(headers).find(
        (header) => header.toLowerCase() === "availability"
      );
      const statusHeader = Object.keys(headers).find(
        (header) => header.toLowerCase() === "status"
      );
    
      // Get availability and status values
      const availability = row[availabilityHeader]?.toLowerCase().trim();
      const status = row[statusHeader]?.toLowerCase().trim();
    
      // Remove rows where part_number is null/empty and qty > 0
      if (hasPartNumber && stockQty > 0) {
        return true;
      }
    
      // For brandId 17, 28, and 13, remove if availability is "on-hand" and status is not "good"
      if ([17, 28, 13].includes(brandId)) {
        if (availability === "on-hand" && status == "good") {
          return true;
        }
      }
    
      // return true; // Keep the row if it passed all filters
    });
    let partMasterQuery = `use z_scope select partnumber1 ,partID from part_master where brandId=@brandId`;

  const result = await pool
    .request()
    .input("brandId", brandId)
    .query(partMasterQuery);
  let partMasterResult = result.recordset;

  let partNotInMasterArray = [];
  //   console.log(partMasterResult)
  const getPartNumberQuery = `use [StockUpload] select partnumber from part_not_in_master where brand_id=@brandId`;
  let res123 = await pool
    .request()
    .input("brandId", brandId)
    .query(getPartNumberQuery);
  partNotInMasterArray = res123.recordset;

  let deletePartMasterQuery = `use [StockUpload] delete from part_not_in_master where brand_id=@brandId`;
  await pool.request().input("brandId", brandId).query(deletePartMasterQuery);

  let updatedFilteredRowData = [];
  // let locationIds= locations.map(location => location.locationId); 
  let query12=`use [StockUpload] SELECT tcode ,locationId FROM currentStock1 WHERE locationId IN (${locationIds.join(', ')})`;
  const res45=await pool.request().input('locations',locations).query(query12);
  let tCodeFromStock1=res45.recordset;
 
  let countPrevRecords=0;
  let insertedDataResult=[];
  let quantitySumPrev = 0;
  if(res45.recordset.length>0){

    let stockCodes=res45.recordset;
    let  StockCodes=stockCodes.map(code=>code.tcode);
      let insertedDataQuery = `use [StockUpload] Select stockcode,partNumber,partID,qty from currentStock2 where Stockcode in (${StockCodes.join(', ')})`;
    
      let result56 = await pool
        .request()
        .input("StockCodes", StockCodes)
        .query(insertedDataQuery);
       insertedDataResult = result56.recordset;
      countPrevRecords = insertedDataResult.length;
      // console.log("stock code ",StockCode)
      if (insertedDataResult.length != 0) {
        // console.log("countRecords inserted ",countPrevRecords)
        // StockCode = insertedDataResult[0].StockCode;
        let quanitySumQuery = `use [StockUpload] Select sum(qty) as QuantSum from currentStock2 where StockCode in (${StockCodes.join(',')})`;
    
        let result567 = await pool
          .request()
          .input("StockCode", StockCode)
          .query(quanitySumQuery);
        // console.log("quantity sum ",result567.recordset)
        if (result567.recordset.length != 0) {
          quantitySumPrev = result567.recordset[0].QuantSum;
          // console.log("quant sum prev ",quantitySumPrev);
          let deleteQuery = `use [StockUpload] delete from currentStock2  where StockCode in (${StockCodes.join(', ')})`;
          await pool
            .request()
            .input("StockCodes", StockCodes)
            .query(deleteQuery);
    
          let deleteQuery1 = `use [StockUpload] delete from currentStock1  where tcode in (${StockCodes.join(', ')})`;
          await pool
            .request()
            .input("StockCodes", StockCodes)
            .query(deleteQuery1);
        }
    
       
      }

      let deleteCodeQuery=`use [StockUpload] delete from currentStock1 where tcode in (${StockCodes.join(', ')})`;
      await pool
        .request()
        .input("StockCodes", StockCodes)
        .query(deleteCodeQuery);
      let deleteStockQuery=`use [StockUpload] delete from currentStock2 where stockcode in (${StockCodes.join(', ')})`;
      let result569 = await pool
        .request()
        .input("StockCodes", StockCodes)
        .query(deleteStockQuery);

    //   filteredRowData=insertedDataResult;
    combinedExistedData= insertedDataResult.flatMap(a1 => 
        tCodeFromStock1
            .filter(a2 => a1.tcode === a2.stockcode && a1.locationId === a2.tcode)
            .map(({ partnumber, qty, partId }) => ({ locationId: a1.locationId, partnumber, qty, partId }))
    );
   
    console.log("filerr row data ",combinedExistedData)
  }

  for (const item of filteredRowData) {
    let deleteItem = false; // Flag to determine if the item should be deleted

    // Loop over the partMasterResult to find a match
    for (const element of partMasterResult) {
        // console.log("element ",element)
      if (item.part_number === element.partnumber1.trim()) {
        // Add the partid to the item if a match is found
        item.partId = element.partID; // Directly mutate the original item
        // updatedFilteredRowData.push(item);
        // Reset deleteItem flag as match was found
        deleteItem = false;
        break; // Exit the loop after finding the match
      } else {
        deleteItem = true;
      }
    }

    if(!deleteItem){
    for(const element of dealerLocationMappedData){
      
        if (item.location === element.inventory_location.trim()) {
          // Add the partid to the item if a match is found
          item.locationId = element.locationId; // Directly mutate the original item
          updatedFilteredRowData.push(item);
          break; // Exit the loop after finding the match
        } 
        else{
          wrongDealerLocationInFile.push(location);
        }
      }
    }

    // If no match was found, flag for deletion and add to partNotInMasterArray
    if (deleteItem) {
      const partnumber = item.part_number;
    //    console.log("partnumber ",item)
      const exists = partNotInMasterArray.some(
        (item1) => item1.partnumber == partnumber
      );
      if (!exists) {
        // console.log("exists ",partnumber)
        partNotInMasterArray.push({ partnumber: partnumber });
      }
    }
  }

  console.log("filtered row data ",filteredRowData);

  const partCountMap = new Map();

  // First, count the occurrences and accumulate stock_qty for each part_number
  for (const element of updatedFilteredRowData) {
    const key = `${element.part_number}-${element.locationId}`; // Unique key for grouping

    if (partCountMap.has(key)) {
        const existing = partCountMap.get(key);
        partCountMap.set(key, {
            partId: element.partId,
            count: existing.count + 1,
            stockQty: existing.stockQty + parseFloat(element.qty),
            locationId: element.locationId
        });
    } else {
        partCountMap.set(key, {
            count: 1,
            stockQty: parseFloat(element.qty),
            partId: element.partId,
            locationId: element.locationId
        });
    }
}


//    console.log("part count ",partCountMap)

  // console.log("updated filtered data ",partCountMap)
  updatedFilteredRowData = Array.from(
    partCountMap,
    ([partNumber, { stockQty, partId,locationId }]) => ({
      partNumber,
      qty: stockQty,
      partId: partId,
      locationId:locationId
    })
  );


  
  if(insertedDataResult.length!=0){
    // console.log("updatedFiltered ",updatedFilteredRowData)
    updatedFilteredRowData.forEach((item) => {
       // console.log(item)
       let partID = item.partId;
       let qty = item.qty;
 
       for (let i = 0; i < insertedDataResult.length; i++) {
         const element = insertedDataResult[i];
         // console.log(element,partID)
         if (element.partID === partID && element.locationId==item.locationId) {
           // Add the qty to the item.qty
           item.qty = qty + element.qty;
           break; // Exit the loop after the first match
         }
       }
     });
 }

 const uniqueLocationIds = [...new Set(updatedFilteredRowData.map(item => item.locationId))];

console.log("unique location ids ",uniqueLocationIds);
let rowCount;
 let tCode;
   rowCount = updatedFilteredRowData?.length;
for(let i=0;i<uniqueLocationIds.length;i++){
  let locId=uniqueLocationIds[i];
  let getDataByLocationId = (locationId) => {
    return updatedFilteredRowData.filter(item => item.locationId === locId);
};

let insertQueryForCurrentStock1 = `use [StockUpload] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;
 
const result1 = await pool
  .request()
  .input("locationID", locId)
  .input("formattedDate", formattedDate)
  .input("addedBy", addedBy)
  .query(insertQueryForCurrentStock1);
  StockCode = result1.recordset[0].tcode;

   // console.log(filteredRowData[0])
 const values1 = getDataByLocationId.map((item) => {
  return [
    parseInt(StockCode, 10),
    item["partNumber"],
    parseFloat(item["qty"]),
    item["partId"],
  ];
});

try {
  const table1 = new sql.Table("currentStock2"); // Updated table name
  table1.create = false;

  table1.columns.add("StockCode", sql.BigInt, { nullable: true });
  table1.columns.add("PartNumber", sql.VarChar(35), { nullable: true });
  table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: true });
  table1.columns.add("PartID", sql.Int, { nullable: true });
  // Add rows to the table
  values1.forEach((row) => {
    table1.rows.add(
      row[0],
      row[1], // brandid
      row[2],
      row[3]
    );
  });
  await pool.request().bulk(table1);
} catch (error) {
  console.error("Error during bulk insert in single upload: ", error);
  return error; // Rethrow the error for further handling if necessary
}
}
 
//  console.log("part not in master ",partNotInMasterArray)
 const values = partNotInMasterArray.map((item) => {
   return [
     parseInt(brandId, 10), // Ensure brandId is an integer
     item["partnumber"],
   ];
 });
 try {
   const table = new sql.Table("part_not_in_master"); // Updated table name
   table.create = false;

   table.columns.add("brand_id", sql.Int, { nullable: true });
   table.columns.add("partnumber", sql.VarChar(100), { nullable: true });
   // Add rows to the table
   values.forEach((row) => {
     table.rows.add(
       row[0],
       row[1] // brandid
     );
   });
   await pool.request().bulk(table);
 } catch (error) {
   console.error("Error during bulk insert: part not in master", error);
   return error; // Rethrow the error for further handling if necessary
 }


 let currentCountQuery = `use [StockUpload] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@StockCode`;
 let result678 = await pool
   .request()
   .input("StockCode", StockCode)
   .query(currentCountQuery);
 let currentQuantSum = 0;
 if (result678.recordset.length != 0) {
   currentQuantSum = result678.recordset[0].currentQuantSum;
 }

 let logQuery = `use [StockUpload] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, stockUploadCount,operation_type,quantitySum,
     prevStockUploadCount,prevQuantitySum,dealer_id) values(@locationId,@StockCode,@addedBy,@brandId,@rowCount,'bulk stock upload ',@currentQuantSum,@countPrevRecords,@quantitySumPrev,@dealerId)`;
 await pool
   .request()
   .input("StockCode", StockCode)
   .input("addedBy", addedBy)
   .input("currentQuantSum", currentQuantSum)
   .input("brandId", brandId)
   .input("locationId", locationId)
   .input("rowCount", rowCount)
   .input("quantitySumPrev", quantitySumPrev)
   .input("countPrevRecords", countPrevRecords)
   .input("dealerId", dealerId)
   .query(logQuery);

 return {
   currentSumQuantity: currentQuantSum,
   prevSumQuantity: quantitySumPrev,
   currentRecords: rowCount,
   prevRecords: countPrevRecords,
 };
  }
  catch(error){
    console.log("error in bulk stock upload method in by user service ",error.message)
    return error;
  }
}

const getBulkRecordsInService=async(req,res)=>{
  try {
    const pool = await getPool1();
    let dealerId=req.dealer_id;
    let userId=req.added_by;
    let getLocationQuery=`Select locationId from locationInfo where status=1 and dealerId=@dealerId`;
    const result13= await pool.request().input('dealerId',dealerId).query(getLocationQuery);
    const locations=result13.recordset;

    let locationIds = locations.map(row => row.locationId); // Extract locationIds from locations

if (locationIds.length === 0) {
  return []; // Return an empty array if no locationIds are provided
}

// Dynamically generate parameter placeholders for the IN clause
const locationParams = locationIds.map((_, index) => `@loc${index}`).join(',');

let getQuery = `
  SELECT added_on, added_by, stockUploadCount, quantitySum, prevQuantitySum, prevStockUploadCount 
  FROM stock_upload_logs
  WHERE location_id IN (${locationParams}) AND added_by = @userId
`;

const request = pool.request();

// Bind each locationId separately
locationIds.forEach((id, index) => {
  request.input(`loc${index}`, id);
});

request.input("userId", userId);

const result = await request.query(getQuery);
return result.recordset;

  } catch (error) {
    console.log(
      "error in stock upload service in getAll records single loc",
      error.message
    );
    return {error:error};
  }
}

const getBulkDataInService=async(req,res)=>{
    try{
      const pool = await getPool1();
      let dealerId=req.dealer_id;
      let userId=req.added_by;
      let getLocationQuery=`Select locationId from locationInfo where status=1 and dealerId=@dealerId`;
      const result13= await pool.request().input('dealerId',dealerId).query(getLocationQuery);
      const locations=result13.recordset;
      let bulkUploadedData;
      let locationIds = locations.map(row => row.locationId); // Extract locationIds from locations
  
      if (locationIds.length === 0) {
        return []; // Return an empty array if no locationIds are provided
      }

      for(let i=0;i<locationIds.length;i++){
        let locationId=locationIds[i];
        let getTcodeQuery=`Select tcode from currentStock1 where locationId=@locationId`;
        const res= await pool.request().input('locationId',locationId).query(getTcodeQuery);
        tcode=res.recordset[0].tcode;

        console.log("tcode ",tcode);
        if(res.recordset.length>0){

          let getDataQuery=`select partNumber,qty from currentStock2 where stockCode=@tcode`;
           const res78=await pool.request().input('tcode',tcode).query(getDataQuery);
           bulkUploadedData.push(res78.recordset);
        }else{
          break;
        }
      }

      console.log("bulk uploaded data ",bulkUploadedData);
      return bulkUploadedData;
    }
    catch(error){
      console.log("error in get bulk data in service ",error.message);
      return error;
    }
}
export  {
    singleUploadStockInService,
    getPartNotInMasterSingleUploadInService,
    uploadStock,
    getAllRecords,
    uploadBulkStock,
    getBulkDataInService,
    getBulkRecordsInService
}