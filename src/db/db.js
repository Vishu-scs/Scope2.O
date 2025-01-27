import sql from 'mssql'
import "dotenv/config"
const config1 = {
    server: process.env.SERVER,    // SQL Server hostname or IP address
    database: process.env.DATABASE,    // Your database name
    user: process.env.USER,                // SQL Server login username
    password: process.env.PASSWORD,
    port:Number(process.env.DB_PORT),        // SQL Server login password
    options: {
        encrypt: false,           // Disable encryption for local servers
        enableArithAbort: true ,
        trustServerCertificate: true,  // Helps with certain SQL Server errors
    },
    // requestTimeout: 30000, // 30 seconds
    connectionTimeout: 30000, // 30 seconds
};
 

let pool1;
const connectDB = async()=>{
pool1 = await new sql.connect(config1)
// .connect()
.then(pool1 => {
    console.log('Connected to Live SQL Server');
    return pool1;
})
.catch(err => {
    console.error('Database connection failed!', err);
    throw err;
});
};

const getPool1 = () => {
  if (!pool1) {
      throw new Error("Database connection is not established yet");
  }
  return pool1;
};



const config2 = {
    server: process.env.SERVER2,    // SQL Server hostname or IP address
    database: process.env.DATABASE2,    // Your database name
    user: process.env.USER2,                // SQL Server login username
    password: process.env.PASSWORD2,
    port:Number(process.env.DB_PORT2),        // SQL Server login password
    options: {
        encrypt: false,           // Disable encryption for local servers
        enableArithAbort: true ,
        trustServerCertificate: true,  // Helps with certain SQL Server errors
    },
    // requestTimeout: 30000, // 30 seconds
    connectionTimeout: 30000, // 30 seconds
};
 

let pool2;
const connectDB2 = async()=>{
pool2 = await new sql.connect(config2)
// .connect()
.then(pool2 => {
    console.log('Connected to Test SQL Server');
    return pool2;
})
.catch(err => {
    console.error('Database connection failed!', err);
    throw err;
});
};

const getPool2 = () => {
  if (!pool2) {
      throw new Error("Database connection is not established yet");
  }
  return pool2;
};
export {connectDB,connectDB2,getPool1,getPool2};