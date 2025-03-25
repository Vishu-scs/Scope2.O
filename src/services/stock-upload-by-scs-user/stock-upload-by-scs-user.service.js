import { getPool1 } from "../../db/db.js";
import {
  readExcelFile,
  readExcelFileWithSubColumns,
} from "../utilities/utilities.service.js";
import sql from "mssql";
const singleUploadStockInService = async (req, res) => {
  try {
    const pool = await getPool1();
    let locationId = req.body.location_id;
    let addedBy = req.body.user_id;
    let rowData;
    let brandId = req.body.brand_id;
    let dealerId = req.body.dealer_id;
    let date = req.body.date;
    const date1 = new Date(date);
    const formattedDate = date1.toISOString().split("T")[0]; // Extract the date portion of the ISO string
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
      part_number: rowData1[mappedData.part_number]
        .toString()
        .replace(/[^a-zA-Z0-9]/g, ""),
      qty: rowData1[mappedData.stock_qty],
      availability: rowData1["availability"],
      status: rowData1["status"],
    }));

    // console.log("mapped data ",mappedData)
    let filteredRowData = rowData.filter((row) => {
      // Convert qty to a number safely (handle undefined/null cases)
      const stockQty = parseInt(row.qty, 10);
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

    let query12 = `use [StockUpload] Select tcode from currentStock1 where locationId=@locationId`;
    const res45 = await pool
      .request()
      .input("locationId", locationId)
      .query(query12);
    let StockCode = res45?.recordset[0]?.tcode;
    let countPrevRecords = 0;
    let insertedDataResult = [];
    let quantitySumPrev = 0;
    if (res45.recordset.length > 0) {
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
      let deleteCodeQuery = `use [StockUpload] delete from currentStock1 where tcode=@stockCode`;
      await pool.request().input("StockCode", StockCode).query(deleteCodeQuery);
      let deleteStockQuery = `use [StockUpload] delete from currentStock2 where stockcode=@stockCode`;
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
        //  console.log("element ",item,element)
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

    if (insertedDataResult.length != 0) {
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

      if (updatedFilteredRowData.length < insertedDataResult.length) {
        const updatedMap = new Map(
          updatedFilteredRowData.map((item) => [item.partId, item])
        );

        // Check for missing records in insertedDataResult
        const missingRecords = insertedDataResult
          .filter((item) => !updatedMap.has(item.partID))
          .map((item) => ({
            partNumber: item.partNumber,
            partId: item.partID,
            qty: item.qty, // Convert qty to an integer
          }));

        // console.log("Missing Records:", missingRecords);

        updatedFilteredRowData.forEach((item) => {
          if (updatedMap.has(item.partId)) {
            const existing = insertedDataResult.find(
              (el) => el.partID === item.partId
            );
            // if (existing) {
            //     item.qty = parseInt(existing.qty, 10);
            // }
            item.qty = parseFloat(item.qty);
          }
        });

        // Add missing records to updatedFilteredRowData
        for (let j = 0; j < missingRecords.length; j++) {
          updatedFilteredRowData.push(missingRecords[j]);
        }
      }
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
  } catch (error) {
    console.log("error ", error.message);
    return error;
  }
};

const getPartNotInMasterSingleUploadInService = async (req, res) => {
  try {
    const pool = await getPool1();
    let brandId = req.brand_id;
    let getQuery = `use [StockUpload] Select partnumber from part_not_in_master where brand_id=@brandId`;
    const result1 = await pool
      .request()
      .input("brandId", brandId)
      .query(getQuery);
    // console.log(result1.recordset)
    return result1.recordset;
  } catch (error) {
    console.log("error ", error.message);
    return error;
  }
};

const uploadStock = async (req, res) => {
  try {
    const pool = await getPool1();
  } catch (error) {
    return error;
  }
};

const getAllRecords = async (req, res) => {
  try {
    const pool = await getPool1();
    let locationId = req.location_id;
    let userId = req.added_by;
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
};

const uploadBulkStock = async (req, res) => {
  try {
    const pool = await getPool1();
    let addedBy = req.body.user_id;
    let rowData;
    let brandId = req.body.brand_id;
    let dealerId = req.body.dealer_id;
    let currentDate = new Date();
    let wrongDealerLocationInFile = [];
    // const date1= new Date(currentDate);
    let date = req.body.date;
    const date1 = new Date(date);
    const formattedDate = date1.toISOString().split("T")[0]; // Extract the date portion of the ISO string
    // console.log(typeof formattedDate,formattedDate);
    //   console.log("date ",date)
    let getLocationsQuery = `select locationId from locationInfo where dealerId=@dealerId`;
    let res56 = await pool
      .request()
      .input("dealerId", dealerId)
      .query(getLocationsQuery);
    let locations = res56.recordset;

    // console.log("locations ", locations);
    let getMappingQuery = `use [StockUpload] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

    const mappingResult = await pool
      .request()
      .input("brandId", brandId)
      .query(getMappingQuery);

    if (mappingResult.recordset.length == 0) {
      return { mappingNotPresent: true };
    }
    //console.log("mapping result ", mappingResult);

    let checkDealerLocationMappingQuery = `use [StockUpload] select inventory_location,locationID as locationId from dealer_location_mapping where dealerId=@dealerId`;
    const resDealerAndLoc = await pool
      .request()
      .input("dealerId", dealerId)
      .query(checkDealerLocationMappingQuery);
    if (resDealerAndLoc.recordset.length == 0) {
      return { dealerLocationMappingNotPresent: true };
    }

    let dealerLocationMappedData = resDealerAndLoc.recordset;

    let mappedData = mappingResult.recordset[0];
    let fileData;
    let headers;
    let rowDataArray;
    let filteredRowData;
    let combinedExistedData = [];
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
      part_number: rowData1[mappedData.part_number]
      .toString()
      .replace(/[^a-zA-Z0-9]/g, ""),
      qty: rowData1[mappedData.stock_qty],
      availability: rowData1["availability"],
      status: rowData1["status"],
      location: rowData1[mappedData.loc],
    }));
    // console.log("row data ",rowData)

    filteredRowData = rowData.filter((row) => {
      // Convert qty to a number safely (handle undefined/null cases)
      const stockQty = parseInt(row.qty, 10);
      // console.log("parse int ",stockQty)
      // Check if part_number exists and is not empty
      const hasPartNumber = row.part_number !== "";

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
    let locationIds = locations.map((location) =>
      parseInt(location.locationId, 10)
    );
    // console.log("locationIds ", locationIds);

    let query12 = `
   USE [StockUpload]; 
   SELECT tcode, locationId 
   FROM currentStock1 
   WHERE locationId IN (${locationIds.map((_, i) => `@loc${i}`).join(", ")})
`;

    let request = pool.request();
    locationIds.forEach((id, i) => {
      request.input(`loc${i}`, sql.Int, id); // Assuming locationId is an integer
    });
    const res45 = await request.query(query12);

    let tCodeFromStock1 = res45.recordset;
    // console.log("tcode from stock 1 598", tCodeFromStock1);

    let countPrevRecords = 0;
    let insertedDataResult = [];
    let quantitySumPrev = 0;
    if (res45.recordset.length > 0) {
      let stockCodes = res45.recordset;
      let StockCodes = stockCodes.map((code) => parseInt(code.tcode, 10));
      console.log("stockcodes 606 line", StockCodes);
      let insertedDataQuery = `
    USE [StockUpload]; 
    SELECT stockcode, partNumber, partID, qty 
    FROM currentStock2 
    WHERE Stockcode IN (${StockCodes.map((_, i) => `@code${i}`).join(", ")})
`;

      let request = pool.request();
      StockCodes.forEach((code, i) => {
        request.input(`code${i}`, sql.Int, code); // Assuming Stockcode is a string
      });

      let result56 = await request.query(insertedDataQuery);

      insertedDataResult = result56.recordset;
      //console.log("stockCodes ",insertedDataResult)
      countPrevRecords = insertedDataResult.length;
      //console.log("count prev recorcds ",countPrevRecords)
      // console.log("stock code ",StockCode)

      if (insertedDataResult.length != 0) {
        // console.log("countRecords inserted ",countPrevRecords)
        // StockCode = insertedDataResult[0].StockCode;
        let quanitySumQuery = `
        USE [StockUpload]; 
        SELECT SUM(qty) AS QuantSum 
        FROM currentStock2 
        WHERE StockCode IN (${StockCodes.map((_, i) => `@code${i}`).join(", ")})
    `;

        let request = await pool.request();
        StockCodes.forEach((code, i) => {
          request.input(`code${i}`, sql.Int, code); // Assuming StockCode is a string
        });

        let result567 = await request.query(quanitySumQuery);
        console.log("quantity sum 642", result567.recordset);

        if (result567.recordset.length != 0) {
          quantitySumPrev = result567.recordset[0]?.QuantSum || 0;
          // console.log("quant sum prev ",quantitySumPrev);
          let deleteQuery = `
    USE [StockUpload]; 
    DELETE FROM currentStock2 
    WHERE StockCode IN (${StockCodes.map((_, i) => `@code${i}`).join(", ")})
`;

          let deleteQuery1 = `
    USE [StockUpload]; 
    DELETE FROM currentStock1 
    WHERE tcode IN (${StockCodes.map((_, i) => `@code${i}`).join(", ")})
`;

          let request = pool.request();
          StockCodes.forEach((code, i) => {
            request.input(`code${i}`, sql.Int, code); // Assuming StockCode and tcode are strings
          });

          // Execute the queries
          await request.query(deleteQuery);
          await request.query(deleteQuery1);
        }
      }

      let deleteCodeQuery = `
      USE [StockUpload]; 
      DELETE FROM currentStock1 
      WHERE tcode IN (${StockCodes.map((_, i) => `@code${i}`).join(', ')})
  `;
  
  let deleteStockQuery = `
      USE [StockUpload]; 
      DELETE FROM currentStock2 
      WHERE stockcode IN (${StockCodes.map((_, i) => `@code${i}`).join(', ')})
  `;
  
  let request1 = pool.request();
  StockCodes.forEach((code, i) => {
    request1.input(`code${i}`, sql.Int, code); // Assuming StockCodes are strings
  });
  
  // Execute DELETE queries
  await request1.query(deleteCodeQuery);

  let result569 = await request1.query(deleteStockQuery);
      //   filteredRowData=insertedDataResult;
      combinedExistedData = insertedDataResult.flatMap((a1) =>
        tCodeFromStock1
          .filter(
            (a2) => a1.tcode === a2.stockcode && a1.locationId === a2.tcode
          )
          .map(({ partnumber, qty, partId }) => ({
            locationId: a1.locationId,
            partnumber,
            qty,
            partId,
          }))
      );

      console.log("filerr row data 706", combinedExistedData);
    }

    //console.log("filtered row 713 ",filteredRowData)
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

      if (!deleteItem) {
        for (const element of dealerLocationMappedData) {
          //  console.log("element ",element,item)
          if (item.location && item.location.trim().toLowerCase() === element.inventory_location.trim().toLowerCase()) {
            // Add the partid to the item if a match is found
            item.locationId = element.locationId; // Directly mutate the original item
            updatedFilteredRowData.push(item);
            break; // Exit the loop after finding the match
          } else {
            wrongDealerLocationInFile.push(item.location);
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

   // console.log("filtered row data 755", updatedFilteredRowData);

    const partCountMap = new Map();


    // Group and accumulate stockQty for each partNumber + locationId
    for (const element of updatedFilteredRowData) {
      const key = `${element.part_number}-${element.locationId}`; // Unique key for grouping
     // console.log("element in updatef filtrered row ",element)
      if (partCountMap.has(key)) {
        const existing = partCountMap.get(key);
        partCountMap.set(key, {
          partNumber: element.part_number,
          count: existing.count + 1, // Increment count
          qty: existing.qty + element.qty, // Sum stockQty
          partId: element.partId,
          locationId: element.locationId,
        });
      } else {
        partCountMap.set(key, { ...element ,count:1}); // First entry
      }
    }
    
    console.log("part count", partCountMap);

    // console.log("updated filtered data ",partCountMap)
    updatedFilteredRowData = Array.from(
      partCountMap.values(), // Extract only values from the Map
      ({ part_number, qty, partId, locationId }) => ({
        part_number, // Keep only the part number without locationId
        qty: qty, // Renaming stockQty to qty
        partId,
        locationId
      })
    );

  // console.log("updated filtered row 792 ",updatedFilteredRowData)
    if (insertedDataResult.length != 0) {
       console.log("updatedFiltered ",updatedFilteredRowData)
      updatedFilteredRowData.forEach((item) => {
        // console.log(item)
        let partID = item.partId;
        let qty = item.qty;

        for (let i = 0; i < insertedDataResult.length; i++) {
          const element = insertedDataResult[i];
          // console.log(element,partID)
          if (
            element.partID === partID &&
            element.locationId == item.locationId
          ) {
            // Add the qty to the item.qty
            item.qty = qty + element.qty;
            break; // Exit the loop after the first match
          }
        }
      });
    }

    const uniqueLocationIds = [
      ...new Set(updatedFilteredRowData.map((item) => item.locationId)),
    ];

    console.log("unique location ids ", uniqueLocationIds);
    let rowCount;
    let StockCode;
    rowCount = updatedFilteredRowData?.length;
    for (let i = 0; i < uniqueLocationIds.length; i++) {
      let locId = uniqueLocationIds[i];
      let getDataByLocationId = (locationId) => {
        return updatedFilteredRowData.filter(
          (item) => item.locationId === locId
        );
      };

      console.log("updated filtered row after getting unique location id ",updatedFilteredRowData)

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
  } catch (error) {
    console.log(
      "error in bulk stock upload method in by user service ",
      error.message
    );
    return error;
  }
};

const getBulkRecordsInService = async (req, res) => {
  try {
    const pool = await getPool1();
    let dealerId = req.dealer_id;
    let userId = req.added_by;
    let getLocationQuery = `Select locationId from locationInfo where status=1 and dealerId=@dealerId`;
    const result13 = await pool
      .request()
      .input("dealerId", dealerId)
      .query(getLocationQuery);
    const locations = result13.recordset;

    let locationIds = locations.map((row) => row.locationId); // Extract locationIds from locations

    if (locationIds.length === 0) {
      return []; // Return an empty array if no locationIds are provided
    }

    // Dynamically generate parameter placeholders for the IN clause
    const locationParams = locationIds
      .map((_, index) => `@loc${index}`)
      .join(",");

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
    return { error: error };
  }
};

const getBulkDataInService = async (req, res) => {
  try {
    const pool = await getPool1();
    let dealerId = req.dealer_id;
    let userId = req.added_by;
    let getLocationQuery = `Select locationId from locationInfo where status=1 and dealerId=@dealerId`;
    const result13 = await pool
      .request()
      .input("dealerId", dealerId)
      .query(getLocationQuery);
    const locations = result13.recordset;
    let bulkUploadedData;
    let locationIds = locations.map((row) => row.locationId); // Extract locationIds from locations

    if (locationIds.length === 0) {
      return []; // Return an empty array if no locationIds are provided
    }

    for (let i = 0; i < locationIds.length; i++) {
      let locationId = locationIds[i];
      let getTcodeQuery = `Select tcode from currentStock1 where locationId=@locationId`;
      const res = await pool
        .request()
        .input("locationId", locationId)
        .query(getTcodeQuery);
      tcode = res.recordset[0].tcode;

      console.log("tcode ", tcode);
      if (res.recordset.length > 0) {
        let getDataQuery = `select partNumber,qty from currentStock2 where stockCode=@tcode`;
        const res78 = await pool
          .request()
          .input("tcode", tcode)
          .query(getDataQuery);
        bulkUploadedData.push(res78.recordset);
      } else {
        break;
      }
    }

    console.log("bulk uploaded data ", bulkUploadedData);
    return bulkUploadedData;
  } catch (error) {
    console.log("error in get bulk data in service ", error.message);
    return error;
  }
};
export {
  singleUploadStockInService,
  getPartNotInMasterSingleUploadInService,
  uploadStock,
  getAllRecords,
  uploadBulkStock,
  getBulkDataInService,
  getBulkRecordsInService,
};
