import { getPool1 } from "../../db/db.js"
import {readExcelFile} from '../utilities/utilities.service.js'
import sql from 'mssql';
const addDealerLocationMappingInService=async (req,res)=>{
    try{
        let brandId=req.body.brand_id;
        let fileData;
        let rowData;
        let rowCount;
        let headers;
        let userId=parseInt(req.body.added_by,10);
        let filePath=req.file.path;
       let  isDealerAndLocationExist=true;        
        fileData=await readExcelFile(filePath)
        const pool=await getPool1();
        const dealerLocationNotInMaster = [];
        headers=fileData.headers;
        rowData=fileData.data;
        rowCount=rowData.length;
        // console.log("brand Id ",brandId,rowCount,headers);

     
        const  lowerCaseHeaders=headers.map((header)=> header.trim().toLowerCase());

        if(!lowerCaseHeaders.includes('dealer') && !lowerCaseHeaders.includes('location')){
            isDealerAndLocationExist=false
            console.log("is dealer location exist in file ",isDealerAndLocationExist)
            return {isDealerAndLocationPresent:isDealerAndLocationExist};
        }

        // console.log("pahuch gya yha tak")
         let isDealerAndLocationNull=await checkFields(rowData);
        //   console.log("is dealer location null in file ",isDealerAndLocationNull)

         if(isDealerAndLocationNull){
            return {isDealerAndLocationNull:isDealerAndLocationNull}
         }

         let getDealerAndLocationQuery='use [z_scope] Select dealer,location,dealerId,locationId from locationInfo where status=1 and dealerStatus=1 and brandId=@brandId';
         const res=await pool.request().input('brandId',brandId).query(getDealerAndLocationQuery);
         let dealerAndLocationResult=res.recordset;
        //  console.log("dealer location result",dealerAndLocationResult)
        //  let dealerLocationNotInMaster=[];

         rowData.forEach((row,index)=>{

            const normalizedItem=Object.keys(row).reduce((acc,key)=>{
                acc[key.trim().toLowerCase()]=row[key];
                return acc


            },{});
        
            rowData[index]=normalizedItem;
            // console.log(normalizedItem)
            // console.log("dealer location ",dealerAndLocationResult)
           
            const exists = dealerAndLocationResult.some(obj2 => obj2.dealer.trim() === normalizedItem.dealer.trim() && normalizedItem.location.trim() === obj2.location.trim());
    
            // console.log("exists ",exists)
    // If it does not exist, push the object into array2
            if (!exists) {
                dealerLocationNotInMaster.push(normalizedItem);
            }else{
                const matchingItem = dealerAndLocationResult.find(obj2 => {

                    return  obj2.dealer.trim() === normalizedItem.dealer &&
                      normalizedItem.location.trim() === obj2.location
                    
                });
            //   console.log("matching item ",matchingItem)

                  if (matchingItem) {
                    // Add `dealerId` and `locationId` to the normalized item
                    normalizedItem.dealerId = matchingItem.dealerId;
                    normalizedItem.locationId = matchingItem.locationId;
                  }
            }

           
        })
        //  console.log("dealer location not in master ",dealerLocationNotInMaster)

        if(dealerLocationNotInMaster.length!=0){
            return {dealerLocationNotInMasterPresent:true}
        }
            // console.log("rowData ",rowData)

          
      let currentDateTime =await getCurrentDateTimeInIST();
      let operation= "create dealer location mapping"
            const values = rowData.map(item => {
               
                return [
                    parseInt(brandId, 10),  // Ensure brandId is an integer
                    parseInt(item["dealerId"], 10), // Ensure dealerId is an integer
                    item["inventory location"].toString(),  // Ensure inventory_location is a string
                    parseInt(item["locationId"], 10), // Ensure locationId is an integer
                    parseInt(userId, 10), // Ensure userId is an integer
                   operation,
                   item["dealer"],
                   item["location"]

            ]
            })

            // console.log("values ",values);
        
            try {
                await pool.request().query('use [stockupload]')
            const table = new sql.Table('Dealer_Location_Mapping'); // Updated table name
            table.create = false;
        
            table.columns.add('brandId', sql.Int, { nullable: true }); 
            table.columns.add('dealerId', sql.Int, { nullable: true }); 
            table.columns.add('inventory_location', sql.VarChar(100), { nullable: true }); 
            table.columns.add('locationID', sql.Int, { nullable: true });
            table.columns.add('added_by', sql.Int, { nullable: true }); 
            //  table.columns.add('added_on', sql.DateTime, { nullable: true, default: sql`GETDATE()` }); 
            table.columns.add('operation', sql.VarChar(100), { nullable: true }); 
            table.columns.add('dealer', sql.VarChar(200), { nullable: true }); 
            table.columns.add('location', sql.VarChar(200), { nullable: true }); 
        
            // Add rows to the table
            values.forEach((row) => {
                table.rows.add(
                    row[0],  // brandid
                    row[1],  // dealerid
                    row[2],  // inventory_location
                    row[3],  // locationid
                    row[4],  // added_by
                    row[5],
                    row[6],   // operation
                    row[7],
                  
                      
                   
                );
            });
            await pool.request().bulk(table);
            
           
        } catch (error) {
            console.error('Error during bulk insert:', error);
            return error; // Rethrow the error for further handling if necessary
        }

        let logQuery=` use [StockUpload] Insert into Stock_Upload_Logs(brand_id,added_by,operation_type,dealerLocationMappingRowCount) 
        values(@brandId,@userId,'create dealer location mapping',@rowCount)`;

        await pool.request().input('brandId',brandId)
        .input('userId',userId)
        .input('rowCount',rowCount).query(logQuery)

        return {insertedSuccessfully:true}
    }
    catch(error){
        console.log("error",error.message)
        return error;
    }
}
const checkFields=async(arr)=>{

   arr= await convertKeysToLowercase(arr);
    return arr.some(item => (item.dealer === null || item.dealer==undefined) || item.location === null|| item.location==undefined);
}
const convertKeysToLowercase = (arr) => {
    return arr.map(item => {
      const newItem = {};
      for (let key in item) {
        if (item.hasOwnProperty(key)) {
          newItem[key.toLowerCase()] = item[key];
        }
      }
      return newItem;
    });
  };


