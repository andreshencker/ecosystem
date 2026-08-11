'use client';

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { RelayMark } from '@/components/RelayMark';

interface Application { key:string;name:string;description:string;launchUrl:string;ownership:'first_party'|'third_party';status:'active'|'inactive';displayOrder:number }
const glyphs:Record<string,string>={business:'B',jtrade:'↗'};

export default function ApplicationsPage(){
  const apiUrl=process.env.NEXT_PUBLIC_ID_API_URL??'http://localhost:3101';const[apps,setApps]=useState<Application[]>([]);const[state,setState]=useState<'loading'|'ready'|'forbidden'|'error'>('loading');
  useEffect(()=>{fetch(`${apiUrl}/admin/applications`,{credentials:'include'}).then(async response=>{if(response.status===401){window.location.replace('/');return null}if(response.status===403){setState('forbidden');return null}if(!response.ok)throw new Error();return response.json()}).then(data=>{if(data){setApps(data.applications);setState('ready')}}).catch(()=>setState('error'))},[apiUrl]);
  return <main className="employee-page"><AdminSidebar active="applications"/><section className="employee-content"><header className="employee-topbar"><div><span className="section-kicker">Grapifly Administration</span><h1>Applications</h1></div><div className="admin-pill"><span>G</span><div><strong>Super Admin</strong><small>grapiflydeveloper@gmail.com</small></div></div></header><section className="catalogue-hero"><span>ECOSYSTEM CATALOGUE</span><h2>One ecosystem.<br/>Multiple solutions.</h2><p>This catalogue is the source of truth for every application that can be connected to a Grapifly ID.</p></section><section className="catalogue-heading"><div><h3>Application catalogue</h3><p>{apps.length} registered solutions</p></div><span>Assignments are the next step</span></section>{state==='loading'&&<div className="employee-message">Loading application catalogue…</div>}{state==='forbidden'&&<div className="employee-message"><strong>Administration access required.</strong></div>}{state==='error'&&<div className="employee-message">The application catalogue could not be loaded.</div>}{state==='ready'&&<div className="catalogue-grid">{apps.map(app=><article key={app.key} className={`catalogue-card ${app.key}`}><div className="catalogue-card-top"><div className="catalogue-icon">{app.key==='relay'?<RelayMark/>:glyphs[app.key]}</div><span className={`status-badge ${app.status}`}>{app.status}</span></div><div><span className="catalogue-key">{app.key}</span><h3>{app.name}</h3><p>{app.description}</p></div><footer><span>{app.ownership==='first_party'?'Grapifly app':'Third-party app'}</span><a href={app.launchUrl}>Open ↗</a></footer></article>)}</div>}</section></main>;
}
