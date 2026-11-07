import {NextRequest} from 'next/server';
import {ownInvoice} from '@/server/invoice-access';
import {invoiceView} from '@/server/invoices';
import {json,handleError} from '@/server/http';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const {invoice}=await ownInvoice(request,(await params).id);return json({invoice:invoiceView(invoice)});}catch(error){return handleError(error);}}
