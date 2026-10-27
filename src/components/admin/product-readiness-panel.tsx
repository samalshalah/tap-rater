"use client";
import {memo} from 'react';
import {AdminSoftPanel,AdminBadge,AdminAlert} from './admin-ui';
import {SidebarCard,ReadinessLine} from './product-editor-fields';
type ReadinessRow={optionTitle:string;label:string;ready:boolean};
type Props={productMediaReady:boolean; missingOptionMedia:ReadinessRow[]; optionReadinessRows:ReadinessRow[]; canActivate:boolean; brandedProductionTemplateMissing:boolean; mediaWarnings:string[];};
export const ProductReadinessPanel=memo(function ProductReadinessPanel({productMediaReady, missingOptionMedia, optionReadinessRows, canActivate, brandedProductionTemplateMissing, mediaWarnings}:Props){
 return (<SidebarCard title="Asset Readiness">
          <div className="grid gap-3">
            <AdminSoftPanel className="p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Product media</p>
              <ReadinessLine label="Primary product image" ready={productMediaReady} />
            </AdminSoftPanel>
            <AdminSoftPanel className="p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Setup option media</p>
                <AdminBadge tone={missingOptionMedia.length === 0 ? "success" : "danger"}>
                  {missingOptionMedia.length === 0 ? "Ready" : `${missingOptionMedia.length} missing`}
                </AdminBadge>
              </div>
              <div className="mt-2 grid gap-2">
                {optionReadinessRows.length > 0 ? (
                  optionReadinessRows.map((row) => (
                    <ReadinessLine key={`${row.optionTitle}-${row.label}`} label={`${row.optionTitle}: ${row.label}`} ready={row.ready} />
                  ))
                ) : (
                  <ReadinessLine label="Active product option" ready={false} />
                )}
              </div>
            </AdminSoftPanel>
          </div>
          <div className="mt-2 rounded-md bg-[#f7f8fa] px-3 py-2 text-xs font-bold text-ink">
            Can publish: {canActivate ? "Yes" : "No"}
            {brandedProductionTemplateMissing ? (
              <span className="mt-1 block text-red-700">
                Branded unavailable: missing production front template.
              </span>
            ) : null}
          </div>
          {mediaWarnings.length > 0 ? (
            <AdminAlert tone="warning" className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-amber-800">Media warnings</p>
              <ul className="mt-2 grid gap-1 text-xs leading-5 text-amber-800">
                {mediaWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AdminAlert>
          ) : null}
        </SidebarCard>);
});
