import { getPool1 } from "../../db/db.js"
import {
  readExcelFile,
  readExcelFileWithSubColumns,
} from "../utilities/utilities.service.js";
import sql from "mssql";
import yazl from 'yazl';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
const stockUploadSingleLocation = async (req, res) => {
  const pool = await getPool1();

  // let brandId=req.body.brand_id;

  let locationId = req.body.location_id;
  let addedBy = req.body.user_id;
  let rowData;
  let getDealerAndLocationQuery = `select dealerId,brandId from locationInfo where locationId=@locationId`;

  const result23 = await pool
    .request()
    .input("locationId", locationId)
    .query(getDealerAndLocationQuery);
  // console.log("get dealer and loc id ",result23)
  let brandId = result23.recordset[0].brandId;
  let dealerId = result23.recordset[0].dealerId;

  let getMappingQuery = `select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

  const mappingResult = await pool
    .request()
    .input("brandId", brandId)
    .query(getMappingQuery);

  if (mappingResult.recordset.length == 0) {
    return { mappingNotPresent: true };
  }

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

  //  console.log("mapped data ",mappedResult)
  let filteredRowData = rowData.filter((row) => {
    // Normalize all headers to lowercase
    const availabilityHeader = Object.keys(headers).find(
      (header) => header.toLowerCase() === "availability"
    );
    const statusHeader = Object.keys(headers).find(
      (header) => header.toLowerCase() === "status"
    );

    if (brandId === 17 || brandId === 28 || brandId === 13) {
      // Ensure part_number is not empty, stock_qty is >= 0,
      // Availability is not 'on-hand', or status is 'good'
      return (
        (row.part_number || row.part_number >= 0) &&
        ((row[availabilityHeader] &&
          row[availabilityHeader].toLowerCase().trim() !== "on-hand") ||
          (row[statusHeader] &&
            row[statusHeader].toLowerCase().trim() === "good"))
      );
    } else {
      // For other brands, just check part_number and stock_qty
      return row.part_number || row.qty >= 0;
    }
  });

  //   console.log("filtered data without null",filteredRowData.length)

  let partMasterQuery = `select partnumber1 ,partID from part_master where brandId=@brandId`;

  const result = await pool
    .request()
    .input("brandId", brandId)
    .query(partMasterQuery);
  let partMasterResult = result.recordset;

  let partNotInMasterArray = [];
  //   console.log(partMasterResult)
  const getPartNumberQuery = `select partnumber from part_not_in_master where brand_id=@brandId`;
  let res123 = await pool
    .request()
    .input("brandId", brandId)
    .query(getPartNumberQuery);
  partNotInMasterArray = res123.recordset;

  let deletePartMasterQuery = `delete from part_not_in_master where brand_id=@brandId`;
  await pool.request().input("brandId", brandId).query(deletePartMasterQuery);

  let updatedFilteredRowData = [];

  let query12=`Select tcode from currentStock1 where locationId=@locationId`;
  const res45=await pool.request().input('locationId',locationId).query(query12);
 let  StockCode=res45?.recordset[0]?.tcode;
  let countPrevRecords=0;
  let insertedDataResult=[];

  let quantitySumPrev = 0;
  if(res45.recordset.length>0){

      let insertedDataQuery = `Select partNumber,partID,qty from currentStock2 where Stockcode=@StockCode`;
    
      let result56 = await pool
        .request()
        .input("StockCode", StockCode)
        .query(insertedDataQuery);
       insertedDataResult = result56.recordset;
      countPrevRecords = insertedDataResult.length;
      console.log("stock code ",StockCode)
      if (insertedDataResult.length != 0) {
        // console.log("countRecords inserted ",countPrevRecords)
        // StockCode = insertedDataResult[0].StockCode;
        let quanitySumQuery = `Select sum(qty) as QuantSum from currentStock2 where StockCode=@StockCode`;
    
        let result567 = await pool
          .request()
          .input("StockCode", StockCode)
          .query(quanitySumQuery);
        console.log("quantity sum ",result567.recordset)
        if (result567.recordset.length != 0) {
          quantitySumPrev = result567.recordset[0].QuantSum;
          // console.log("quant sum prev ",quantitySumPrev);
          let deleteQuery = `delete from currentStock2  where StockCode=@stockCode`;
          await pool
            .request()
            .input("stockCode", insertedDataResult[0].StockCode)
            .query(deleteQuery);
    
          let deleteQuery1 = `delete from currentStock1  where tcode=@stockCode`;
          await pool
            .request()
            .input("stockCode", insertedDataResult[0].StockCode)
            .query(deleteQuery1);
        }
    
       
      }
      let deleteCodeQuery=`delete from currentStock1 where tcode=@stockCode`;
      await pool
        .request()
        .input("StockCode", StockCode)
        .query(deleteCodeQuery);
      let deleteStockQuery=`delete from currentStock2 where stockcode=@stockCode`;
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

    // console.log("updated filtered row ",updatedFilteredRowData)
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
//   console.log("part count ",partCountMap)

//    console.log("updated filtered data ",partCountMap)
  updatedFilteredRowData = Array.from(
    partCountMap,
    ([partNumber, { stockQty, partId }]) => ({
      partNumber,
      qty: stockQty,
      partId: partId,
    })
  );
    //  console.log("updated filtered data ",updatedFilteredRowData);

  let rowCount;
  let currentDate;
  let formattedDate;
  let tCode;
  currentDate = new Date();
  
  formattedDate = currentDate.toISOString().split("T")[0]; // Outputs: '2025-03-08'
  if (insertedDataResult.length != 0) {
    // console.log("countRecords inserted ",countPrevRecords)
    // StockCode = insertedDataResult[0].StockCode;
    // let quanitySumQuery = `Select sum(qty) as QuantSum from currentStock2 where StockCode=@StockCode`;

    // let result567 = await pool
    //   .request()
    //   .input("StockCode", StockCode)
    //   .query(quanitySumQuery);

    // if (result567.recordset.length != 0) {
    //   quantitySumPrev = result567.recordset[0].QuantSum;
    // //    console.log("quant sum prev ",quantitySumPrev);
    //   let deleteQuery = `delete from currentStock2  where StockCode=@stockCode`;
    //   await pool
    //     .request()
    //     .input("stockCode", insertedDataResult[0].StockCode)
    //     .query(deleteQuery);

    //   let deleteQuery1 = `delete from currentStock1  where tcode=@stockCode`;
    //   await pool
    //     .request()
    //     .input("stockCode", insertedDataResult[0].StockCode)
    //     .query(deleteQuery1);
    // }

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
  
    rowCount = updatedFilteredRowData?.length;
    let insertQueryForCurrentStock1 = `insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;
  
    const result1 = await pool
      .request()
      .input("locationID", locationId)
      .input("formattedDate", formattedDate)
      .input("addedBy", addedBy)
      .query(insertQueryForCurrentStock1);
      StockCode = result1.recordset[0].tcode;
   

      
    // tCode = result178.recordset[0].tcode;
  

  // Log the updated partCountObj
  //  console.log(updatedFilteredRowData);

 

  //  console.log("tCode ",tCode)
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
  let currentCountQuery = `select sum(qty) as currentQuantSum from currentStock2 where stockCode=@StockCode`;
  let result678 = await pool
    .request()
    .input("StockCode", StockCode)
    .query(currentCountQuery);
  let currentQuantSum = 0;
  if (result678.recordset.length != 0) {
    currentQuantSum = result678.recordset[0].currentQuantSum;
  }

  let logQuery = `insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, stockUploadCount,operation_type,quantitySum,
      prevStockUploadCount,prevQuantitySum) values(@locationId,@StockCode,@addedBy,@brandId,@rowCount,'single-location upload stock',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
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
    .query(logQuery);

  return {
    currentSumQuantity: currentQuantSum,
    prevSumQuantity: quantitySumPrev,
    currentRecords: rowCount,
    prevRecords: countPrevRecords,
  };
};

const getPartNotInMasterSingleLocationInService = async (req, res) => {
  try {
    const pool = await getPool1();

    let locationId = req.location_id;

    let getBrandQuery = `Select brandId from locationInfo where locationId=@locationId`;
    const result = await pool
      .request()
      .input("locationId", locationId)
      .query(getBrandQuery);
    let brandId = result.recordset[0].brandId;
    // console.log(brandId);
    let getQuery = `Select partnumber from part_not_in_master where brand_id=@brandId`;
    const result1 = await pool
      .request()
      .input("brandId", brandId)
      .query(getQuery);
    // console.log(result1.recordset)
    return result1.recordset;
  } catch (error) {
    console.log("error in service ", error.message);
    return error;
  }
};

const getAllRecordsSingleLocation = async (req, res) => {
  try {
    const pool = await getPool1();
    let locationId = req.location_id;
    let userId=req.added_by;
    let getQuery = `select added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,prevStockUploadCount from stock_upload_logs where location_id=@locationId and added_by=@userId`;

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
};


const getUploadedDataSingleLocationInService = async (req, res) => {
  try {
    const pool = await getPool1();
    let locationId = req.location_id;
    let getQuery = `select ck2.partnumber,ck2.qty from currentStock2 ck2 join 
        currentStock1 ck1 on ck1.tcode=ck2.StockCode where locationId=@locationId`;

    const result = await pool
      .request()
      .input("locationId", locationId)
      .query(getQuery);

    return result.recordset;
  } catch (error) {
    console.log(
      "error in  stock upload service get upload data single location",
      error.message
    );
    return error;
  }
};

const stockUploadMultiLocation = async (req, res) => {
  // console.log("req ",req.body.location_id,req.files);
  try {
    let location=req.body.location_id
    let locations = req.body.location_id;
    // console.log(typeof location)
    if(typeof location=='string'){
        locations=[location];
    }
    //  console.log("location ",locations)

    let dealerId = parseInt(req.body.dealer_id);
    let files = req.files;
    // console.log(files,files[0].path)
    const pool=await getPool1();
    let addedBy = parseInt(req.body.user_id);

    let brandQuery = `select brandId,brand from locationInfo where dealerID=@dealerId`;
    let brandRes = await pool
      .request()
      .input("dealerId", dealerId)
      .query(brandQuery);
    let brandId = brandRes.recordset[0].brandId;
    // console.log("brandid in stock upload multi location ",brandId)
    let getMappingQuery = `select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

    const mappingResult = await pool
      .request()
      .input("brandId", brandId)
      .query(getMappingQuery);

    if (mappingResult.recordset.length == 0) {
      return { mappingNotPresent: true };
    }

    let mappedData = mappingResult.recordset[0];
    // console.log("mapped data in stock upload multi location ",mappedData);
    let partMasterQuery = `select partnumber1 ,partID from part_master where brandId=@brandId`;

    const result = await pool
      .request()
      .input("brandId", brandId)
      .query(partMasterQuery);
    let partMasterResult = result.recordset;
    // console.log(" part master result in stock upload multi location ",partMasterResult)
    let partNotInMasterArray = [];
    const getPartNumberQuery = `select partnumber as partnumber from part_not_in_master where brand_id=@brandId`;
    let res123 = await pool
      .request()
      .input("brandId", brandId)
      .query(getPartNumberQuery);
    partNotInMasterArray = res123.recordset;
//    console.log("part not in master in stock upload multi loc ",partNotInMasterArray)

    let deletePartMasterQuery = `delete from part_not_in_master where brand_id=@brandId`;
    await pool.request().input("brandId", brandId).query(deletePartMasterQuery);

  
   
   
    for (let i = 0; i < locations.length; i++) {
        // console.log("exexuted ")
      let locationId = locations[i];
      let updatedFilteredRowData = [];
      let rowData;
      let fileData;
      let headers;
      let rowDataArray=[];
      if (brandId == 11 || brandId == 33) {
        fileData = await readExcelFileWithSubColumns(files[i].path);
        // rowData=fileData.data.splice(2);
        rowDataArray = fileData.data.splice(1);
      } else {
        fileData = await readExcelFile(files[i].path);
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

      let query12=`Select tcode from currentStock1 where locationId=@locationId`;
  const res45=await pool.request().input('locationId',locationId).query(query12);
 let  StockCode=res45?.recordset[0]?.tcode;
  let countPrevRecords=0;
  let insertedDataResult=[];
// console.log("tcode ",StockCode,locationId)
  if(res45.recordset.length>0){

      let insertedDataQuery = `Select partNumber,partID,qty from currentStock2 where Stockcode=@StockCode`;
    
      let result56 = await pool
        .request()
        .input("StockCode", StockCode)
        .query(insertedDataQuery);
       insertedDataResult = result56.recordset;
      countPrevRecords = insertedDataResult.length;
     
      let deleteCodeQuery=`delete from currentStock1 where tcode=@stockCode`;
      await pool
        .request()
        .input("StockCode", StockCode)
        .query(deleteCodeQuery);
      let deleteStockQuery=`delete from currentStock2 where stockcode=@stockCode`;
      let result569 = await pool
        .request()
        .input("StockCode", StockCode)
        .query(deleteStockQuery);
    //   filteredRowData=insertedDataResult;
  }

      //  console.log("mapped data ",mappedResult)
      let filteredRowData = rowData.filter((row) => {
        // Normalize all headers to lowercase
        const availabilityHeader = Object.keys(headers).find(
          (header) => header.toLowerCase() === "availability"
        );
        const statusHeader = Object.keys(headers).find(
          (header) => header.toLowerCase() === "status"
        );

        if (brandId === 17 || brandId === 28 || brandId === 13) {
          // Ensure part_number is not empty, stock_qty is >= 0,
          // Availability is not 'on-hand', or status is 'good'
          return (
            (row.part_number || row.part_number >= 0) &&
            ((row[availabilityHeader] &&
              row[availabilityHeader].toLowerCase().trim() !== "on-hand") ||
              (row[statusHeader] &&
                row[statusHeader].toLowerCase().trim() === "good"))
          );
        } else {
          // For other brands, just check part_number and stock_qty
          return row.part_number || row.qty >= 0;
        }
      });
    //    console.log("filtered data in multi loc ",filteredRowData)
  
      for (const item of filteredRowData) {
        let deleteItem = false; // Flag to determine if the item should be deleted

        // Loop over the partMasterResult to find a match
        for (const element of partMasterResult) {
            // console.log("part number ",element,"item ",item)
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
        //   console.log("item in stock upload multi location ",item,partnumber)
        //    console.log("partnumber ",partnumber,partNotInMasterArray[0])
          const exists = partNotInMasterArray.some(
            (item1) => item1.partnumber === partnumber
          );
          if (!exists) {
            partNotInMasterArray.push({ partnumber: partnumber });
          }
        }
      }
    // console.log("partr not in master ",updatedFilteredRowData)
    // console.log("inserted data ",insertedDataResult)

  
    const partCountMap = new Map();

  
    //    console.log("combined data wiht location id ",locationId,combinedData)
      // First, count the occurrences and accumulate stock_qty for each part_number
      for (const element of updatedFilteredRowData) {
        // Assuming partMasterResult contains part_number and stock_qty
        if (partCountMap.has(element.part_number)) {
        //    console.log("part ",element);
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
        //  console.log("part count ",partCountMap)
    //    console.log("updated filtered data ",)
    let updatedFilteredRowData1=[];
      updatedFilteredRowData1 = Array.from(
        partCountMap,
        ([partNumber, { stockQty, partId }]) => ({
          partNumber,
          qty: stockQty,
          partId: partId,
        })
      );
// console.log("updated filtered data ",updatedFilteredRowData1);
const combinedData = updatedFilteredRowData1.map(item => {
    // Check if part_number exists
    if (!item.partNumber) {
    //   console.error(`Missing part_number in item:`, item);
      return item; // Skip or handle the missing data
    }
  
    const match = insertedDataResult.find(additional => additional.partNumber === item.partNumber);
  
    if (match) {
      item.qty = (parseInt(item.qty) + match.qty).toString();  // Ensure qty is a string
    }
  
    return item;
  });

//   console.log("location id combine data ",locationId,combinedData)
   // Create a map to track the occurrences of part_number and total stock_qty
   let updatedFilteredRowData2=[];
   updatedFilteredRowData2 =combinedData;
      let quantitySumPrev = 0;
      
    
      let rowCount = updatedFilteredRowData2?.length;
      let currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Outputs: '2025-03-08'
      // console.log(formattedDate);
      let insertQueryForCurrentStock1 = `insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;

      const result1 = await pool
        .request()
        .input("locationID", locationId)
        .input("formattedDate", formattedDate)
        .input("addedBy", addedBy)
        .query(insertQueryForCurrentStock1);
      let tCode = result1.recordset[0].tcode;

      const values1 = updatedFilteredRowData2.map((item) => {
        return [
          parseInt(tCode, 10),
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
        console.error("Error during bulk insert:", error);
        return error; // Rethrow the error for further handling if necessary
      }
      let currentCountQuery = `select sum(qty) as currentQuantSum from currentStock2 where stockCode=@tCode`;
      let result678 = await pool
        .request()
        .input("tCode", tCode)
        .query(currentCountQuery);
      let currentQuantSum = 0;
      if (result678.recordset.length != 0) {
        currentQuantSum = result678.recordset[0].currentQuantSum;
      }

      let logQuery = `insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, stockUploadCount,operation_type,quantitySum,
prevStockUploadCount,prevQuantitySum) values(@locationId,@tCode,@addedBy,@brandId,@rowCount,'multi-location upload stock',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
      await pool
        .request()
        .input("tCode", tCode)
        .input("addedBy", addedBy)
        .input("currentQuantSum", currentQuantSum)
        .input("brandId", brandId)
        .input("locationId", locationId)
        .input("rowCount", rowCount)
        .input("quantitySumPrev", quantitySumPrev)
        .input("countPrevRecords", countPrevRecords)
        .query(logQuery);
    }

    // console.log("part not in master in multi stock upload ",partNotInMasterArray)

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
  } catch (error) {
    console.log("error ", error.message);
    return error;
  }
};

const getAllRecordsMultiLocation=async (req,res)=>{

    try {
        const pool = await getPool1();
        let locations=req.locations;
        let data=[];
        let userId=req.added_by;
        for(let i=0;i<locations.length;i++){
            let locationId =locations[i].location;
            let getQuery = `select location_id,added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,prevStockUploadCount from stock_upload_logs where location_id=@locationId and added_by=@userId`;
    
            let result = await pool
              .request()
              .input("locationId", locationId)
              .input("userId", userId)
              .query(getQuery);
        
            data.push(result.recordset);
        }
        return data;
      } catch (error) {
        console.log(
          "error in stock upload service in getAll records multi loc",
          error.message
        );
        return error;
      }
}

const getUploadedDataMultiLocationInService=async(req,res)=>{

    const pool = await getPool1();
    const locations = req.locations; // Assuming locations are passed in the request bod
 
    // console.log(locations)
  
    try {
        // Create a ZIP file in memory
        const archive = new yazl.ZipFile();
    
        // Loop through locations and fetch data for each location
        for (let i = 0; i < locations.length; i++) {
          const locationId = locations[i].location;
    
        //   console.log("location id ",locationId)
          try {

            const getBrandQuery = `SELECT location FROM locationInfo WHERE locationId = @locationId`;
            const result = await pool
              .request()
              .input('locationId', locationId)
              .query(getBrandQuery);
    
            // let brandId = result.recordset[0].brandId;
            let locationName=result.recordset[0].location;
            let getQuery = `select ck2.partnumber,ck2.qty from currentStock2 ck2 join 
                currentStock1 ck1 on ck1.tcode=ck2.StockCode where locationId=@locationId`;
            
           let result1= await pool.request().input('locationId',locationId).query(getQuery);   
            // Prepare data to store in the Excel file
            let locationData;
            if(result1.recordset.length>0){
                 locationData = result1.recordset.map(record => ({
                  Location: locationName,
                  PartNumber: record.partnumber,
                  Quantity:record.qty
                }));

            }
    
            // Create an Excel file for the location
            const ws = xlsx.utils.json_to_sheet(locationData);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Uploaded Data');
    
            // Write the Excel file to a temporary buffer (in-memory)
            const tempBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
            // Add the buffer directly to the ZIP file
            archive.addBuffer(tempBuffer, `uploadedData_${locationName}.xlsx`);
          } catch (error) {
            console.error('Error in get uploaded data in multi:', error.message);
          }
        }
    
        // Finalize the ZIP file and return it as a buffer
        const zipBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          archive.outputStream.on('data', chunk => chunks.push(chunk));
          archive.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
          archive.outputStream.on('error', reject);
          archive.end();
        });
    
        // Return the zipBuffer to be sent in the controller
        return zipBuffer;
    
      } catch (error) {
        console.error('Error in service multilocation :', error.message);
        throw new Error('Error generating ZIP file');
      }
   
}

