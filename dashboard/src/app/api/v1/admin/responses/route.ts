import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { requireRole,body,checkOrigin,json,handleError,ApiError } from '@/server/http';
export async function GET(req:NextRequest){
  try{await requireRole(req,'OWNER');
    const params=req.nextUrl.searchParams,q=params.get('q')?.trim().slice(0,160),page=z.coerce.number().int().positive().max(100000).parse(params.get('page')??1);
    const where={...(params.get('unread')==='true'?{readAt:null}:{}),...(q?{OR:[{body:{contains:q,mode:'insensitive' as const}},{applicationId:q},{customer:{clientReference:q}},{customer:{fullName:{contains:q,mode:'insensitive' as const}}},{application:{company:{preferredName:{contains:q,mode:'insensitive' as const}}}}]}:{})};
    const [items,total]=await Promise.all([db.customerResponse.findMany({where,select:{id:true,applicationId:true,body:true,readAt:true,createdAt:true,customer:{select:{fullName:true,clientReference:true}},application:{select:{company:{select:{preferredName:true}}}}},skip:(page-1)*25,take:25,orderBy:[{createdAt:'desc'},{id:'desc'}]}),db.customerResponse.count({where})]);
    return json({items,total});
  }catch(e){return handleError(e);}
}
export async function PATCH(req:NextRequest){
  try{checkOrigin(req);await requireRole(req,'OWNER');const {id}=z.object({id:z.string()}).parse(await body(req));
    if(!await db.customerResponse.count({where:{id}}))throw new ApiError(404,'Response not found.');
    await db.customerResponse.updateMany({where:{id,readAt:null},data:{readAt:new Date()}});return json({saved:true});
  }catch(e){return handleError(e);}
}