const editDealerLocationMappingInService=async(req,res)=>{

    try{
        let brandId=req.body.brand_id;
        const pool=await getPool1();
        let getMappingQuery=`use [StockUpload]  Select dealerId,locationId,inventory_location,id from dealer_location_mapping where brandId=@brandId `;
        const res1=await pool.request().input('brandId',brandId).query(getMappingQuery);
        let mappedData=res1.recordset;
        let fileData;
        let rowData;
        let rowCount;
        let headers;
        let userId=parseInt(req.body.added_by,10);
        let filePath=req.file.path;
       let  isDealerAndLocationExist=true;        
        fileData=await readExcelFile(filePath)
      
        const dealerLocationNotInMaster = [];
        headers=fileData.headers;
        rowData=fileData.data;
       
        const  lowerCaseHeaders=headers.map((header)=> header.trim().toLowerCase());

        if(!lowerCaseHeaders.includes('dealer') && !lowerCaseHeaders.includes('location')){
            isDealerAndLocationExist=false
            // console.log("is dealer location exist in file ",isDealerAndLocationExist)
            return {isDealerAndLocationPresent:isDealerAndLocationExist};
        }

        //  console.log("headers ",headers,rowData)
        
         let isDealerAndLocationNull=await checkFields(rowData);
        //   console.log("is dealer location null in file ",isDealerAndLocationNull)

         if(isDealerAndLocationNull){
            return {isDealerAndLocationNull:isDealerAndLocationNull}
         }

         let getDealerAndLocationQuery='use [z_scope] Select dealer,location,dealerId,locationId from locationInfo where status=1 and dealerStatus=1 and brandId=@brandId';
         const res=await pool.request().input('brandId',brandId).query(getDealerAndLocationQuery);
         let dealerAndLocationResult=res.recordset;
        //  console.log("dealer location result",dealerAndLocationResult)
        //  let dealerLocationNotInMaster=[];

         rowData.forEach((row,index)=>{

            const normalizedItem=Object.keys(row).reduce((acc,key)=>{
                acc[key.trim().toLowerCase()]=row[key];
                return acc


            },{});
        
            rowData[index]=normalizedItem;
            // console.log(normalizedItem)
            // console.log("dealer location ",dealerAndLocationResult)
           
            const exists = dealerAndLocationResult.some(obj2 => obj2.dealer.trim() === normalizedItem.dealer.trim() && normalizedItem.location.trim() === obj2.location.trim());
    
            // console.log("exists ",exists)
    // If it does not exist, push the object into array2
            if (!exists) {
                dealerLocationNotInMaster.push(normalizedItem);
            }else{
                const matchingItem = dealerAndLocationResult.find(obj2 => {

                    return  obj2.dealer.trim() === normalizedItem.dealer &&
                      normalizedItem.location.trim() === obj2.location
                    
                });
            //   console.log("matching item ",matchingItem)

                  if (matchingItem) {
                    // Add `dealerId` and `locationId` to the normalized item
                    normalizedItem.dealerId = matchingItem.dealerId;
                    normalizedItem.locationId = matchingItem.locationId;
                  }
            }

           
        })
        //  console.log("dealer location not in master ",dealerLocationNotInMaster)

        if(dealerLocationNotInMaster.length!=0){
            return {dealerLocationNotInMasterPresent:true}
        }
            // console.log("rowData ",rowData)
        let operation="update dealer location mapping";
         let normalizedRowData=[];
       let updatedMappedData= mappedData.map((item)=>({
            ...item,
            isTraversed:false
        }))
        let mappedData1 = [...updatedMappedData];
        console.log("updated mapped data ",mappedData1)
        rowData.forEach((item,index)=>{
              console.log(item)
            const isExist=mappedData1.some((element)=>element.dealerId==parseInt(item.dealerId) && element.locationId==parseInt(item.locationId));

            if(!isExist){
                normalizedRowData.push({
                    dealerId:parseInt(item.dealerId),
                    locationId:parseInt(item.locationId),
                    dealer:item.dealer,
                    location:item.location,
                    ["inventory location"]:item["inventory location"]
                })

            }
            else{
               
                mappedData1 = mappedData1.map((element) => {
                    if (element.dealerId === parseInt(item.dealerId) && element.locationId === parseInt(item.locationId)) {
                        return {
                            ...element,
                            isTraversed: true
                        };
                    }
                    return element;
                });
            }
            // console.log("updated mapped dta",mappedData1)
        })

        mappedData1.forEach(async (item)=>{
            if(item.isTraversed==false){
                await deleteQuery(item)
            }
        })

        // console.log("mapped data",rowData,mappedData1)
      // console.log("normalidex data ",normalizedRowData)

        if(normalizedRowData.length!=0){
            operation="create dealer location mapping"
            const values = normalizedRowData.map(item => {
               
                return [
                    parseInt(brandId, 10),  // Ensure brandId is an integer
                    parseInt(item["dealerId"], 10), // Ensure dealerId is an integer
                    item["inventory location"].toString(),  // Ensure inventory_location is a string
                    parseInt(item["locationId"], 10), // Ensure locationId is an integer
                    parseInt(userId, 10), // Ensure userId is an integer
                   operation,
                   item["dealer"],
                   item["location"]
    
            ]
            })
            try {
                const table = new sql.Table('Dealer_Location_Mapping'); // Updated table name
                table.create = false;
            
                table.columns.add('brandId', sql.Int, { nullable: true }); 
                table.columns.add('dealerId', sql.Int, { nullable: true }); 
                table.columns.add('inventory_location', sql.VarChar(100), { nullable: true }); 
                table.columns.add('locationID', sql.Int, { nullable: true });
                table.columns.add('added_by', sql.Int, { nullable: true }); 
                //  table.columns.add('added_on', sql.DateTime, { nullable: true, default: sql`GETDATE()` }); 
                table.columns.add('operation', sql.VarChar(100), { nullable: true }); 
                table.columns.add('dealer', sql.VarChar(200), { nullable: true }); 
                table.columns.add('location', sql.VarChar(200), { nullable: true }); 
            
                // Add rows to the table
                values.forEach((row) => {
                    table.rows.add(
                        row[0],  // brandid
                        row[1],  // dealerid
                        row[2],  // inventory_location
                        row[3],  // locationid
                        row[4],  // added_by
                        row[5],
                        row[6],   // operation
                        row[7],
                      
                          
                       
                    );
                });
                await pool.request().bulk(table);
                
               
            } catch (error) {
                console.error('Error during bulk insert:', error);
                return error; // Rethrow the error for further handling if necessary
            }

           
        }
        
            // console.log(updatedMappedData)
            mappedData1.map(async (item)=>{
                // console.log(item)
                if(item.isTraversed){
                    operation="update dealer location mapping"
                    let updateQuery=`use [StockUpload] Update dealer_location_mapping set added_on=Getdate(),operation=@operation where id=@id`;
                    await pool.request().input('id',item.id)
                    .input('operation',operation).query(updateQuery);
                   // console.log("updatd succesfully")
                }
            })
        
      
            rowCount=rowData.length;

            let logQuery=`use [StockUpload] Insert into Stock_Upload_Logs(brand_id,added_by,operation_type,dealerLocationMappingRowCount) 
            values(@brandId,@userId,'update dealer location mapping',@rowCount)`;
    
            await pool.request().input('brandId',brandId)
            .input('userId',userId)
            .input('rowCount',rowCount).query(logQuery)
    
            return {insertedSuccessfully:true}
        

    }
    catch(error){
        console.log("error in edit dealer location mapping in service ",error.message);
        return error;
    }
}

