/**
 * Starter documents: the blank presets offered by "New blueprint", and the
 * appliance-purchase sample (the NN/g worked example) used for demos and tests.
 */

import { LINES } from './constants.js';
import { slugify } from './ids.js';

export const LANE_PRESETS = {
  blueprint: {
    label: 'Service blueprint lanes',
    hint: 'Evidence · Customer · Frontstage · Backstage · Support',
    lanes: [
      { id: 'evidence', kind: 'evidence', label: 'Evidence', sublabel: '' },
      {
        id: 'customer',
        kind: 'customer',
        label: 'Customer journey',
        sublabel: '',
        dividerAfter: LINES.INTERACTION,
      },
      { id: 'frontstage', kind: 'frontstage', label: 'Frontstage', sublabel: 'Employee actions' },
      {
        id: 'technology',
        kind: 'technology',
        label: 'Frontstage',
        sublabel: 'Technology',
        dividerAfter: LINES.VISIBILITY,
      },
      {
        id: 'backstage',
        kind: 'backstage',
        label: 'Backstage',
        sublabel: 'Actions',
        dividerAfter: LINES.INTERNAL_INTERACTION,
      },
      { id: 'support', kind: 'support', label: 'Support processes', sublabel: '' },
    ],
  },
  technical: {
    label: 'Technical lanes',
    hint: 'Customer · UI · Application · Backend · External',
    lanes: [
      {
        id: 'customer',
        kind: 'customer',
        label: 'Customer',
        sublabel: '',
        dividerAfter: LINES.INTERACTION,
      },
      { id: 'ui', kind: 'frontstage', label: 'User interface', sublabel: '' },
      {
        id: 'application',
        kind: 'technology',
        label: 'Application',
        sublabel: '',
        dividerAfter: LINES.VISIBILITY,
      },
      {
        id: 'backend',
        kind: 'backstage',
        label: 'Backend services',
        sublabel: '',
        dividerAfter: LINES.INTERNAL_INTERACTION,
      },
      { id: 'external', kind: 'support', label: 'External systems', sublabel: '' },
    ],
  },
  minimal: {
    label: 'Minimal',
    hint: 'One customer lane — add the rest yourself',
    lanes: [{ id: 'customer', kind: 'customer', label: 'Customer journey', sublabel: '' }],
  },
};

/** A blank document with one stage and the chosen lane preset. */
export function blankDocument(name, preset = 'blueprint') {
  const lanes = (LANE_PRESETS[preset] || LANE_PRESETS.blueprint).lanes;
  return {
    service: { id: slugify(name), name },
    lanes: lanes.map((lane) => ({ ...lane })),
    stages: [{ id: 'stage-1', name: 'Stage 1', description: '', duration: null }],
    elements: [],
    connections: [],
    actors: [],
    systems: [],
  };
}

const element = (id, stage, lane, type, label, extra = {}) => ({
  id,
  stage,
  lane,
  type,
  label,
  ...extra,
});

