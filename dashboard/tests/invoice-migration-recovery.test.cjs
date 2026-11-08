/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');const {randomBytes,createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');const {readFileSync,readdirSync}=require('node:fs');const path=require('node:path');
test('reproduce clean-deploy dependency failure, recover atomically, preserve records and replay adjustments without duplicates',async()=>{
 const base=new URL(process.env.DATABASE_URL);
 assert.ok(['127.0.0.1','localhost'].includes(base.hostname),'local database only');
 assert.equal(base.pathname,'/apex_dashboard_test','isolated test preload is mandatory');
 const admin=new PrismaClient();const name=`apex_invoice_recovery_${randomBytes(6).toString('hex')}`;
 const url=new URL(base);url.pathname='/'+name;const env={...process.env,DATABASE_URL:url.toString()};
 const psql=process.platform==='win32'?'C:/Program Files/PostgreSQL/18/bin/psql.exe':'psql';
 const pgEnv={...env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:name};
 const migrations='prisma/migrations';
 const hashes=()=>Object.fromEntries(readdirSync(migrations,{withFileTypes:true}).filter(f=>f.isDirectory()).map(f=>[f.name,createHash('sha256').update(readFileSync(path.join(migrations,f.name,'migration.sql'))).digest('hex')]));
 const original=hashes();let db;
 function cli(...args){return spawnSync(process.execPath,['node_modules/prisma/build/index.js',...args],{env,encoding:'utf8',timeout:60000});}
 function sql(file,success=true){const run=spawnSync(psql,['-X','-v','ON_ERROR_STOP=1','-f',file],{env:pgEnv,encoding:'utf8',timeout:60000});if(success)assert.equal(run.status,0,run.stderr);return run;}
 try{
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  db=new PrismaClient({datasourceUrl:url.toString()});
  let run=cli('migrate','deploy');assert.notEqual(run.status,0);assert.match(run.stdout,/Applying migration `20261108_invoice_adjustment_rows`/);
  run=cli('migrate','deploy');assert.notEqual(run.status,0);assert.match(run.stderr+run.stdout,/P3009/);
  const [missing]=await db.$queryRaw`SELECT to_regclass('public."InvoiceLineItem"')::text AS lines,to_regclass('public."PaymentAttempt"')::text AS attempts`;
  assert.equal(missing.lines,null);assert.equal(missing.attempts,null);
  const user=await db.user.create({data:{fullName:'Fictional Migration QA',email:`${name}@example.test`,emailNormalized:`${name}@example.test`}});
  const company=await db.company.create({data:{customerId:user.id,preferredName:'Fictional Migration LLC',formationState:'Louisiana',businessActivity:'QA',businessDescription:'Isolated migration recovery fixture'}});
  const service=await db.service.create({data:{slug:name,name:'Fictional service',category:'QA',description:'Not a real service'}});
  const pack=await db.package.create({data:{slug:name,name:'Fictional package',serviceFeeCents:10000}});
  const app=await db.application.create({data:{customerId:user.id,companyId:company.id,serviceId:service.id,packageId:pack.id}});
  const order=await db.order.create({data:{applicationId:app.id,serviceFeeCents:10000,governmentFeeCents:5000,thirdPartyFeeCents:0,additionalFeeCents:0,discountCents:1000,totalCents:14500}});
  const items=[{description:'Fictional package',quantity:1,unitCents:10000,amountCents:10000},{description:'Fictional filing fee',quantity:1,unitCents:5000,amountCents:5000}];
  const invoice=await db.invoice.create({data:{orderId:order.id,number:'RECOVERY-QA',lifecycle:'ISSUED',issuedAt:new Date(),subtotalCents:15000,totalCents:14500,discountCents:1000,taxCents:500,snapshot:{items}}});
  await db.payment.create({data:{orderId:order.id,amountCents:14500,status:'VERIFIED',verifiedAt:new Date(),reference:'FICTIONAL-RECOVERY'}});
  await db.refundRequest.create({data:{orderId:order.id,amountCents:500,status:'COMPLETED',reason:'Fictional QA refund'}});
  await db.document.create({data:{applicationId:app.id,companyId:company.id,uploadedById:user.id,documentType:'QA',originalFilename:'fictional.pdf',privateStorageKey:name,mimeType:'application/pdf',fileSize:1}});
  const preserve=async()=>JSON.stringify(await Promise.all(['user','company','application','order','invoice','payment','refundRequest','document'].map(model=>db[model].findMany({orderBy:{id:'asc'}}))));
  const before=await preserve();
  sql('scripts/sql/repair-invoice-prerequisites.sql');sql('scripts/sql/verify-invoice-prerequisites.sql');
  sql('scripts/sql/repair-invoice-prerequisites.sql');sql('scripts/sql/verify-invoice-prerequisites.sql');
  assert.equal(await db.invoiceLineItem.count(),2,'repair copies frozen rows once, without inserting adjustments prematurely');
  run=cli('migrate','resolve','--applied','20261108_invoice_pricing_and_attempts');assert.equal(run.status,0,run.stderr);
  run=cli('migrate','resolve','--rolled-back','20261108_invoice_adjustment_rows');assert.equal(run.status,0,run.stderr);
  run=cli('migrate','deploy');assert.equal(run.status,0,run.stderr);
  sql('scripts/sql/verify-invoice-prerequisites.sql');sql('scripts/sql/verify-invoice-adjustments.sql');
  assert.equal(await db.invoiceLineItem.count(),4);assert.equal(await preserve(),before,'all original business records preserved byte-for-byte in scalar DTOs');
  sql('prisma/migrations/20261108_invoice_adjustment_rows/migration.sql');sql('scripts/sql/verify-invoice-adjustments.sql');
  assert.equal(await db.invoiceLineItem.count(),4,'historical discount/tax inserts are idempotent');
  run=cli('migrate','status');assert.equal(run.status,0,run.stderr);
  const audit=spawnSync(process.execPath,['scripts/audit-database-schema.mjs'],{env,encoding:'utf8',timeout:30000});assert.equal(audit.status,0,audit.stdout+audit.stderr);
  run=cli('migrate','diff','--from-schema-datasource','prisma/schema.prisma','--to-schema-datamodel','prisma/schema.prisma','--exit-code');assert.equal(run.status,0,run.stdout+run.stderr);
  assert.deepEqual(hashes(),original,'no existing migration files changed');
  const afterRecoveryUser=await db.user.create({data:{fullName:'Fictional After Recovery',email:`after-${name}@example.test`,emailNormalized:`after-${name}@example.test`}});
  assert.match(afterRecoveryUser.clientReference,/^[1-9][0-9]{8}$/,'signup/reference allocation still works after FK alignment');
  const [referenceFK]=await db.$queryRaw`SELECT condeferrable,condeferred FROM pg_constraint WHERE conrelid='public."ClientReferenceHistory"'::regclass AND conname='ClientReferenceHistory_userId_fkey'`;
  assert.equal(referenceFK.condeferrable,true);assert.equal(referenceFK.condeferred,true);
  const line=await db.invoiceLineItem.findFirstOrThrow({where:{invoiceId:invoice.id}});await assert.rejects(db.invoiceLineItem.update({where:{id:line.id},data:{amountCents:1}}));
  console.log(`Recovered isolated database retained: ${name}`);
 }finally{if(db)await db.$disconnect();await admin.$disconnect();}
});