const exportUploadedData=async (req,res)=>{

    try{
        let brandId=req.brand_id;
        const pool=await getPool1();
        // console.log(brandId)
        let query=`use [StockUpload] Select dealer,location ,inventory_location,added_by,added_on,brandId from dealer_location_mapping where brandId=@brandId`;
        const result=await pool.request().input('brandId',brandId).query(query);

        //  console.log(result.recordset);

        return result.recordset;
    }
    catch(error){
        return error;
    }
}

const deleteQuery=async (updatedElement)=>{

    const pool=await getPool1();
    // console.log(updatedElement);
    let id=updatedElement.id;
    
    let deleteQuery=`use [StockUpload] Delete from dealer_location_mapping where id=@id `;

    await pool.request().input('id',id).query(deleteQuery);


}

const  getCurrentDateTimeInIST=async ()=> {
    
        // Get current date in UTC
        const nowUTC = new Date();
    
        // Convert UTC date to IST (Asia/Kolkata)
        const options = {
            timeZone: 'Asia/Kolkata', // IST timezone
        };
    
        // Create a new date object in IST
        const istDate = new Date(
            new Intl.DateTimeFormat('en-IN', options).format(nowUTC)
        );
    
        return istDate;
}
export   {addDealerLocationMappingInService,exportUploadedData,editDealerLocationMappingInService}