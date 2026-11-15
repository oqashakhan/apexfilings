import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompanyDocumentUpload } from '../src/components/dashboard/CompanyDocumentUpload';
import { noticeHref } from '../src/components/dashboard/NotificationCenter';
test('Admin upload form exposes required metadata, company/application selection, file limits and visibility', () => {
  const html = renderToStaticMarkup(<CompanyDocumentUpload clientId="client" clientName="Fictional Client" companyId="company" companies={[{id:'company',name:'Fictional LLC'}]} onCompany={() => {}} applicationId="app" applications={[{id:'app',preferredName:'Fictional LLC'}]} onApplication={() => {}} onClose={() => {}} onUploaded={async () => {}} />);
  for (const text of ['role="dialog"','Fictional Client','Document company','Document application','Document title','Description (optional)','Document type','Visible to client','Maximum 8 MB','Upload document']) assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/\/data\/apex-documents|privateStorageKey|100%/);
});
test('new publication links to the exact authenticated client document; legacy links remain supported', () => {
  assert.equal(noticeHref('client',{type:'COMPANY_DOCUMENT_READY',relatedEntity:'doc-1'}),'/client/documents?document=doc-1');
  assert.equal(noticeHref('client',{type:'FINAL_DOCUMENT',relatedEntity:'app-1'}),'/client/applications/app-1');
});
