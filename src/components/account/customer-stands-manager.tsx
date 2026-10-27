"use client";
import {useMemo,useState} from 'react';
import {StandAssignment} from './stand-assignment';
import type {CustomerPortalStand} from '@/lib/customer-portal';
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';
import {StandCard} from './stand-management-card';
import {StandDetailModal} from './stand-management-dialog';
import {EmptyState} from './stand-management-display';
import {indexStandSearch,filterStandSearch} from './stand-management-model';

export function CustomerStandsManager({
  stands,
  businesses = [],
  hostedPages = {}
}: {
  stands: CustomerPortalStand[];
  hostedPages?: Record<string, HostedPageEditorRecord>;
  businesses?: {id:string;name:string}[];
}) {
  const [assignment,setAssignment]=useState<CustomerPortalStand|null>(null);
  const [selectedStand, setSelectedStand] = useState<CustomerPortalStand | null>(null);
  const [proofOpen,setProofOpen]=useState(false);
  const [showStandPreview, setShowStandPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const searchIndex=useMemo(()=>indexStandSearch(stands),[stands]);
  const visible=useMemo(()=>filterStandSearch(searchIndex,kind,search),[searchIndex,kind,search]);

  if (!stands.length) {
    return <EmptyState message="No stands are linked to this account yet." />;
  }

  return (
    <>
      {stands.length > 1 && <div className="flex flex-wrap gap-3">
        <input className="tr-input flex-1" aria-label="Search stands" placeholder="Search stands" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="tr-input w-auto" aria-label="Stand type" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option><option value="standard">Standard</option><option value="multilink">Multi-Link</option><option value="branded">Branded</option><option value="custom">Custom</option></select>
      </div>}
      <section className="grid gap-3">
        {!visible.length && <EmptyState message="No matching stands." />}
        {visible.map((stand) => (
          <StandCard key={stand.id} stand={stand} onAssign={()=>setAssignment(stand)} hasHostedPage={Boolean(hostedPages[stand.id])}
            onOpen={(preview = false, proof = false) => { setProofOpen(proof);setShowStandPreview(preview); setSelectedStand(stand); }} />
        ))}
      </section>
      {assignment&&<StandAssignment stand={assignment} businesses={businesses} onClose={()=>setAssignment(null)}/>}
      {selectedStand ? <StandDetailModal stand={selectedStand} hostedPage={hostedPages[selectedStand.id]} proofOpen={proofOpen} showStandPreview={showStandPreview} onClose={() => setSelectedStand(null)} /> : null}
    </>
  );
}
