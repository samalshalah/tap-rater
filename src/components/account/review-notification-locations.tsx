'use client';
import {Bell,BellOff} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import type {ReviewEmailSettings} from '@/lib/review-email-preferences';
import {ReviewNotificationForm} from './review-notification-form';

/** True when any review alert or report email is switched on for a location. */
export function notificationsOn(v:ReviewEmailSettings){return v.lowMode!=='off'||v.highMode!=='off'||v.weekly||v.monthly;}

/** Bell shown on a Locations card; a crossed-out bell means every email is off. */
export function NotificationBellButton({name,settings,onOpen}:{name:string;settings:ReviewEmailSettings;onOpen:()=>void}){
 const on=notificationsOn(settings);
 return <button type="button" className="tr-button-ghost tr-notification-bell" title={on?'Email notifications: on':'Email notifications: all off'} aria-label={`Email notifications for ${name}`} onClick={event=>{event.stopPropagation();onOpen();}}>{on?<Bell size={14} aria-hidden="true"/>:<BellOff size={14} aria-hidden="true"/>}</button>;
}

/** The existing review email settings form, opened as a popup for one location. */
export function NotificationSettingsDialog({name,email,settings,onClose}:{name:string;email:string;settings:ReviewEmailSettings;onClose:()=>void}){
 return <ModalDialog labelledBy="notification-settings-title" onClose={onClose}><div className="w-[min(560px,calc(100vw-32px))]">
  <ReviewNotificationForm key={settings.businessId} headingId="notification-settings-title" name={name} email={email} initial={settings} onClose={onClose}/>
 </div></ModalDialog>;
}
