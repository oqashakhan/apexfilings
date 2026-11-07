import PDFDocument from 'pdfkit';
import { resolve } from 'node:path';
import { invoiceMoney, type InvoiceSnapshot } from '@/lib/invoices';
type View=ReturnType<typeof import('./invoices').invoiceView>;
type Credit={number:string;amountCents:number;issuedAt:Date;snapshot:unknown};

export async function invoicePdf(view:View,credit?:Credit):Promise<Buffer>{
 const snapshot=view.snapshot as InvoiceSnapshot;
 if(!snapshot?.seller)throw new Error('An approved issued snapshot is required');
 const seller=snapshot.seller,number=credit?.number??view.number;
 const doc=new PDFDocument({size:'A4',margin:48,bufferPages:true,info:{Title:`${credit?'Credit note':'Invoice'} ${number}`,Author:seller.displayName,Creator:'Apex Filings'}});
 const parts:Buffer[]=[];const result=new Promise<Buffer>((resolve,reject)=>{doc.on('data',part=>parts.push(part));doc.on('end',()=>resolve(Buffer.concat(parts)));doc.on('error',reject);});
 doc.registerFont('Body',resolve(process.cwd(),'assets/fonts/NotoSans-Regular.ttf'));
 doc.registerFont('Bold',resolve(process.cwd(),'assets/fonts/NotoSans-Bold.ttf'));
 const orange='#F04623',dark='#191F29',muted='#667085';const width=499;
 const date=(value:Date|string|null)=>value?new Date(value).toISOString().slice(0,10):'Not set';
 let y=48;
 function text(value:string,x:number,top:number,size=10,font='Body',color=dark,w=width,align:'left'|'right'='left'){
  value=value.replace(/[\u2010-\u2015\u2212]/g,'-');
  if(align==='right'){doc.font(font).fontSize(size);const measured=doc.widthOfString(value);if(measured>w)size=Math.max(6,size*w/measured);}
  doc.font(font).fontSize(size).fillColor(color).text(value,x,top,{width:w,align,lineBreak:false});
 }
 function wrap(value:string,w:number,size=10,font='Body'){
  doc.font(font).fontSize(size);const output:string[]=[];
  for(const paragraph of value.replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\r/g,'').split('\n')){
   let line='';for(const word of paragraph.split(/\s+/)){
    if(doc.widthOfString(line?`${line} ${word}`:word)<=w){line=line?`${line} ${word}`:word;continue;}
    if(line)output.push(line);line='';
    for(const character of word){if(doc.widthOfString(line+character)>w&&line){output.push(line);line='';}line+=character;}
   }output.push(line);
  }return output;
 }
 function compactHeader(){text('APEX FILINGS',48,38,15,'Bold',orange);text(number,300,40,10,'Bold',dark,247,'right');doc.moveTo(48,76).lineTo(547,76).strokeColor('#E4E7EC').stroke();y=98;}
 function page(){doc.addPage();compactHeader();}
 function ensure(height:number){if(y+height>748)page();}
 function block(value:string,size=10,color=dark,font='Body'){
  for(const line of wrap(value,width,size,font)){ensure(size+8);text(line,48,y,size,font,color);y+=size+6;}
 }
 function rule(){ensure(14);doc.moveTo(48,y+5).lineTo(547,y+5).strokeColor('#E4E7EC').stroke();y+=20;}
 text('APEX FILINGS',48,44,22,'Bold',orange);text('US Business Formation Services',48,76,10,'Body',muted);
 text(credit?'CREDIT NOTE':'INVOICE',324,44,24,'Bold',dark,223,'right');
 text(number,300,82,11,'Bold',dark,247,'right');
 text(`${credit?'Refunded':view.status.replaceAll('_',' ')}${view.discrepancies.length?' - Review required':''}`,48,108,11,'Bold',orange);
 text(`Issued: ${date(credit?.issuedAt??view.issuedAt)}`,300,108,10,'Body',muted,247,'right');
 if(!credit&&view.dueAt)text(`Due: ${date(view.dueAt)}`,300,125,10,'Body',muted,247,'right');
 doc.moveTo(48,148).lineTo(547,148).strokeColor(orange).lineWidth(2).stroke().lineWidth(1);
 text('FROM',48,166,9,'Bold',muted);text('BILL TO',310,166,9,'Bold',muted);
 const from=[seller.legalName,seller.address,seller.email,seller.website,seller.taxDetails].filter(Boolean).join('\n');
 const to=[snapshot.customer.name,snapshot.customer.email,`Client Reference Number: ${snapshot.customer.clientReference??'Not recorded'}`,snapshot.customer.billingAddress??'',snapshot.company.name,`Formation state: ${snapshot.company.state}`].filter(Boolean).join('\n');
 const left=wrap(from,235),right=wrap(to,237);y=188;
 for(let i=0;i<Math.max(left.length,right.length);i++){ensure(16);if(left[i]!==undefined)text(left[i],48,y,10,'Body',dark,235);if(right[i]!==undefined)text(right[i],310,y,10,'Body',dark,237);y+=16;}
 y+=12;block(`Order: ${snapshot.orderId}`,9,muted);block(`Application: ${snapshot.applicationId}`,9,muted);
 if(credit)block(`Original invoice: ${view.number}`,10,orange,'Bold');
 y+=8;
 function tableHead(){ensure(36);doc.rect(48,y,width,28).fill('#FFF1EB');text('DESCRIPTION',58,y+8,9,'Bold');text('QTY',335,y+8,9,'Bold',dark,30,'right');text('UNIT PRICE',374,y+8,9,'Bold',dark,75,'right');text('AMOUNT',462,y+8,9,'Bold',dark,75,'right');y+=36;}
 tableHead();
 const creditData=credit?.snapshot as {reason?:string}|undefined;
 const items=credit?[{description:`Refund - ${creditData?.reason??'Processed refund'}`,quantity:1,unitCents:credit.amountCents,amountCents:credit.amountCents}]:snapshot.items;
 for(const item of items){
  const lines=wrap(item.description,265,10);let first=true;
  if(lines.length*16+16<=600&&y+lines.length*16+16>748){page();tableHead();}
  for(const line of lines){if(y+18>748){page();tableHead();}text(line,58,y,10);if(first){text(String(item.quantity),335,y,10,'Body',dark,30,'right');text(invoiceMoney(item.unitCents,snapshot.currency),374,y,10,'Body',dark,75,'right');text(invoiceMoney(item.amountCents,snapshot.currency),462,y,10,'Body',dark,75,'right');first=false;}y+=16;}
  y+=6;doc.moveTo(48,y).lineTo(547,y).strokeColor('#EAECF0').stroke();y+=10;
 }
 const rows=credit?[['Total credited',credit.amountCents]] as const:[['Subtotal',snapshot.subtotalCents],['Taxes',snapshot.taxCents],['Discounts',snapshot.discountCents?-snapshot.discountCents:0],['Invoice total',snapshot.totalCents],['Amount received',view.paidCents],['Amount refunded',view.refundedCents],['Outstanding balance',view.balanceCents??0]] as const;
 ensure(rows.length*24+20);y+=10;
 for(const [label,amount] of rows){const strong=label==='Invoice total'||label==='Outstanding balance'||!!credit;text(label,270,y,10,strong?'Bold':'Body',strong?dark:muted,175);text(invoiceMoney(amount,snapshot.currency),450,y,11,strong?'Bold':'Body',strong?orange:dark,87,'right');y+=24;}
 rule();
 const received=view.payments.filter(p=>p.verifiedAt&&['VERIFIED','DISPUTED','REFUNDED'].includes(p.status));
 const closingHeight=(credit?0:16+(received.length?received.reduce((sum,p)=>sum+16+wrap(`Payment reference: ${p.reference??'Not recorded'}`,width,9).length*15,0):wrap('Unpaid. Sign in to your secure dashboard to view authorized payment options.',width).length*16))+(seller.footer?10+wrap(seller.footer,width,9).length*15:0)+(snapshot.provenance==='REVIEWED_BACKFILL'?42:0)+view.discrepancies.reduce((sum,d)=>sum+wrap(d,width,10,'Bold').length*16,0);
 // Keep a short payment/terms section together; do not orphan the closing text.
 if(closingHeight<=500)ensure(closingHeight);
 if(!credit){
  block('PAYMENT INFORMATION',10,muted,'Bold');
  const paid=received;
  if(!paid.length)block('Unpaid. Sign in to your secure dashboard to view authorized payment options.');
  for(const payment of paid){block(`${date(payment.verifiedAt)} | ${payment.method} | ${invoiceMoney(payment.amountCents??0,snapshot.currency)}`);block(`Payment reference: ${payment.reference??'Not recorded'}`,9,muted);}
  for(const issue of view.discrepancies)block(issue,10,orange,'Bold');
 }
 if(seller.footer){y+=10;block(seller.footer,9,muted);}
 if(snapshot.provenance==='REVIEWED_BACKFILL')block('Historical details reconstructed and reviewed by Apex Filings; original provider documents remain available where recorded.',8,muted);
 const range=doc.bufferedPageRange();
 for(let pageIndex=range.start;pageIndex<range.start+range.count;pageIndex++){
  doc.switchToPage(pageIndex);const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;
  if(pageIndex===range.start+range.count-1)text('Thank you for choosing Apex Filings.',48,760,10,'Bold',dark);
  doc.moveTo(48,783).lineTo(547,783).strokeColor('#EAECF0').stroke();
  text(seller.email,48,795,8,'Body',muted,350);text(`Page ${pageIndex+1} of ${range.count}`,430,795,8,'Body',muted,117,'right');doc.page.margins.bottom=bottom;
 }
 doc.end();return result;
}
