import { getPool } from "../db/db.js";
import sql from 'mssql';

const dataValidator = async (dealerid) => {    
  const pool = await getPool();

  try {
    const dynamicTable = `dealer_sale_upload1_td001_${dealerid}`;
    // console.log(dynamicTable);
    
    
    const query = `use [z_scope]
                select 
                sum(case 
            when dsm.NonMovingSale = 'BS' then 2
            when dsm.NonMovingSale in ('WS', 'CS') then 1
            else 0 -- Optional: Count as 0 for any other values
        end) as RequiredCount
from Dealer_Setting_master dsm
join locationinfo li
    on dsm.locationid = li.LocationID
where li.DealerID = @dealerid 
  and li.OgsStatus = 1;
-----------------------------------------
with LocationSaleType as (
    -- Step 1: Get all active locations and their NonMovingSale types
    select 
        li.LocationID, 
        dsm.NonMovingSale 
    from Dealer_Setting_master dsm
    join locationinfo li
        on dsm.locationid = li.LocationID
    where li.DealerID = @dealerid
      and li.OgsStatus = 1
),
FilteredSales as (
    -- Main query to filter data based on conditions
    select 
        ds.locationid,
        ds.saletype,
        ds.StockDateMonth,
        ds.StockDateYear
    from ${dynamicTable} ds
    where ds.locationid in (
        select LocationID 
        from LocationSaleType
    )
    and (
        -- Conditional filtering based on SaleType
        (exists (
            select 1 
            from LocationSaleType lst
            where lst.LocationID = ds.locationid 
              and lst.NonMovingSale = 'WS'
        ) and ds.saletype = 'WS')
        or
        (exists (
            select 1 
            from LocationSaleType lst
            where lst.LocationID = ds.locationid 
              and lst.NonMovingSale = 'CS'
        ) and ds.saletype = 'CS')
        or
        (exists (
            select 1 
            from LocationSaleType lst
            where lst.LocationID = ds.locationid 
              and lst.NonMovingSale = 'BS'
        ) and ds.saletype in ('WS', 'CS'))  
    )
    and ds.StockDateMonth = format(DATEADD(month, -1, getdate()), 'MM')  
    and ds.StockDateYear = case 
        when format(getdate(), 'MM') = '01' then format(getdate(), 'yyyy') - 1
        else format(getdate(), 'yyyy')
    end

)
-- Counting the number of rows
select count(*) as GettingRowCount
from FilteredSales;`

    const result = await pool.request()
  .input('dealerid', sql.Int, dealerid).query(query)
  // .input('dynamicTable', sql.VarChar, dynamicTable)
  
const RequiredCount = result.recordsets[0][0].RequiredCount
const GettingRowCount = result.recordsets[1][0].GettingRowCount

if(RequiredCount == GettingRowCount){
    return true;
}
else{
    return false;
}
// console.log(RequiredCount,GettingRowCount);

  } catch (error) {
    console.error("Error from dataValidator: ", error);
    throw error;
  }
};

export default dataValidator;
