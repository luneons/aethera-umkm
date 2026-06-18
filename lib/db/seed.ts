import { getDB, saveDB } from "./client";
import { saveBusinessProfile } from "./queries/settings";
import { createProduct } from "./queries/products";
import { createSale } from "./queries/sales";
import { createPurchase } from "./queries/purchases";
import { createSupplier } from "./queries/suppliers";
import { createCustomer } from "./queries/customers";
import { execute } from "./client";
import type { PaymentMethod } from "./types";

function daysAgo(n: number, hour = 10, min = 0): string {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, min, 0, 0);
  const pad = (x: number) => String(x).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + "T" + pad(hour) + ":" + pad(min);
}
function rand(a: number, b: number): number { return Math.floor(Math.random()*(b-a+1))+a; }
function pick<T>(a: readonly T[]): T { return a[Math.floor(Math.random()*a.length)]; }
interface SP { id:number; name:string; categoryId:number; sellPrice:number; buyPrice:number; unit:string; }

export async function seedDemoData(onProgress?: (msg: string) => void): Promise<void> {
  const log = (msg: string) => onProgress?.(msg);
  log("Membuat profil usaha...");
  await saveBusinessProfile({ name: "Warung Bu Sari", type: "Kuliner / Rumah Makan", owner: "Sari Dewi", logoBase64: null });
  log("Mengatur target omset...");
  await execute("DELETE FROM targets", []);
  await execute("INSERT INTO targets (period, amount) VALUES (?, ?)", ["harian", 500000]);
  await execute("INSERT INTO targets (period, amount) VALUES (?, ?)", ["bulanan", 12000000]);
  log("Menambah pelanggan...");
  const cid1 = await createCustomer({ name: "Pak Budi Santoso", phone: "628111222333", address: "Jl. Mawar No. 5, RT 03" });
  const cid2 = await createCustomer({ name: "Bu Rina Hartati",  phone: "628222333444", address: "Kompleks Anggrek Blok B2" });
  const cid3 = await createCustomer({ name: "Mas Diko",         phone: "628333444555" });
  const cid4 = await createCustomer({ name: "Bu Yanti",         phone: "628444555666" });
  const cid5 = await createCustomer({ name: "Pak Hendra",       phone: "628555666777" });
  const cmap: Record<number, string> = { [cid1]:"Pak Budi Santoso",[cid2]:"Bu Rina Hartati",[cid3]:"Mas Diko",[cid4]:"Bu Yanti",[cid5]:"Pak Hendra" };
  const cp = [null,null,null,cid1,cid2,cid3,cid4,cid5];
  log("Menambah supplier...");
  const sid1 = await createSupplier({ name: "UD Maju Bersama", phone: "628777888999", address: "Pasar Induk Km 12",    notes: "Grosir bahan sembako" });
  const sid2 = await createSupplier({ name: "CV Sumber Rasa",  phone: "628666777888", address: "Jl. Industri No. 47", notes: "Supplier bumbu & rempah" });
  const sid3 = await createSupplier({ name: "Toko Pak Joko",   phone: "628555444333",                                  notes: "Langganan sayur & buah segar" });
  log("Menambah produk...");
  async function mk(n:string,c:number,s:number,b:number,u:string,ts=false,st=0,ls=0): Promise<SP> {
    const id=await createProduct({name:n,categoryId:c,sellPrice:s,buyPrice:b,unit:u,trackStock:ts,stock:st,lowStockThreshold:ls});
    return {id,name:n,categoryId:c,sellPrice:s,buyPrice:b,unit:u};
  }
  const p1 =await mk("Nasi Goreng Spesial",1,18000, 7000,"porsi");
  const p2 =await mk("Mie Ayam Bakso",     1,15000, 5500,"porsi");
  const p3 =await mk("Ayam Bakar",         1,25000,10000,"porsi");
  const p4 =await mk("Soto Ayam",          1,14000, 5000,"porsi");
  const p5 =await mk("Gado-Gado",          1,13000, 4500,"porsi");
  const p6 =await mk("Lontong Sayur",      1,12000, 4000,"porsi");
  const p7 =await mk("Es Teh Manis",       1, 5000, 1500,"gelas");
  const p8 =await mk("Es Jeruk",           1, 7000, 2500,"gelas");
  const p9 =await mk("Jus Alpukat",        1,12000, 4000,"gelas");
  const p10=await mk("Air Mineral Botol",  1, 4000, 2000,"botol",true,24,6);
  const p11=await mk("Kerupuk Udang",      2, 3000, 1200,"bungkus",true,30,5);
  await mk("Sambal Botol",2,8000,4000,"botol",true,12,3);
  const allP: SP[] = [p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11];
  log("Mengisi penjualan 90 hari...");
  const chs=["langsung","langsung","langsung","gofood","gofood","whatsapp","grabfood"];
  const pms: PaymentMethod[] = ["tunai","tunai","tunai","qris","transfer"];
  for (let day=90; day>=0; day--) {
    const dow=new Date(Date.now()-day*86400000).getDay();
    const n=(dow===0||dow===6)?rand(15,28):rand(8,20);
    for (let t=0; t<n; t++) {
      const pr=pick(allP);const qty=rand(1,4);const cid=pick(cp);const disc=rand(0,10)===0?2000:0;
      await createSale({productId:pr.id,productName:pr.name,categoryId:pr.categoryId,quantity:qty,unitPrice:pr.sellPrice,totalAmount:qty*pr.sellPrice-disc,discountAmount:disc,paymentMethod:pick(pms),channel:pick(chs),transactionAt:daysAgo(day,rand(7,20),rand(0,59)),customerId:cid??null,customerName:cid?(cmap[cid]??null):null,invoiceNumber:null});
    }
  }
  log("Mengisi pembelian/pengeluaran...");
  for (let day=90; day>=0; day--) {
    if (day%3!==0) continue;
    const q1=rand(2,4);await createPurchase({productId:null,itemName:"Beras 5kg",categoryId:5,quantity:q1,unitPrice:65000,totalAmount:q1*65000,supplier:"UD Maju Bersama",supplierId:sid1,paymentMethod:"tunai",transactionAt:daysAgo(day,6,30),invoiceNumber:null});
    const q2=rand(3,6);await createPurchase({productId:null,itemName:"Ayam Potong",categoryId:5,quantity:q2,unitPrice:35000,totalAmount:q2*35000,supplier:"Toko Pak Joko",supplierId:sid3,paymentMethod:"transfer",transactionAt:daysAgo(day,6,45),invoiceNumber:null});
    const hs=rand(50000,80000);await createPurchase({productId:null,itemName:"Sayuran Segar",categoryId:5,quantity:1,unitPrice:hs,totalAmount:hs,supplier:"Toko Pak Joko",supplierId:sid3,paymentMethod:"tunai",transactionAt:daysAgo(day,7,0),invoiceNumber:null});
  }
  for (let day=90; day>=0; day-=7) {
    const hb=rand(80000,120000);
    await createPurchase({productId:null,itemName:"Bumbu & Rempah",categoryId:5,quantity:1,unitPrice:hb,totalAmount:hb,supplier:"CV Sumber Rasa",supplierId:sid2,paymentMethod:"transfer",transactionAt:daysAgo(day,8,0),invoiceNumber:null});
    await createPurchase({productId:p10.id,itemName:"Air Mineral Botol (dus)",categoryId:5,quantity:2,unitPrice:36000,totalAmount:72000,supplier:"UD Maju Bersama",supplierId:sid1,paymentMethod:"tunai",transactionAt:daysAgo(day,8,30),invoiceNumber:null});
  }
  for (let mo=0; mo<3; mo++) {
    const off=mo*30+1; const hl=rand(250000,400000); const qg=rand(4,8);
    await createPurchase({productId:null,itemName:"Gaji Karyawan",      categoryId:7,quantity:1, unitPrice:2500000,totalAmount:2500000,  paymentMethod:"transfer",transactionAt:daysAgo(off,  10,0),invoiceNumber:null});
    await createPurchase({productId:null,itemName:"Sewa Tempat Bulanan",categoryId:8,quantity:1, unitPrice:1500000,totalAmount:1500000,  paymentMethod:"transfer",transactionAt:daysAgo(off+1,10,0),invoiceNumber:null});
    await createPurchase({productId:null,itemName:"Listrik & Air",      categoryId:6,quantity:1, unitPrice:hl,     totalAmount:hl,       paymentMethod:"transfer",transactionAt:daysAgo(off+2,10,0),invoiceNumber:null});
    await createPurchase({productId:null,itemName:"Gas LPG 3kg",        categoryId:6,quantity:qg,unitPrice:22000,  totalAmount:qg*22000, paymentMethod:"tunai",   transactionAt:daysAgo(off+5, 9,0),invoiceNumber:null});
  }
  log("Menambah template berulang...");
  await execute("INSERT OR IGNORE INTO recurring (kind,name,category_id,quantity,unit_price,payment_method,frequency,next_run,is_active) VALUES (?,?,?,?,?,?,?,date('now','start of month','+1 month'),1)",["pembelian","Sewa Tempat",8,1,1500000,"transfer","bulanan"]);
  await execute("INSERT OR IGNORE INTO recurring (kind,name,category_id,quantity,unit_price,payment_method,frequency,next_run,is_active) VALUES (?,?,?,?,?,?,?,date('now','start of month','+1 month'),1)",["pembelian","Gaji Karyawan",7,1,2500000,"transfer","bulanan"]);
  await execute("INSERT OR IGNORE INTO recurring (kind,name,category_id,quantity,unit_price,payment_method,frequency,next_run,is_active) VALUES (?,?,?,?,?,?,?,date('now','weekday 1'),1)",["penjualan","Catering Kantor",1,30,15000,"transfer","mingguan"]);
  log("Membuka pencapaian...");
  for (const code of ["first_sale","first_purchase","first_product","ten_tx","fifty_tx","profit_day"]) {
    await execute("INSERT OR IGNORE INTO achievements (code) VALUES (?)",[code]);
  }
  await saveDB();
  log("Selesai! Silakan cek dashboard.");
}
