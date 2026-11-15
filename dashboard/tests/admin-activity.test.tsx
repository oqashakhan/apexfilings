import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminClientIdentity, clientIdentityText } from '../src/components/dashboard/AdminClientIdentity';
import { ActivityTimeline } from '../src/components/dashboard/AdminActivity';
import { activityActions, activityDetail, relativeActivityTime, type ActivityItem } from '../src/lib/admin-activity';

test('client identity pairs the actual name and permanent reference and links to the client', () => {
  const client = { id: 'client-id', fullName: 'Muhammad Ahmed Khan', clientReference: '207741953' };
  const html = renderToStaticMarkup(<AdminClientIdentity client={client} />);
  for (const text of ['Muhammad Ahmed Khan', 'Reference: #207741953', '/admin/clients/client-id']) assert.ok(html.includes(text));
  assert.equal(clientIdentityText(client), 'Muhammad Ahmed Khan 207741953');
  assert.equal(client.clientReference, '207741953');
  const missing = renderToStaticMarkup(<AdminClientIdentity client={{ ...client, fullName: '  ' }} />);
  assert.match(missing, /Name not provided/); assert.match(missing, /207741953/);
  assert.match(renderToStaticMarkup(<AdminClientIdentity />), /Name not provided/);
});
test('activity details allow only known status/check/visibility fields and never arbitrary metadata', () => {
  const fields = { previous: 'UNDER_REVIEW', next: 'FILING_IN_PROGRESS', status: null, check: null, visible: null };
  assert.equal(activityDetail('APPLICATION_STATUS_CHANGED', fields), 'Under Review → Filing In Progress');
  assert.equal(activityDetail('APPLICATION_STATUS_CHANGED', { ...fields, next: 'secret-token-test-only' }), null);
  assert.equal(activityDetail('DOCUMENT_VISIBILITY_CHANGED', { ...fields, visible: 'false' }), 'Internal only');
  assert.equal(activityDetail('REVIEW_CHECK_SET', { ...fields, check: 'PASSWORD=secret' }), null);
  assert.equal(activityActions.MANUAL_PAYMENT_RECORDED[1], 'recorded a manual payment for review');
  assert.equal(activityActions.STRIPE_REFUND_INITIATED[1], 'initiated a Stripe refund');
});
test('timeline presents actor, related company, category, status, links and precise UTC time', () => {
  const item: ActivityItem = { id: 'event', category: 'APPLICATION', description: 'Admin changed an application status', actorName: 'Admin', actorRole: 'Admin', companyName: 'ABC LLC', customer: { id: 'client', fullName: 'Muhammad Ahmed Khan', clientReference: '207741953' }, recordName: 'LLC application', href: '/admin/applications/app', timestamp: '2026-11-01T12:00:00.000Z', detail: 'Under Review → Filing In Progress' };
  const html = renderToStaticMarkup(<ActivityTimeline items={[item]} now={Date.parse(item.timestamp) + 600000} />);
  for (const text of ['10 minutes ago', 'UTC', 'ABC LLC', 'Muhammad Ahmed Khan', '#207741953', 'Applications', '/admin/applications/app', 'Under Review']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /APPLICATION_STATUS_CHANGED|safeMetadata/);
  assert.equal(relativeActivityTime(item.timestamp, Date.parse(item.timestamp) + 60000), '1 minute ago');
  assert.equal(relativeActivityTime(item.timestamp, Date.parse(item.timestamp) + 1000), 'Just now');
});
