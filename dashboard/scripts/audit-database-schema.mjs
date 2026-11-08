import nextEnv from '@next/env';
import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const db=new PrismaClient();
try {
 const schema=readFileSync(process.env.PRISMA_AUDIT_SCHEMA??'prisma/schema.prisma','utf8');
 const modelNames=[...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(m=>m[1]);
 if(modelNames.some(name=>!Prisma.dmmf.datamodel.models.some(m=>m.name===name)))throw new Error('Generated client is stale: run npm run db:generate before this read-only audit');
 const columns=await db.$queryRaw`SELECT table_name,column_name,udt_name FROM information_schema.columns WHERE table_schema='public'`;
 const missingTables=[],missingColumns=[],typeMismatches=[];
 const types={String:'text',Int:'int4',Boolean:'bool',DateTime:'timestamp',Json:'jsonb',Float:'float8',BigInt:'int8',Decimal:'numeric',Bytes:'bytea'};
 for(const model of Prisma.dmmf.datamodel.models){
  const table=model.dbName??model.name,actual=columns.filter(c=>c.table_name===table);
  if(!actual.length){missingTables.push(table);continue;}
  for(const field of model.fields.filter(f=>f.kind!=='object')){
   const name=field.dbName??field.name,column=actual.find(c=>c.column_name===name),expected=(field.isList?'_':'')+(types[field.type]??field.type);
   if(!column)missingColumns.push(`${table}.${name}`);else if(column.udt_name!==expected)typeMismatches.push({column:`${table}.${name}`,expected,actual:column.udt_name});
  }
 }
 const [database]=await db.$queryRaw`SELECT current_database() AS name`;
 console.log(JSON.stringify({database:database.name,modelsChecked:modelNames.length,missingTables,missingColumns,typeMismatches},null,2));
 if(missingTables.length||missingColumns.length||typeMismatches.length)process.exitCode=1;
}catch(error){console.error('Read-only schema audit failed:',error instanceof Error&&error.message.startsWith('Generated client')?error.message:'Check database access and schema; no credentials printed.');process.exitCode=1;}
finally{await db.$disconnect();}
