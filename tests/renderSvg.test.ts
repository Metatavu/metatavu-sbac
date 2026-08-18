import { describe, expect, it } from 'vitest'
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
})