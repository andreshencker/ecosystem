'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { RelayMark } from '@/components/RelayMark';

type AssignmentStatus='active'|'pending'|'rejected'|'suspended'|'revoked';
interface Assignment {
  _id:string;grapiflyUserId:string;applicationKey:string;status:AssignmentStatus;source:string;grantedAt:string;
  user:{displayName:string;email:string;avatarUrl:string|null}|null;
  application:{name:string;description:string}|null;
}

export default function AccessPage(){
  const apiUrl=process.env.NEXT_PUBLIC_ID_API_URL??'http://localhost:3101';const[items,setItems]=useState<Assignment[]>([]);const[query,setQuery]=useState('');const[state,setState]=useState<'loading'|'ready'|'forbidden'|'error'>('loading');
  const[statusFilter,setStatusFilter]=useState<'all'|AssignmentStatus>('all');
  const[appFilter,setAppFilter]=useState('all');
  const[updatingId,setUpdatingId]=useState<string|null>(null);
  const load=()=>fetch(`${apiUrl}/admin/access`,{credentials:'include'}).then(async response=>{if(response.status===401){window.location.replace('/');return null}if(response.status===403){setState('forbidden');return null}if(!response.ok)throw new Error();return response.json()}).then(data=>{if(data){setItems(data.assignments);setState('ready')}}).catch(()=>setState('error'));
  useEffect(()=>{load()},[apiUrl]);
  const updateStatus=async(id:string,status:AssignmentStatus)=>{setUpdatingId(id);try{const response=await fetch(`${apiUrl}/admin/access/${id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});if(response.ok)await load()}finally{setUpdatingId(null)}};
  const apps=useMemo(()=>{const map=new Map<string,string>();items.forEach(item=>map.set(item.applicationKey,item.application?.name??item.applicationKey));return Array.from(map.entries())},[items]);
  const filtered=useMemo(()=>{const q=query.toLowerCase().trim();return items.filter(item=>{if(statusFilter!=='all'&&item.status!==statusFilter)return false;if(appFilter!=='all'&&item.applicationKey!==appFilter)return false;if(q&&!`${item.user?.displayName} ${item.user?.email} ${item.application?.name}`.toLowerCase().includes(q))return false;return true})},[items,query,statusFilter,appFilter]);
  const grouped=useMemo(()=>{const groups=new Map<string,{grapiflyUserId:string;user:Assignment['user'];assignments:Assignment[]}>();filtered.forEach(item=>{const existing=groups.get(item.grapiflyUserId);if(existing)existing.assignments.push(item);else groups.set(item.grapiflyUserId,{grapiflyUserId:item.grapiflyUserId,user:item.user,assignments:[item]})});return Array.from(groups.values())},[filtered]);
  return <main className="employee-page"><AdminSidebar active="access"/><section className="employee-content"><header className="employee-topbar"><div><span className="section-kicker">Grapifly Administration</span><h1>Access</h1></div><div className="admin-pill"><span>G</span><div><strong>Super Admin</strong><small>grapiflydeveloper@gmail.com</small></div></div></header>
    <section className="access-hero"><div><span>APPLICATION ACCESS</span><h2>Who can use<br/>each solution.</h2></div><p>This first layer answers one question only: which Grapifly IDs have active access to an application. Organizations and roles come next.</p></section>
    <section className="users-panel">
      <div className="users-toolbar"><div><h3>Access by user</h3><p>{grouped.length} users, {filtered.length} application assignments matching current filters</p></div></div>
      <div className="role-filters" style={{margin:'0 30px 20px'}}>
        <label className="role-filter-field"><span>Status</span><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value as any)}>
          <option value="all">All</option><option value="active">Active</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option>
        </select></label>
        <label className="role-filter-field"><span>Application</span><select value={appFilter} onChange={event=>setAppFilter(event.target.value)}>
          <option value="all">All</option>{apps.map(([key,name])=><option key={key} value={key}>{name}</option>)}
        </select></label>
        <label className="role-filter-field role-filter-search"><span>Search</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search access"/></label>
      </div>
      {state==='loading'&&<div className="employee-message">Loading access catalogue…</div>}{state==='forbidden'&&<div className="employee-message"><strong>Administration access required.</strong></div>}{state==='error'&&<div className="employee-message">The access catalogue could not be loaded.</div>}
      {state==='ready'&&<div className="access-list access-groups">{grouped.map(group=><article className="access-group" key={group.grapiflyUserId}><div className="access-user">{group.user?.avatarUrl?<img src={group.user.avatarUrl} alt=""/>:<span>{group.user?.displayName?.[0]??'G'}</span>}<div><strong>{group.user?.displayName??'Unknown user'}</strong><small>{group.user?.email??group.grapiflyUserId}</small><code>{group.grapiflyUserId}</code></div></div><div className="access-apps">{group.assignments.map(item=><div className="access-app-card" key={item._id}><div className="access-app"><div className="access-app-icon">{item.applicationKey==='relay'?<RelayMark/>:'◇'}</div><div><strong>{item.application?.name??item.applicationKey}</strong><small>{item.applicationKey}</small></div></div><div className="access-app-actions">{item.status==='pending'&&<><button className="approve" disabled={updatingId===item._id} onClick={()=>updateStatus(item._id,'active')}>Approve</button><button className="reject" disabled={updatingId===item._id} onClick={()=>updateStatus(item._id,'rejected')}>Reject</button></>}<span className={`status-badge ${item.status}`}>{item.status}</span></div></div>)}</div></article>)}{filtered.length===0&&<div className="employee-message">{items.length===0?'No assignments yet.':'No assignments match your filters.'}</div>}</div>}
    </section>
  </section></main>;
}
