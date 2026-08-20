import { describe, expect, it } from 'vitest'
import { fromFile, toFile } from '../src/reference/model/document.js'
import { renderSvg } from '../src/reference/model/renderSvg.js'

describe('SVG rendering', () => {
  it('uses an explicit image source instead of the YAML-relative asset path', () => {
    const { svg } = renderSvg({
      service: { id: 'test', name: 'Test' },
      lanes: [{ id: 'evidence', kind: 'evidence', label: 'Evidence' }],
      stages: [{ id: 'stage', name: 'Stage' }],
      elements: [{ id: 'receipt', stage: 'stage', lane: 'evidence', label: 'Receipt', image: 'assets/receipt.png' }],
      connections: [],
      actors: [],
      systems: [],
    }, { imageSources: { receipt: 'data:image/png;base64,aW1hZ2U=' } })

    expect(svg).toContain('href="data:image/png;base64,aW1hZ2U="')
    expect(svg).not.toContain('href="assets/receipt.png"')
  })

  it('persists and exports hidden stage headers', () => {
    const doc = {
      service: { id: 'test', name: 'Test' },
      lanes: [{ id: 'customer', kind: 'customer', label: 'Customer' }],
      stageHeadersHidden: true,
      stages: [{ id: 'stage', name: 'Stage', duration: { min: 2, max: 2, unit: 'minutes' } }],
      elements: [],
      connections: [],
      actors: [],
      systems: [],
    }

    expect(toFile(doc).view).toEqual({ stage_headers_hidden: true })
    expect(fromFile(toFile(doc)).stageHeadersHidden).toBe(true)

    const { svg } = renderSvg(doc)
    expect(svg).not.toContain('>Stage<')
    expect(svg).not.toContain('2 minutes')
  })

  it('renders connections behind cards and wraps long labels', () => {
    const doc = {
      service: { id: 'test', name: 'Test' },
      lanes: [{ id: 'customer', kind: 'customer', label: 'Customer' }],
      stages: [{ id: 'first', name: 'First' }, { id: 'second', name: 'Second' }],
      elements: [
        { id: 'first-card', stage: 'first', lane: 'customer', label: 'This label has enough words to wrap across several lines safely' },
        { id: 'second-card', stage: 'second', lane: 'customer', label: 'Second card' },
      ],
      connections: [{ from: 'first-card', to: 'second-card', type: 'interaction' }],
      actors: [],
      systems: [],
    }

    const { svg } = renderSvg(doc)
    expect(svg.indexOf('marker-end="url(#arrow-2A6FA8)"')).toBeLessThan(svg.indexOf('fill="#DCE9F3"'))
    expect(svg).toContain('This label has enough')
    expect(svg).toContain('words to wrap across')
  })
})