/** The appliance-purchase blueprint. */
export function sampleDocument() {
  return {
    service: { id: 'appliance-purchase', name: 'Appliance purchase' },
    lanes: LANE_PRESETS.blueprint.lanes.map((lane) => ({ ...lane })),
    stages: [
      {
        id: 'research',
        name: 'Research',
        description: 'Customer discovers the retailer online.',
        duration: { min: 5, max: 25, unit: 'minutes' },
      },
      { id: 'store-visit', name: 'Store visit', duration: { min: 20, max: 50, unit: 'minutes' } },
      { id: 'consultation', name: 'Consultation', duration: { min: 20, max: 50, unit: 'minutes' } },
      { id: 'purchase', name: 'Purchase', duration: { min: 5, max: 12, unit: 'days' } },
      {
        id: 'notification',
        name: 'Delivery notice',
        duration: { min: 35, max: 35, unit: 'seconds' },
      },
      { id: 'delivery', name: 'Delivery', duration: { min: 20, max: 32, unit: 'minutes' } },
    ],
    elements: [
      element('website', 'research', 'evidence', 'evidence', 'Website'),
      element('retail-location', 'store-visit', 'evidence', 'evidence', 'Retail location'),
      element('store-signage', 'store-visit', 'evidence', 'evidence', 'Store signage'),
      element('name-tag', 'consultation', 'evidence', 'evidence', 'Employee name tag'),
      element('price-tag', 'consultation', 'evidence', 'evidence', 'Price tag'),
      element('store-receipt', 'purchase', 'evidence', 'evidence', 'Store receipt', {
        note: 'Paper today; digital in the target state.',
      }),
      element('delivery-receipt', 'delivery', 'evidence', 'evidence', 'Delivery receipt'),

      element('visits-website', 'research', 'customer', 'customer-action', 'Visits website', {
        actor: 'customer',
        status: 'implemented',
        marker: 'fact',
      }),
      element(
        'visits-store',
        'store-visit',
        'customer',
        'customer-action',
        'Visits store, browses appliances',
        { actor: 'customer', marker: 'fact' }
      ),
      element(
        'discusses-features',
        'consultation',
        'customer',
        'customer-action',
        'Discusses features, price, availability',
        { actor: 'customer' }
      ),
      element('makes-purchase', 'purchase', 'customer', 'customer-action', 'Makes purchase', {
        actor: 'customer',
        system: 'pos',
        status: 'implemented',
      }),
      element(
        'notified-eta',
        'notification',
        'customer',
        'customer-action',
        'Notified of delivery ETA',
        { actor: 'customer', marker: 'pain', status: 'planned' }
      ),
      element(
        'appliance-delivered',
        'delivery',
        'customer',
        'customer-action',
        'Appliance delivered',
        { actor: 'customer' }
      ),

      element(
        'welcomes-to-store',
        'store-visit',
        'frontstage',
        'frontstage-action',
        'Welcomes to store',
        { actor: 'salesperson', emotion: 'positive' }
      ),
      element(
        'checks-inventory',
        'consultation',
        'frontstage',
        'frontstage-action',
        'Checks inventory and delivery times',
        {
          actor: 'salesperson',
          system: 'inventory',
          status: 'implemented',
          emotion: 'frustrated',
          metricName: 'avg lookup',
          metricValue: '3.5 min',
        }
      ),
      element(
        'provides-delivery-time',
        'purchase',
        'frontstage',
        'frontstage-action',
        'Provides delivery time',
        { actor: 'salesperson', marker: 'assumption', emotion: 'neutral' }
      ),

      element(
        'support-chat',
        'research',
        'technology',
        'frontstage-technology',
        'Support chat',
        { system: 'chat', status: 'implemented', owner: 'web-team' }
      ),
      element(
        'automated-call',
        'notification',
        'technology',
        'frontstage-technology',
        'Automated call with date of delivery',
        { system: 'notify', status: 'in-progress', marker: 'opportunity' }
      ),

      element(
        'responds-chat',
        'research',
        'backstage',
        'backstage-action',
        'Responds to chat questions',
        {
          actor: 'salesperson',
          system: 'chat',
          emotion: 'frustrated',
          metricName: 'first response',
          metricValue: '4 min',
        }
      ),
      element(
        'inventory-system',
        'consultation',
        'backstage',
        'system',
        'Inventory management system',
        { system: 'inventory', status: 'implemented', owner: 'platform-team' }
      ),
      element('pos-system', 'purchase', 'backstage', 'system', 'Point of sale system', {
        system: 'pos',
        status: 'implemented',
        owner: 'checkout-team',
      }),
      element('fulfillment-queue', 'notification', 'backstage', 'process', 'Fulfillment queue', {
        system: 'fulfillment',
        status: 'in-progress',
        owner: 'checkout-team',
      }),
      element('accounting', 'delivery', 'backstage', 'process', 'Accounting', {
        marker: 'question',
      }),

      element('analytics-logs', 'research', 'support', 'system', 'Analytics logs visitor', {
        system: 'analytics',
        status: 'implemented',
      }),
      element('foot-traffic', 'store-visit', 'support', 'system', 'Foot traffic scanner'),
      element('payment-process', 'purchase', 'support', 'process', 'Payment process', {
        system: 'payments',
        status: 'implemented',
        metricName: 'fee per order',
        metricValue: '€0.28',
      }),
      element(
        'appliance-distributor',
        'notification',
        'support',
        'process',
        'Appliance distributor'
      ),
      element('third-party-delivery', 'delivery', 'support', 'process', '3rd party delivery service', {
        system: 'delivery-partner',
        marker: 'assumption',
      }),
    ],
    connections: [
      { from: 'visits-website', to: 'support-chat', type: 'interaction' },
      { from: 'support-chat', to: 'responds-chat', type: 'dependency' },
      { from: 'visits-store', to: 'welcomes-to-store', type: 'interaction' },
      { from: 'discusses-features', to: 'checks-inventory', type: 'interaction' },
      { from: 'inventory-system', to: 'checks-inventory', type: 'supports' },
      { from: 'inventory-system', to: 'pos-system', type: 'data-flow' },
      { from: 'payment-process', to: 'pos-system', type: 'system-call' },
      { from: 'pos-system', to: 'makes-purchase', type: 'interaction' },
      { from: 'provides-delivery-time', to: 'makes-purchase', type: 'interaction' },
      { from: 'appliance-distributor', to: 'fulfillment-queue', type: 'dependency' },
      { from: 'fulfillment-queue', to: 'automated-call', type: 'triggers' },
      { from: 'automated-call', to: 'notified-eta', type: 'interaction' },
      { from: 'fulfillment-queue', to: 'third-party-delivery', type: 'dependency' },
      { from: 'third-party-delivery', to: 'appliance-delivered', type: 'interaction' },
    ],
    actors: [
      { id: 'customer', name: 'Customer', type: 'external' },
      { id: 'salesperson', name: 'Salesperson', type: 'human' },
    ],
    systems: [
      { id: 'chat', name: 'Support chat' },
      { id: 'inventory', name: 'Inventory' },
      { id: 'pos', name: 'Point of sale' },
      { id: 'payments', name: 'Payment service' },
      { id: 'fulfillment', name: 'Fulfillment' },
      { id: 'notify', name: 'Notification service' },
      { id: 'analytics', name: 'Analytics' },
      { id: 'delivery-partner', name: 'Delivery partner' },
    ],
  };
}
