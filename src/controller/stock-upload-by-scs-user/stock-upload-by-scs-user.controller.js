import {singleUploadStockInService,getAllRecords,uploadBulkStock,
    getBulkDataInService,getPartNotInMasterSingleUploadInService,getBulkRecordsInService
 }from '../../services/stock-upload-by-scs-user/stock-upload-by-scs-user.service.js'
const singleUploadStock=async (req,res)=>{
    try{
        const result=await singleUploadStockInService(req);
        res.status(200).json({data:result});
    }
    catch(error){
        res.status(201).json({error:error.message})
    }
}

const getPartNotInMasterSingleUpload=async (req,res)=>{

    try{
        const result=await getPartNotInMasterSingleUploadInService(req.body);
        res.status(200).json({message:'Fetched Successfully',data:result});
    }
    catch(error){
        res.status(201).json({error:error.message})
    }
}

const singleUploadedData=async (req,res)=>{

    try{
        const result=await uploadStock(req.body);
        res.status(200).json({message:'Fetched Successfully'});
    }
    catch(error){
        res.status(201).json({error:error.message})
    }
}

const allRecordsSingleUpload=async(req,res)=>{

    try{
        const result=await getAllRecords(req.body);
        res.status(200).json({message:'Fetched Successfully',data:result});
    }
    catch(error){
        res.status(201).json({error:error.message})
    }
}

const bulkStockUpload=async(req,res)=>{

    try{
        const result=await uploadBulkStock(req.body);
        res.status(200).json({message:'Fetched Successfully',data:result});
    }
    catch(error){
        res.status(201).json({error:error.message})
    }
}

const getBulkData=async(req,res)=>{
    try{
        const result=await getBulkDataInService(req.body);
        res.status(200).json({message:'Fetched Successfully',data:result});
    }
    catch(error){
        res.status(201).json({error:error.message})
    }
}

const getBulkRecords=async(req,res)=>{
    try{
        const result=await getBulkRecordsInService(req.body);
        res.status(200).json({message:'Fetched Successfully',data:result});
    }
    catch(error){
        res.status(201).json({error:error.message})
    }
}


export {singleUploadStock,getPartNotInMasterSingleUpload,singleUploadedData,
    allRecordsSingleUpload,bulkStockUpload,getBulkRecords,getBulkData,getBulkRecordsInService}