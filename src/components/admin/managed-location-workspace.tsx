'use client';
import {useRouter} from 'next/navigation';
import {AccountNavigation} from '@/components/account/account-navigation';
import {customerNavigation} from '@/lib/customer-navigation';
import {WorkspacePageHeader} from '@/components/account/workspace-ui';
import {ReviewOverview,type OverviewLocation} from '@/components/account/review-overview';
import {GoogleLiveReviews} from '@/components/account/google-live-reviews';
import {ManagedReviewEndpoint} from '@/components/account/review-endpoint';
import {ReviewNotificationForm} from '@/components/account/review-notification-form';
import type {ReviewEmailSettings} from '@/lib/review-email-preferences';
import {ClientLocationDirectory} from './client-location-directory';

type Props={accountId:string;email:string;name:string;locationId:string;section:string;overview:OverviewLocation|null;notifications:ReviewEmailSettings|null;allowed:boolean};
export function ManagedLocationWorkspace({accountId,email,name,locationId,section,overview,notifications,allowed}:Props){
  const router=useRouter();
  const base='/admin/customers/'+accountId;
  const endpoint='/api/admin/customers/'+accountId+'/locations/'+locationId+'/reviews';
  const go=(next:string)=>router.push(base+'?'+new URLSearchParams({section:next,location:locationId}));
  return <div className="tr-prismatic-account"><main className="tr-account-shell tr-workspace-shell tr-client-shell tr-app-shell min-h-screen bg-soft">
    <AccountNavigation links={customerNavigation} managed={{base,section,location:locationId}}/>
    <div className="tr-app-main"><header className="tr-app-context">
      <ClientLocationDirectory selection={{accountId,locationId,section,label:name}}/><span className="text-xs text-muted">Managing as admin · {email}</span>
    </header>
    <div id="workspace-content" className="tr-workspace-content" tabIndex={-1}>
      <WorkspacePageHeader title={section} />
      <ManagedReviewEndpoint.Provider value={endpoint}>
      {!allowed?<p>Review management is unavailable for this location.</p>:<>
        {section==='Overview'&&overview&&<ReviewOverview locations={[overview]} onReviews={()=>go('Reviews')} onProfile={()=>go('Overview')} onIssues={()=>go('Notifications')} onSaved={async()=>router.refresh()}/>}
        {section==='Reviews'&&<GoogleLiveReviews key={endpoint} managed businessId={locationId}/>}
        {section==='Notifications'&&(notifications?<ReviewNotificationForm key={endpoint} name={name} email={email} initial={notifications} endpoint={endpoint+'?view=notifications'}/>:<p>Connect Google Reviews to manage notifications for this location.</p>)}
      </>}
      </ManagedReviewEndpoint.Provider>
    </div></div>
  </main></div>;
}
