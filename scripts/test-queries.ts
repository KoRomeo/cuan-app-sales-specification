import {
getCustomers,
getSuppliers,
getProducts,
} from "../lib/db/queries"

async function main() {
const customers = await getCustomers()
const suppliers = await getSuppliers()
const products = await getProducts()

console.log("Customers:", customers.length)
console.log("Suppliers:", suppliers.length)
console.log("Products:", products.length)

console.log("First customer:", customers[0])
console.log("First supplier:", suppliers[0])
console.log("First product:", products[0])
}

main().catch(console.error)