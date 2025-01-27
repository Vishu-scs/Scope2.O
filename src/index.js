import 'dotenv/config'
import {connectDB,connectDB2} from "./db/db.js"
import {app}  from "./app.js"
const PORT = 3001
const PORT2 = 3000
connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`Server is runnning at PORT: ${PORT}`)
    })
})
.catch((err)=>{
    console.log(" connection failed",err);
})


connectDB2()
.then(()=>{
    app.listen(PORT2,()=>{
        console.log(`Server is runnning at PORT: ${PORT2}`)
    })
})
.catch((err)=>{
    console.log(" connection failed",err);
})
// const currentDate = Date.now(); // Current timestamp in milliseconds
// const futureDate = currentDate + 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds

// console.log("Current Date:", new Date(currentDate));
// console.log("Future Date (24 hours later):", new Date(futureDate));



