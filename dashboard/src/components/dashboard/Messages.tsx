"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./messages.css";

type Chat = { id:string; customer:{fullName:string;clientReference:string|null}; company:{preferredName:string}|null; assignedToId:string|null; closedAt:string|null; lastMessage:string; unread:number };
type Message = {seq:string;body:string;createdAt:string;authorId:string;author:{fullName:string;role:string}};
type Staff = {id:string;fullName:string};
export function Messages({role,companies=[]}:{role:"admin"|"client"|"staff";companies?:{id:string;name:string}[]}) {
  const [chats,setChats]=useState<Chat[]>([]),[staff,setStaff]=useState<Staff[]>([]),[id,setId]=useState(""),[messages,setMessages]=useState<Message[]>([]),[me,setMe]=useState("");
  const [selected,setSelected]=useState<Chat|null>(null),[threadLoading,setThreadLoading]=useState(false);
  const [companyId,setCompanyId]=useState("");
  const [filter,setFilter]=useState("all"),[page,setPage]=useState(1),[hasNext,setHasNext]=useState(false);
  const [search,setSearch]=useState(""),[unread,setUnread]=useState(false),[draft,setDraft]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[more,setMore]=useState(false);
  const bottom=useRef<HTMLDivElement>(null);
  const cursor=useRef(""), current=useRef(""), pendingKey=useRef(""), lock=useRef(new Set<string>()), draftRef=useRef(""), listRequest=useRef(0);
  const command=useCallback(async (data:object)=>{
    const r=await fetch("/api/v1/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const value=await r.json();if(!r.ok)throw new Error(value.error||"Request failed");return value;
  },[]);
  const list=useCallback(async()=>{
    const requestId=++listRequest.current;
    const r=await fetch("/api/v1/chat?"+new URLSearchParams({search,filter,unread:String(unread),page:String(page)}),{cache:"no-store"});
    if(!r.ok)throw new Error("Could not load conversations");const result=await r.json();if(requestId!==listRequest.current)return;setChats(result.chats);setStaff(result.staff);setHasNext(result.hasMore);setLoading(false);
  },[search,filter,unread,page]);
  const load=useCallback(async (conversation:string,mode:"new"|"initial"|"older")=>{
    if(lock.current.has(conversation))return;lock.current.add(conversation);
    try{
      const params=new URLSearchParams({id:conversation});
      if(mode==="new"&&cursor.current)params.set("after",cursor.current);
      if(mode==="older"&&messages[0])params.set("before",messages[0].seq);
      const r=await fetch("/api/v1/chat?"+params,{cache:"no-store"});const result=await r.json();
      if(!r.ok)throw new Error(result.error||"Could not load messages");
      if(current.current!==conversation)return;
      const incoming=result.messages as Message[];setMe(result.userId);setSelected(result.chat);setThreadLoading(false);
      setMessages(existing=>{const all=mode==="initial"?incoming:mode==="older"?[...incoming,...existing]:[...existing,...incoming];return [...new Map(all.map(m=>[m.seq,m])).values()].sort((a,b)=>BigInt(a.seq)<BigInt(b.seq)?-1:1);});
      if(mode!=="older"&&incoming.length)cursor.current=incoming[incoming.length-1].seq;
      if(mode!=="new")setMore(result.hasMore);
      if(mode!=="older"&&incoming.length)await command({action:"read",id:conversation,through:incoming[incoming.length-1].seq});
      setError("");
    }finally{lock.current.delete(conversation);}
  },[command,messages]);
  useEffect(()=>{const conversation=new URLSearchParams(window.location.search).get("conversation");if(conversation)queueMicrotask(()=>setId(conversation));},[]);
  useEffect(()=>{const timer=setTimeout(()=>void list().catch(e=>{setError(e.message);setLoading(false);}),200);return()=>clearTimeout(timer);},[list]);
  useEffect(()=>{current.current=id;cursor.current="";const timer=setTimeout(()=>{setMessages([]);setSelected(null);setThreadLoading(!!id);setMore(false);if(id)void load(id,"initial").catch(e=>{setThreadLoading(false);setError(e.message);});},0);return()=>clearTimeout(timer);},[id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    const timer=setInterval(()=>{if(document.visibilityState==="visible"){void list().catch(()=>setError("Connection lost. Retrying…"));if(id)void load(id,"new").catch(()=>setError("Connection lost. Retrying…"));}},5000);
    return()=>clearInterval(timer);
  },[id,list,load]);
  const latestSeq=messages.at(-1)?.seq;
  useEffect(()=>{bottom.current?.scrollIntoView({block:"nearest"});},[id,latestSeq]);
  async function send(){
    const message=draft.trim();if(!message||busy||!id)return;
    if(draftRef.current!==id+":"+message){pendingKey.current=crypto.randomUUID();draftRef.current=id+":"+message;}
    setBusy(true);try{const sent=await command({action:"send",id,key:pendingKey.current,message});setDraft("");pendingKey.current="";draftRef.current="";if(current.current===id)setMessages(existing=>existing.some(m=>m.seq===sent.message.seq)?existing:[...existing,sent.message].sort((a,b)=>BigInt(a.seq)<BigInt(b.seq)?-1:1));await load(id,"new");await list();}catch(e){setError(e instanceof Error?e.message:"Could not send");}finally{setBusy(false);}
  }
  async function action(data:object){setBusy(true);try{await command(data);await load(id,"new");await list();setError("");}catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}}
  return <div className="chat-page"><header><h1>Messages</h1><p>Contact the Apex Filings support team.</p>{role==="client"&&<><p>Agent availability is currently unavailable. You can still send a message.</p><Link href="/client/support">Create a support ticket</Link></>}</header>
    {error&&<p role="alert">{error}</p>}
    <div className="chat-layout"><aside><h2>Conversations</h2>{role==="client"?<><label>Company<select value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="">General support</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="button button-primary" disabled={busy} onClick={()=>{setBusy(true);void command({action:"start",companyId:companyId||null}).then(r=>{setId(r.id);return list();}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Start conversation</button></>:<><label>Search clients or companies<input value={search} onChange={e=>(setPage(1),setSearch(e.target.value))}/></label><label>Conversations<select value={filter} onChange={e=>(setPage(1),setFilter(e.target.value))}><option value="all">All</option><option value="assigned">Assigned</option><option value="closed">Resolved</option></select></label><label><input type="checkbox" checked={unread} onChange={e=>(setPage(1),setUnread(e.target.checked))}/> Unread only</label></>}
      {loading?<p>Loading conversations…</p>:chats.map(c=><button className={c.id===id?"chat-selected":""} key={c.id} onClick={()=>setId(c.id)}><strong>{role==="client"?c.company?.preferredName||"Apex Filings Support":c.customer.fullName+" #"+(c.customer.clientReference??"Not assigned")}</strong><span>{c.company?.preferredName} {c.unread>0&&`· ${c.unread} unread`}</span><small>{c.lastMessage}</small></button>)}{!loading&&!chats.length&&<p>No conversations match.</p>}<div><button disabled={page===1} onClick={()=>setPage(page-1)}>Previous</button> Page {page} <button disabled={!hasNext} onClick={()=>setPage(page+1)}>Next</button></div></aside>
      <section className="chat-thread">{!id?<p>Select a conversation.</p>:<><div className="chat-toolbar"><strong>{role==="client"?"Apex Filings Support":selected?.customer.fullName}</strong>{role==="admin"&&<label>Assigned to<select value={selected?.assignedToId??""} onChange={e=>void action({action:"assign",id,staffId:e.target.value||null})}><option value="">Unassigned</option>{staff.map(s=><option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>}{role!=="client"&&<button disabled={busy} onClick={()=>void action({action:"close",id,closed:!selected?.closedAt})}>{selected?.closedAt?"Reopen":"Close"}</button>}</div>
      <div className="chat-messages">{more&&<button onClick={()=>void load(id,"older").catch(e=>setError(e.message))}>Load older messages</button>}{messages.map(m=><article className={m.authorId===me?"chat-own":""} key={m.seq}><strong>{m.authorId===me?"You":m.author.role==="CLIENT"?m.author.fullName:"Support"}</strong><p>{m.body}</p><time>{new Date(m.createdAt).toLocaleString()}</time></article>)}{threadLoading?<p role="status">Loading messages…</p>:!messages.length&&<p>No messages yet.</p>}<div ref={bottom}/></div>
      <form onSubmit={e=>{e.preventDefault();void send();}}><label>Message<textarea maxLength={4000} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/></label><button className="button button-primary" disabled={busy||threadLoading||!draft.trim()||!!selected?.closedAt}>{busy?"Sending…":"Send"}</button></form></>}</section></div></div>;
}
