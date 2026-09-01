'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';

interface RoleEntry { flow:'client'|'provider'|'internal';roleKey:string;description:string;displayOrder:number }
type Flow = 'client'|'provider'|'internal';
type DrawerMode = 'create'|'edit'|null;

const flowLabels:Record<Flow,string>={client:'Client',provider:'Provider',internal:'Internal'};
const flowSubtitles:Record<Flow,string>={client:'People who use an app as customers of their own organization.',provider:'Team that manages an app registered in the catalogue.',internal:'Global ecosystem level — the same across every app.'};

function EditIcon(){
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.474 5.408 18.592 7.53M4 20l.688-3.44a2 2 0 0 1 .551-1.03l9.9-9.9a1.5 1.5 0 0 1 2.122 0l1.61 1.61a1.5 1.5 0 0 1 0 2.122l-9.9 9.9a2 2 0 0 1-1.03.55L4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function DeleteIcon(){
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function RolesPage(){
  const apiUrl=process.env.NEXT_PUBLIC_ID_API_URL??'http://localhost:3101';
  const[flows,setFlows]=useState<Record<Flow,RoleEntry[]>>({client:[],provider:[],internal:[]});
  const[state,setState]=useState<'loading'|'ready'|'forbidden'|'error'>('loading');
  const[selectedFlow,setSelectedFlow]=useState<Flow>('client');
  const[query,setQuery]=useState('');

  const[drawerMode,setDrawerMode]=useState<DrawerMode>(null);
  const[drawerRole,setDrawerRole]=useState<RoleEntry|null>(null);
  const[formRoleKey,setFormRoleKey]=useState('');
  const[formDescription,setFormDescription]=useState('');
  const[saving,setSaving]=useState(false);
  const[formError,setFormError]=useState('');

  const load=useCallback(()=>{
    return fetch(`${apiUrl}/admin/role-catalog`,{credentials:'include'}).then(async response=>{
      if(response.status===401){window.location.replace('/');return null}
      if(response.status===403){setState('forbidden');return null}
      if(!response.ok)throw new Error();
      return response.json();
    }).then(data=>{if(data){setFlows(data.flows);setState('ready')}}).catch(()=>setState('error'));
  },[apiUrl]);

  useEffect(()=>{load()},[load]);

  const roles=flows[selectedFlow]??[];
  const totalRoles=Object.values(flows).reduce((sum,list)=>sum+list.length,0);
  const filtered=useMemo(()=>{
    const q=query.toLowerCase().trim();
    return q?roles.filter(role=>`${role.roleKey} ${role.description}`.toLowerCase().includes(q)):roles;
  },[query,roles]);

  function openCreate(){
    setDrawerMode('create');setDrawerRole(null);setFormRoleKey('');setFormDescription('');setFormError('');
  }
  function openEdit(role:RoleEntry){
    setDrawerMode('edit');setDrawerRole(role);setFormRoleKey(role.roleKey);setFormDescription(role.description);setFormError('');
  }
  function closeDrawer(){
    if(saving)return;
    setDrawerMode(null);setDrawerRole(null);setFormError('');
  }

  async function handleSubmit(event:React.FormEvent){
    event.preventDefault();
    setFormError('');setSaving(true);
    try{
      if(drawerMode==='create'){
        const response=await fetch(`${apiUrl}/admin/role-catalog`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({flow:selectedFlow,roleKey:formRoleKey,description:formDescription})});
        if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message??'Could not create role')}
      } else if(drawerMode==='edit'&&drawerRole){
        const response=await fetch(`${apiUrl}/admin/role-catalog/${drawerRole.flow}/${drawerRole.roleKey}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:formDescription})});
        if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message??'Could not update role')}
      }
      setDrawerMode(null);setDrawerRole(null);
      await load();
    }catch(err){setFormError(err instanceof Error?err.message:'Could not save role')}
    finally{setSaving(false)}
  }

  async function handleDelete(role:RoleEntry){
    if(!window.confirm(`Delete role "${role.roleKey}" from the ${role.flow} flow?`))return;
    try{
      const response=await fetch(`${apiUrl}/admin/role-catalog/${role.flow}/${role.roleKey}`,{method:'DELETE',credentials:'include'});
      if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message??'Could not delete role')}
      await load();
    }catch(err){window.alert(err instanceof Error?err.message:'Could not delete role')}
  }

  return <main className="employee-page"><AdminSidebar active="roles"/><section className="employee-content">
    <header className="employee-topbar"><div><span className="section-kicker">Grapifly Administration</span><h1>Roles</h1></div><div className="admin-pill"><span>G</span><div><strong>Super Admin</strong><small>grapiflydeveloper@gmail.com</small></div></div></header>
    <section className="catalogue-hero"><span>ROLE CATALOGUE</span><h2>One list of roles.<br/>Every flow, every app.</h2><p>This is the single source of truth for roles — client and provider share the same four roles across every organization; internal levels are global, the same across every app.</p></section>

    {state==='loading'&&<div className="employee-message">Loading role catalogue…</div>}
    {state==='forbidden'&&<div className="employee-message"><strong>Administration access required.</strong></div>}
    {state==='error'&&<div className="employee-message">The role catalogue could not be loaded.</div>}

    {state==='ready'&&<section className="role-panel">
      <div className="role-panel-header">
        <div><h3>Roles by flow</h3><p>{totalRoles} roles total, {roles.length} in the selected flow — {flowSubtitles[selectedFlow]}</p></div>
        <button type="button" className="role-add-button" onClick={openCreate}>+ New role</button>
      </div>

      <div className="role-filters">
        <label className="role-filter-field role-flow-select"><span>Flow</span><select value={selectedFlow} onChange={event=>{setSelectedFlow(event.target.value as Flow);setQuery('')}}>
          <option value="owner">Owner</option>
          <option value="provider">Provider</option>
          <option value="internal">Internal</option>
        </select></label>
        <label className="role-filter-field role-filter-search"><span>Search</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search role"/></label>
      </div>

      <div className="users-table-wrap"><table className="users-table role-table"><thead><tr><th>Role</th><th>Description</th><th></th></tr></thead><tbody>
        {filtered.map(role=><tr key={role.roleKey}>
          <td><strong>{role.roleKey}</strong></td>
          <td>{role.description}</td>
          <td><div className="role-row-actions"><button type="button" title="Edit role" aria-label="Edit role" onClick={()=>openEdit(role)}><EditIcon/></button><button type="button" className="danger" title="Delete role" aria-label="Delete role" onClick={()=>handleDelete(role)}><DeleteIcon/></button></div></td>
        </tr>)}
      </tbody></table>
      {filtered.length===0&&<div className="employee-message">{roles.length===0?'This flow doesn’t have any roles yet.':'No roles match your search.'}</div>}
      </div>
    </section>}

    {drawerMode&&<div className="drawer-overlay" onClick={closeDrawer}><aside className="drawer" onClick={event=>event.stopPropagation()}>
      <header className="drawer-header"><div><h3>{drawerMode==='create'?`Create role for ${flowLabels[selectedFlow]}`:`Edit ${drawerRole?.roleKey}`}</h3><p>{drawerMode==='create'?'Added to the shared catalogue — applies immediately across every app.':`${flowLabels[drawerRole?.flow??selectedFlow]} flow`}</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
      <form className="drawer-body" onSubmit={handleSubmit} id="role-form">
        {formError&&<div className="drawer-error">{formError}</div>}
        <label className="drawer-field"><span>Role name</span><input value={formRoleKey} onChange={event=>setFormRoleKey(event.target.value)} placeholder="role_name" required disabled={drawerMode==='edit'}/></label>
        <label className="drawer-field"><span>Description</span><input value={formDescription} onChange={event=>setFormDescription(event.target.value)} placeholder="Description" required/></label>
      </form>
      <footer className="drawer-footer"><button type="button" onClick={closeDrawer} disabled={saving}>Cancel</button><button type="submit" form="role-form" disabled={saving}>{saving?'Saving…':'Save'}</button></footer>
    </aside></div>}
  </section></main>;
}
