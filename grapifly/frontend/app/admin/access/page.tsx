'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { RelayMark } from '@/components/RelayMark';

interface Assignment {
  _id:string;grapiflyUserId:string;applicationKey:string;status:'active'|'suspended'|'revoked';source:string;grantedAt:string;
  user:{displayName:string;email:string;avatarUrl:string|null}|null;
  application:{name:string;description:string}|null;
}

export default function AccessPage(){
  const apiUrl=process.env.NEXT_PUBLIC_ID_API_URL??'http://localhost:3101';const[items,setItems]=useState<Assignment[]>([]);const[query,setQuery]=useState('');const[state,setState]=useState<'loading'|'ready'|'forbidden'|'error'>('loading');
  useEffect(()=>{fetch(`${apiUrl}/admin/access`,{credentials:'include'}).then(async response=>{if(response.status===401){window.location.replace('/');return null}if(response.status===403){setState('forbidden');return null}if(!response.ok)throw new Error();return response.json()}).then(data=>{if(data){setItems(data.assignments);setState('ready')}}).catch(()=>setState('error'))},[apiUrl]);
  const filtered=useMemo(()=>{const q=query.toLowerCase().trim();return q?items.filter(item=>`${item.user?.displayName} ${item.user?.email} ${item.application?.name}`.toLowerCase().includes(q)):items},[items,query]);
  return <main className="employee-page"><AdminSidebar active="access"/><section className="employee-content"><header className="employee-topbar"><div><span className="section-kicker">Grapifly Administration</span><h1>Access</h1></div><div className="admin-pill"><span>G</span><div><strong>Super Admin</strong><small>grapiflydeveloper@gmail.com</small></div></div></header>
    <section className="access-hero"><div><span>APPLICATION ACCESS</span><h2>Who can use<br/>each solution.</h2></div><p>This first layer answers one question only: which Grapifly IDs have active access to an application. Organizations and roles come next.</p></section>
    <section className="users-panel"><div className="users-toolbar"><div><h3>Application assignments</h3><p>{items.length} active ecosystem relationships</p></div><label><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search access"/></label></div>
      {state==='loading'&&<div className="employee-message">Loading access catalogue…</div>}{state==='forbidden'&&<div className="employee-message"><strong>Administration access required.</strong></div>}{state==='error'&&<div className="employee-message">The access catalogue could not be loaded.</div>}
      {state==='ready'&&<div className="access-list">{filtered.map(item=><article key={item._id}><div className="access-user">{item.user?.avatarUrl?<img src={item.user.avatarUrl} alt=""/>:<span>{item.user?.displayName?.[0]??'G'}</span>}<div><strong>{item.user?.displayName??'Unknown user'}</strong><small>{item.user?.email??item.grapiflyUserId}</small></div></div><div className="access-line"><i></i></div><div className="access-app"><div className="access-app-icon">{item.applicationKey==='relay'?<RelayMark/>:'◇'}</div><div><strong>{item.application?.name??item.applicationKey}</strong><small>{item.applicationKey}</small></div></div><span className={`status-badge ${item.status}`}>{item.status}</span></article>)}{filtered.length===0&&<div className="employee-message">No assignments match your search.</div>}</div>}
    </section>
  </section></main>;
}
