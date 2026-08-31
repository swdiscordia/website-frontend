'use client'

import '@shapeshiftoss/swap-widget/style.css'
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/app/[lang]/_components/Button'

import type { MouseEvent, ReactNode } from 'react'

// Loaded client-side only: the widget reads window/localStorage at module init (Reown AppKit) and
// has no meaningful server-rendered output.
const SwapWidget = dynamic(async () => (await import('@shapeshiftoss/swap-widget')).SwapWidget, {
  ssr: false,
  loading: () => <div className={'h-[571px] w-[420px] max-w-full rounded-[20px] bg-[#0A0A14]'} />,
})

// The widget's own CSS pins it to exactly 420px wide with no responsive breakpoint of its own, so
// below that width it would otherwise get silently clipped by the hero's overflow-hidden section.
const WIDGET_NATIVE_WIDTH = 420

// TODO(shapeshift-business): remove this guard once a real walletConnectProjectId (below) is set.
// `showConnectButton={false}` only hides the widget's header Connect shortcut — its primary
// swap-form button independently doubles as "Connect Wallet" whenever no wallet is connected, and
// clicking it still opens the full Reown AppKit modal (email/Google/X/Discord/GitHub sign-in,
// WalletConnect QR), none of which can complete against a placeholder project ID. Redirecting that
// click to the real widget instead of silently swallowing it keeps the button honest — this embed
// stays a look-and-feel preview (asset/chain selection, amounts, and the rest of the swap form stay
// fully interactive) without leaving visitors clicking a "Connect Wallet" button that does nothing.
function blockPlaceholderConnectClick(event: MouseEvent<HTMLDivElement>): void {
  const actionButton = (event.target as HTMLElement).closest('.ssw-action-btn')
  if (actionButton?.textContent?.trim() !== 'Connect Wallet') return
  event.preventDefault()
  event.stopPropagation()
  window.open('https://widget.shapeshift.com/', '_blank', 'noopener,noreferrer')
}

function SwapWidgetEmbed(): ReactNode {
  return (
    <div onClickCapture={blockPlaceholderConnectClick}>
      {/*
        Upstream bug in @shapeshiftoss/swap-widget's own ≤600px CSS: .ssw-modal only sets a
        max-height there, so its flex children (chain sidebar + token list) have no definite space
        to distribute — the virtualized token list resolves to 0px tall and renders zero rows.
        Giving the modal a real height (still capped well under the viewport) fixes the flex
        cascade without changing anything about its layout/content.
      */}
      <style>{'@media (max-width: 600px) { .ssw-modal { height: min(600px, 90vh) !important; } }'}</style>
      <SwapWidget
        // TODO(shapeshift-business): this is a placeholder Reown Cloud project ID pending a real
        // one from the business side. It's enough for the widget to initialize AppKit and render
        // the full asset/chain-selection UI and swap form. Once a real ID is issued: set it here,
        // remove `showConnectButton={false}`, and remove the click guard above.
        walletConnectProjectId={'00000000000000000000000000000000'}
        showConnectButton={false}
        // TODO(shapeshift-business): `partnerCode` intentionally left unset. It requires a real
        // code registered through ShapeShift's own affiliate program (see docs/affiliates.md in
        // shapeshift/web), the same category of external, business-side setup as the
        // walletConnectProjectId above. Without it, swaps through this embed aren't attributed to
        // any affiliate account — acceptable for now since this is a look-and-feel preview on
        // ShapeShift's own site, not a third-party partner integration. Set it here if that changes.
      />
    </div>
  )
}