const getPartNotInMasterMultiLocationInService=async(req,res)=>{

    const pool = await getPool1();
    const locations = req.locations; // Assuming locations are passed in the request bod
 
  
    try {
        // Create a ZIP file in memory
        const archive = new yazl.ZipFile();
    
        // Loop through locations and fetch data for each location
        for (let i = 0; i < locations.length; i++) {
          const locationId = locations[i].location;
    
          try {
            // Fetch brandId for the location
            const getBrandQuery = `SELECT brandId,location FROM locationInfo WHERE locationId = @locationId`;
            const result = await pool
              .request()
              .input('locationId', locationId)
              .query(getBrandQuery);
    
            let brandId = result.recordset[0].brandId;
            let locationName=result.recordset[0].location;
    
            // Fetch partnumbers based on brandId
            const getQuery = `SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId`;
            const result1 = await pool
              .request()
              .input('brandId', brandId)
              .query(getQuery);
    
            // Prepare data to store in the Excel file
            const locationData = result1.recordset.map(record => ({
              Location: locationName,
              PartNumber: record.partnumber,
            }));
    
            // Create an Excel file for the location
            const ws = xlsx.utils.json_to_sheet(locationData);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Part Not In Master');
    
            // Write the Excel file to a temporary buffer (in-memory)
            const tempBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
            // Add the buffer directly to the ZIP file
            archive.addBuffer(tempBuffer, `part_not_in_master_${locationName}.xlsx`);
          } catch (error) {
            console.error('Error in get part not in master:', error.message);
          }
        }
    
        // Finalize the ZIP file and return it as a buffer
        const zipBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          archive.outputStream.on('data', chunk => chunks.push(chunk));
          archive.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
          archive.outputStream.on('error', reject);
          archive.end();
        });
    
        // Return the zipBuffer to be sent in the controller
        return zipBuffer;
    
      } catch (error) {
        console.error('Error in part not in master multi loc service:', error.message);
        throw new Error('Error generating ZIP file');
      }
}

export {
  stockUploadSingleLocation,
  getPartNotInMasterSingleLocationInService,
  getAllRecordsSingleLocation,
  getUploadedDataSingleLocationInService,
  stockUploadMultiLocation,
  getUploadedDataMultiLocationInService,
  getPartNotInMasterMultiLocationInService,
  getAllRecordsMultiLocation
};
