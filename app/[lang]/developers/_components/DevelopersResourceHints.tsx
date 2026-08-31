'use client'

import ReactDOM from 'react-dom'

import type { ReactNode } from 'react'

export function DevelopersResourceHints(): ReactNode {
  ReactDOM.prefetchDNS('https://widget.shapeshift.com')
  ReactDOM.preconnect('https://widget.shapeshift.com', { crossOrigin: 'anonymous' })
  return null
}