// The widget has no responsive behavior of its own (fixed 420px width, see WIDGET_NATIVE_WIDTH), so
// below that width this scales the whole thing down to fit instead of letting it get clipped.
// ResizeObserver reports an element's pre-transform layout size, so measuring the inner (scaled)
// wrapper directly still gives its true native height — no separate unscaled probe element needed.
function ScaledSwapWidget(): ReactNode {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [nativeHeight, setNativeHeight] = useState(571)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const outerEl = outerRef.current
    const innerEl = innerRef.current
    if (!outerEl || !innerEl) return undefined

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === outerEl) setScale(Math.min(1, entry.contentRect.width / WIDGET_NATIVE_WIDTH))
        else if (entry.target === innerEl) setNativeHeight(entry.contentRect.height)
      }
    })
    resizeObserver.observe(outerEl)
    resizeObserver.observe(innerEl)

    // A CSS transform on an ancestor makes it the containing block for `position: fixed`
    // descendants, which breaks the "Select Token" modal's full-viewport backdrop and collapses its
    // virtualized token list to zero height once this wrapper is actually scaled down (mobile). The
    // widget already has its own native responsive layout for the modal below a 600px viewport, so
    // rather than fight that, the transform is simply lifted while the modal is open — the resting
    // card (which has no responsive behavior of its own) is the only thing that needs scaling.
    const mutationObserver = new MutationObserver(() => {
      setIsModalOpen(!!innerEl.querySelector('.ssw-modal-backdrop'))
    })
    mutationObserver.observe(innerEl, { childList: true, subtree: true })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  return (
    <div ref={outerRef} className={'w-full max-w-[420px]'} style={{ height: scale * nativeHeight }}>
      <div
        ref={innerRef}
        style={{
          width: WIDGET_NATIVE_WIDTH,
          transform: isModalOpen ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <SwapWidgetEmbed />
      </div>
    </div>
  )
}

const PALETTE = ['#386FF9aa', '#9D63ECaa', '#70E1B1aa', '#06B6D4aa']

export function DevelopersHero(): ReactNode {
  const shouldReduceMotion = useReducedMotion()
  const glowRef = useRef<HTMLDivElement>(null)
  const glowAccent = useMotionValue(PALETTE[0])

  useEffect(() => {
    if (shouldReduceMotion) return undefined
    const controls = animate(glowAccent, [...PALETTE, PALETTE[0]], {
      duration: PALETTE.length * 3.2,
      repeat: Infinity,
      ease: 'linear',
    })

    const el = glowRef.current
    const observer = el
      ? new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) controls.play()
          else controls.pause()
        })
      : null
    if (el && observer) observer.observe(el)

    return () => {
      controls.stop()
      observer?.disconnect()
    }
  }, [shouldReduceMotion, glowAccent])

  const glowBackground = useMotionTemplate`linear-gradient(135deg, ${glowAccent}, #9D63EC77 48%, #70E1B166)`

  return (
    <section className={'relative overflow-hidden pb-16 pt-5 lg:pb-20 lg:pt-4'}>
      <div
        className={'container relative mx-auto grid min-w-0 items-center gap-8 lg:grid-cols-[.92fr_1.08fr] lg:gap-12'}
      >
        <motion.div initial={false} className={'min-w-0 lg:pt-4'}>
          <h1
            className={
              'mb-6 max-w-full text-[46px] font-bold leading-[.98] tracking-[-0.05em] sm:text-[60px] lg:text-[68px]'
            }
          >
            {'Every chain your users need, in one place.'}
          </h1>
          <p className={'mb-7 max-w-[600px] text-lg leading-relaxed text-secondary sm:text-xl'}>
            {'Embed the Widget or call the API. ShapeShift handles the routing across every chain you need.'}
          </p>
          <div className={'mb-8 flex flex-col gap-3 sm:flex-row'}>
            <Button href={'https://widget.shapeshift.com/'} variant={'blue'} title={'Try the Widget'} hasArrow />
            <Button href={'https://discord.gg/shapeshift'} variant={'white'} title={'Talk with us'} />
          </div>
          <div className={'flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400'}>
            {['48+ chains', '18 routing protocols'].map((benefit, index) => (
              <span key={benefit} className={'flex items-center'}>
                {index > 0 ? <span className={'mr-5 text-gray-700'}>{'/'}</span> : null}
                {benefit}
              </span>
            ))}
          </div>
          <div className={'mt-7 border-y border-white/10 py-4'}>
            <div className={'flex flex-wrap items-baseline gap-x-3 gap-y-1'}>
              <strong className={'text-lg font-semibold text-white'}>{'Earn on every attributed swap'}</strong>
              <span className={'text-base font-semibold text-mint'}>{'Set 0 to 100 bps'}</span>
            </div>
            <p className={'mt-1 text-sm text-gray-400'}>{'Your partner fee settles directly on-chain.'}</p>
          </div>
          <a
            href={'#api'}
            className={'mt-5 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white'}
          >
            {'Need more control? Build with the API'}
            <span aria-hidden={'true'}>{'→'}</span>
          </a>
        </motion.div>

        <motion.div
          initial={false}
          className={
            'relative mx-auto flex min-h-[560px] min-w-0 w-full max-w-[660px] items-center justify-center px-2 py-10 lg:min-h-[600px] lg:px-10 lg:py-0'
          }
        >
          <motion.div
            ref={glowRef}
            aria-hidden={'true'}
            initial={false}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    borderRadius: [
                      '42% 58% 61% 39% / 46% 38% 62% 54%',
                      '58% 42% 38% 62% / 39% 61% 42% 58%',
                      '42% 58% 61% 39% / 46% 38% 62% 54%',
                    ],
                    x: ['-3%', '4%', '-3%'],
                    y: ['2%', '-3%', '2%'],
                    scale: [0.96, 1.06, 0.96],
                  }
            }
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className={'pointer-events-none absolute inset-[7%] opacity-40 blur-[64px]'}
            style={{
              background: glowBackground,
              borderRadius: '42% 58% 61% 39% / 46% 38% 62% 54%',
            }}
          />
          <ScaledSwapWidget />
        </motion.div>
      </div>
    </section>
  )
}
