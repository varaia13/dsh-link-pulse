﻿window.__ModuleLoader__.load({
  id: 'dsh-link-pulse',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState, useCallback, useMemo } = React

    let globalCtx = null

    const T = {
      bg: 'var(--dsw-alias-bg-layer-2, #ffffff)',
      layer: 'var(--dsw-alias-bg-layer-2, #ffffff)',
      layer1: 'var(--dsw-alias-bg-layer-1, #f4f4f5)',
      border: 'var(--dsw-alias-border-l1, rgba(0,0,0,.1))',
      border2: 'var(--dsw-alias-border-l2, rgba(0,0,0,.15))',
      label: 'var(--dsw-alias-label-primary, #18181b)',
      secondary: 'var(--dsw-alias-label-secondary, #71717a)',
      brand: 'var(--dsw-alias-brand-primary, #3b82f6)',
      ok: 'var(--dsw-alias-state-success-primary, #22c55e)',
      warn: 'var(--dsw-alias-state-warn-primary, #f59e0b)',
      err: 'var(--dsw-alias-state-error-primary, #ef4444)',
    }

    const CSS = `
      @keyframes pulseFadeSlideUp { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      @keyframes pulseFadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
      @keyframes pulseSpin { to { transform: rotate(360deg) } }
      @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.45) } 70% { box-shadow: 0 0 0 5px rgba(34,197,94,0) } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0) } }
      
      .pulse-panel-enter { animation: pulseFadeSlideUp .2s cubic-bezier(.2,.9,.3,1.2) both }
      .pulse-btn { min-width: 0; transition: background .15s ease, border-color .15s ease, color .15s ease, transform .1s ease, opacity .15s ease }
      .pulse-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-1)); border-color: var(--dsw-alias-border-l2) }
      .pulse-btn:active:not(:disabled) { transform: scale(.97) }
      .pulse-dot-live { animation: pulseGlow 2.4s ease-out infinite }
      .pulse-spin { display: inline-block; animation: pulseSpin .8s linear infinite }
    `

    const dotStyle = (color) => ({
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      verticalAlign: 'middle',
    })

    const btnBase = {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      border: `1px solid ${T.border}`,
      borderRadius: 6,
      background: 'transparent',
      color: T.label,
      fontSize: 12,
      lineHeight: '18px',
      height: 28,
      boxSizing: 'border-box',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }

    // ---------- е…Ёе±ЂеЌ•дѕ‹е…±дє«зЉ¶жЂЃпј€зЅ‘з»ње»¶иїџж•°жЌ®пј‰ ----------
    const store = {
      state: {
        data: null,
        loading: false,
        open: false,
      },
      listeners: new Set(),
      set(patch) {
        store.state = { ...store.state, ...patch }
        for (const fn of store.listeners) fn()
      },
      subscribe(fn) {
        store.listeners.add(fn)
        return () => store.listeners.delete(fn)
      },
    }

    function useStore() {
      return React.useSyncExternalStore(store.subscribe, () => store.state)
    }

    async function fetchStatus(force = false) {
      if (store.state.loading && !force) return
      try {
        store.set({ loading: true })
        const res = await fetch(`/api/link-pulse/status${force ? '?refresh=1' : ''}`)
        if (res.ok) {
          const json = await res.json()
          store.set({ data: json, loading: false })
        } else {
          store.set({ loading: false })
        }
      } catch {
        store.set({ loading: false })
      }
    }

    function getQualityColor(quality, latencyMs) {
      if (quality === 'excellent' || (latencyMs > 0 && latencyMs <= 200)) return T.ok
      if (quality === 'good' || (latencyMs > 200 && latencyMs <= 600)) return T.warn
      return T.err
    }

    function formatModelShortName(modelId) {
      // е±•з¤єе®Њж•ґзљ„ provider-owned model IDпјЊдёЌеЃљ GPT/Gemini/Claude з­‰з®Ђз§°ж е°„гЂ‚
      return modelId || 'Auto'
    }

    /**
     * жќѓеЁЃе®ћж—¶жЉ“еЏ–пјљз›ґжЋҐд»Ћ DSH е®ж–№ sessions дёЋ modelDirectories жњЌеЉЎи®ўй…еЅ“е‰Ќж­ЈењЁеЇ№иЇќзљ„жЁЎећ‹дёЋдѕ›еє”е•†
     */
    function useCurrentActiveModel(defaultConfig) {
      const [selection, setSelection] = useState(() => ({
        provider: defaultConfig?.provider || '',
        model: defaultConfig?.model || '',
      }))

      // еђЋз«ЇзЉ¶жЂЃеј‚ж­Ґе€°иѕѕж—¶пјЊз”Ёе®ћй™…й…ЌзЅ®иЎҐйЅђе€ќе§‹йЂ‰ж‹©пј›дёЌе†ЌзЎ¬зј–з Ѓ CPA/GeminiгЂ‚
      useEffect(() => {
        if (!defaultConfig?.provider || !defaultConfig?.model) return
        setSelection((current) => current?.provider && current?.model ? current : {
          provider: defaultConfig.provider,
          model: defaultConfig.model,
        })
      }, [defaultConfig?.provider, defaultConfig?.model])

      useEffect(() => {
        if (!globalCtx) return

        const getSessions = () => (globalCtx.get ? globalCtx.get('sessions') : globalCtx.sessions)
        const getModelDirs = () => (globalCtx.get ? globalCtx.get('modelDirectories') : globalCtx.modelDirectories)
        const getUiSession = () => (globalCtx.get ? globalCtx.get('uiSession') : globalCtx.uiSession)

        let dirUnsub = null
        let observedSessionId = null

        const getCurrentSessionId = (sessions) => {
          // uiSession жЇ DSH е®ж–№вЂњдё»и§†е›ѕеЅ“е‰ЌдјљиЇќвЂќзЉ¶жЂЃжєђпј›е…¶ current еї«з…§зљ„ key дёє SessionIdгЂ‚
          const uiSession = getUiSession()
          const uiSnapshot = uiSession?.current?.getSnapshot?.()
          if (uiSnapshot?.key) return uiSnapshot.key

          // е…је®№жІЎжњ‰ uiSession зљ„е®їдё»пјљйЂ‰ж‹©еЅ“е‰Ќд»Ќз”± mainView дїќз•™зљ„дјљиЇќгЂ‚
          const list = sessions?.list?.getSnapshot?.()
          const byId = list?.byId || {}
          return Object.values(byId).find((item) => (item?.retainedBy?.mainView || 0) > 0)?.id || null
        }

        const sync = () => {
          try {
            const sessions = getSessions()
            const modelDirs = getModelDirs()
            if (!sessions || !modelDirs) return

            const curSessionId = getCurrentSessionId(sessions)
            if (!curSessionId) return

            if (curSessionId !== observedSessionId) {
              if (dirUnsub) dirUnsub()
              observedSessionId = curSessionId
              const dir = modelDirs.directoryFor?.(curSessionId)
              if (!dir) return

              dirUnsub = dir.store?.subscribe ? dir.store.subscribe(applyDirectorySnapshot) : null

              function applyDirectorySnapshot() {
                const snap = dir.store?.getSnapshot?.()
                if (snap?.current?.provider && snap?.current?.model) {
                  setSelection({
                    provider: snap.current.provider,
                    model: snap.current.model,
                    reasoningEffort: snap.current.reasoningEffort,
                  })
                }
              }

              applyDirectorySnapshot()
            }
          } catch {}
        }

        sync()

        const sessions = getSessions()
        const unsubSessions = sessions?.list?.subscribe ? sessions.list.subscribe(sync) : null
        const uiSession = getUiSession()
        const unsubCurrent = uiSession?.current?.subscribe ? uiSession.current.subscribe(sync) : null

        return () => {
          if (unsubSessions) unsubSessions()
          if (unsubCurrent) unsubCurrent()
          if (dirUnsub) dirUnsub()
        }
      }, [defaultConfig])

      return selection
    }

    function FooterEntry(props) {
      const { wide } = props
      const state = useStore()
      const [hovering, setHovering] = useState(false)
      const hoverTimerRef = React.useRef(null)

      useEffect(() => {
        fetchStatus(false)
        const timer = setInterval(() => fetchStatus(false), 45_000)
        return () => clearInterval(timer)
      }, [])

      const data = state.data
      const defaultModelConfig = data?.defaultModelConfig
      const activeSelection = useCurrentActiveModel(defaultModelConfig)

      const activeProviderInfo = useMemo(() => {
        if (!data) return null
        const pId = activeSelection.provider || data.defaultModelConfig?.provider || 'cpa'
        if (data.providerMap && data.providerMap[pId]) {
          return data.providerMap[pId]
        }
        if (data.providers) {
          const found = data.providers.find((p) => p.id === pId)
          if (found) return found
        }
        // жњЄиЇ†е€«зљ„ providerпјље±•з¤єе…¶зњџе®ћ idпјЊз»ќдёЌе†’еђЌйЎ¶ж›їе€—иЎЁдё­зљ„з¬¬дёЂдёЄдѕ›еє”е•†
        return { id: pId, name: String(pId).toUpperCase(), baseURL: '', probe: null }
      }, [data, activeSelection.provider])

      const currentLatency = activeProviderInfo?.probe?.latencyMs ?? -1
      const currentQuality = activeProviderInfo?.probe?.quality || 'offline'
      const statusColor = getQualityColor(currentQuality, currentLatency)
      const providerDisplayName = activeProviderInfo?.name || activeSelection.provider.toUpperCase()
      const modelShortName = formatModelShortName(activeSelection.model)

      const onMouseEnter = useCallback(() => {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = setTimeout(() => setHovering(true), 220)
      }, [])
      const onMouseLeave = useCallback(() => {
        clearTimeout(hoverTimerRef.current)
        setHovering(false)
      }, [])

      const otherProviders = (data?.providers || []).filter((p) => p.id !== activeProviderInfo?.id)

      const segments = [
        { text: providerDisplayName, color: T.label, bold: true },
        { text: modelShortName, color: T.secondary },
        { text: currentLatency > 0 ? `${currentLatency}ms` : '\u0437\u0430\u0434\u0435\u0440\u0436\u043A\u0430', color: statusColor, bold: true },
      ]

      const node = h(
        'button',
        {
          className: 'pulse-btn',
          onClick: () => store.set({ open: !state.open }),
          onMouseEnter: onMouseEnter,
          onMouseLeave: onMouseLeave,
          style: {
            ...btnBase,
            width: '100%',
            justifyContent: wide ? 'flex-start' : 'center',
            borderColor: state.open ? T.brand : T.border,
            background: state.open ? 'var(--dsw-alias-interactive-bg-hover, rgba(59,130,246,.12))' : 'transparent',
          },
        },
        h('span', {
          className: statusColor === T.ok ? 'pulse-dot-live' : undefined,
          style: dotStyle(statusColor),
        }),
        wide &&
          h(
            'span',
            {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: '18px',
                whiteSpace: 'nowrap',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            },
            segments.flatMap((s, i) =>
              i === 0
                ? [h('span', { key: `s${i}`, style: { color: s.color, fontWeight: 500, flexShrink: 0 } }, s.text)]
                : [
                    h('span', { key: `sep${i}`, style: { color: T.secondary, margin: '0 5px', opacity: 0.7, flexShrink: 0 } }, '·'),
                    h(
                      'span',
                      {
                        key: `s${i}`,
                        style: {
                          color: s.color,
                          fontWeight: s.bold ? 500 : undefined,
                          fontVariantNumeric: 'tabular-nums',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flexShrink: i === segments.length - 1 ? 0 : 1,
                        },
                      },
                      s.text,
                    ),
                  ],
            ),
          ),
      )

      if (!hovering || state.open) return node

      return h(
        'div',
        {
          style: { position: 'relative', width: '100%' },
          onMouseEnter: onMouseEnter,
          onMouseLeave: onMouseLeave,
        },
        node,
        h(
          'div',
          {
            className: 'pulse-panel-enter',
            style: {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 'calc(100% + 6px)',
              background: T.bg,
              border: `1px solid ${T.border2}`,
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,.18)',
              padding: '10px 12px',
              fontSize: '11px',
              lineHeight: '17px',
              color: T.label,
              whiteSpace: 'pre',
              zIndex: 100,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            },
          },
          h('div', { style: { fontWeight: 600, fontSize: '12px', marginBottom: 4 } }, `\u{1F3AF} ${activeSelection.model}`),
          h('div', { style: { color: T.secondary } }, `\u{1F3E2} ${providerDisplayName}`),
          h(
            'div',
            {
              style: {
                color: statusColor,
                fontWeight: 600,
                marginTop: 2,
                marginBottom: otherProviders.length > 0 ? 6 : 0,
              },
            },
            `\u26A1 ${currentLatency > 0 ? currentLatency + ' ms' : '\u0437\u0430\u0434\u0435\u0440\u0436\u043A\u0430'}`,
          ),
          otherProviders.length > 0 &&
            h(
              'div',
              {
                style: {
                  borderTop: `1px dashed ${T.border}`,
                  paddingTop: 6,
                  color: T.secondary,
                },
              },
              '\u{1F310} \u0414\u0440\u0443\u0433\u0438\u0435 \u043A\u0430\u043D\u0430\u043B\u044B Provider',
            ),
          otherProviders.map((p, i) =>
            h(
              'div',
              {
                key: i,
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                },
              },
              h(
                'span',
                { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                h('span', {
                  style: {
                    ...dotStyle(getQualityColor(p.probe?.quality, p.probe?.latencyMs)),
                    width: 5,
                    height: 5,
                  },
                }),
                p.name,
              ),
              h(
                'span',
                {
                  style: {
                    color: getQualityColor(p.probe?.quality, p.probe?.latencyMs),
                    fontWeight: 600,
                  },
                },
                p.probe?.latencyMs > 0 ? `${p.probe.latencyMs} ms` : '\u043E\u0444\u043B\u0430\u0439\u043D',
              ),
            ),
          ),
        ),
      )
    }

    function OverlayPanel() {
      const state = useStore()
      const isOpen = state.open
      const data = state.data
      const loading = state.loading

      const defaultModelConfig = data?.defaultModelConfig
      const activeSelection = useCurrentActiveModel(defaultModelConfig)

      const activeProviderInfo = useMemo(() => {
        if (!data) return null
        const pId = activeSelection.provider || data.defaultModelConfig?.provider || 'cpa'
        if (data.providerMap && data.providerMap[pId]) {
          return data.providerMap[pId]
        }
        if (data.providers) {
          const found = data.providers.find((p) => p.id === pId)
          if (found) return found
        }
        // жњЄиЇ†е€«зљ„ providerпјље±•з¤єе…¶зњџе®ћ idпјЊз»ќдёЌе†’еђЌйЎ¶ж›їе€—иЎЁдё­зљ„з¬¬дёЂдёЄдѕ›еє”е•†
        return { id: pId, name: String(pId).toUpperCase(), baseURL: '', probe: null }
      }, [data, activeSelection.provider])

      if (!isOpen) return null

      const providers = data?.providers || []
      const currentLatency = activeProviderInfo?.probe?.latencyMs ?? -1
      const currentQuality = activeProviderInfo?.probe?.quality || 'offline'
      const statusColor = getQualityColor(currentQuality, currentLatency)
      const otherProviders = providers.filter((p) => p.id !== activeProviderInfo?.id)
      const providerDisplayName = activeProviderInfo?.name || activeSelection.provider.toUpperCase()

      return h(
        'div',
        {
          style: {
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(4px)',
          },
          onClick: (e) => {
            if (e.target === e.currentTarget) store.set({ open: false })
          },
        },
        h(
          'div',
          {
            className: 'pulse-panel-enter',
            style: {
              width: '92%',
              maxWidth: '540px',
              background: T.bg,
              border: `1px solid ${T.border2}`,
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,.25)',
              color: T.label,
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            },
          },
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: `1px solid ${T.border}`,
              },
            },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              h('span', { style: { fontSize: '20px' } }, '\u{1F4E1}'),
              h(
                'div',
                null,
                h('div', { style: { fontSize: '15px', fontWeight: 600 } }, '\u041C\u043E\u0441\u0442 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0438 \u0437\u0430\u0434\u0435\u0440\u0436\u043A\u0430'),
                h(
                  'div',
                  { style: { fontSize: '11px', color: T.secondary } },
                  '\u0416\u0438\u0432\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430: \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0438 \u043C\u043E\u0434\u0435\u043B\u0438',
                ),
              ),
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              h(
                'button',
                {
                  className: 'pulse-btn',
                  onClick: () => fetchStatus(true),
                  disabled: loading,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${T.border}`,
                    background: 'transparent',
                    color: T.label,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  },
                },
                loading ? h('span', { className: 'pulse-spin' }, '\u26A1') : '\u26A1 \u0417\u0430\u043C\u0435\u0440',
              ),
              h(
                'button',
                {
                  className: 'pulse-btn',
                  onClick: () => store.set({ open: false }),
                  style: {
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${T.border}`,
                    background: 'transparent',
                    color: T.secondary,
                    fontSize: '14px',
                    cursor: 'pointer',
                  },
                },
                '\u2715',
              ),
            ),
          ),
          h(
            'div',
            {
              style: {
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              },
            },
            h(
              'div',
              {
                style: {
                  background: T.layer1,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                },
              },
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  },
                },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                  h('span', { style: dotStyle(statusColor) }),
                  h('span', { style: { fontWeight: 600, fontSize: '14px' } }, activeSelection.model),
                  h(
                    'span',
                    {
                      style: {
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59,130,246,.15)',
                        color: T.brand,
                        fontWeight: 600,
                      },
                    },
                    `\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440: ${providerDisplayName}`,
                  ),
                ),
                h(
                  'span',
                  {
                    style: {
                      fontSize: '16px',
                      fontWeight: 700,
                      color: statusColor,
                    },
                  },
                  currentLatency > 0 ? `${currentLatency} ms` : '\u0437\u0430\u0434\u0435\u0440\u0436\u043A\u0430',
                ),
              ),
              h(
                'div',
                { style: { fontSize: '11px', color: T.secondary, wordBreak: 'break-all' } },
                `\u041A\u043E\u043D\u0435\u0447\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430 \u0448\u043B\u044E\u0437\u0430: ${activeProviderInfo?.baseURL || '\u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u044F\u043C\u043E\u0439 \u043A\u0430\u043D\u0430\u043B'}`,
              ),
            ),
            h(
              'div',
              {
                style: {
                  background: T.layer1,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                },
              },
              h(
                'div',
                {
                  style: {
                    fontSize: '12px',
                    fontWeight: 600,
                    color: T.secondary,
                    marginBottom: '10px',
                  },
                },
                '\u{1F310} \u0414\u0440\u0443\u0433\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 Provider-\u043A\u0430\u043D\u0430\u043B\u044B',
              ),
              (() => {
                if (otherProviders.length === 0) {
                  return h(
                    'div',
                    {
                      style: {
                        fontSize: '11px',
                        color: T.secondary,
                        textAlign: 'center',
                        padding: '12px 0',
                      },
                    },
                    '\u041D\u0435\u0442 \u0434\u0440\u0443\u0433\u0438\u0445 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u0445 Provider',
                  )
                }

                return h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                  otherProviders.map((p, idx) => {
                    const lat = p.probe?.latencyMs ?? -1
                    const qual = p.probe?.quality || 'offline'
                    const col = getQualityColor(qual, lat)

                    return h(
                      'div',
                      {
                        key: idx,
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,.03)',
                          border: `1px solid transparent`,
                        },
                      },
                      h(
                        'div',
                        null,
                        h(
                          'div',
                          { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                          h('span', { style: dotStyle(col) }),
                          h('span', { style: { fontWeight: 600, fontSize: '12px' } }, p.name),
                        ),
                        h(
                          'div',
                          { style: { fontSize: '10px', color: T.secondary, marginTop: '2px' } },
                          p.baseURL || '\u0412\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043A\u0430\u043D\u0430\u043B',
                        ),
                      ),
                      h(
                        'div',
                        { style: { textAlign: 'right' } },
                        h(
                          'div',
                          { style: { fontWeight: 700, fontSize: '13px', color: col } },
                          lat > 0 ? `${lat} ms` : '\u0442\u0430\u0439\u043C\u0430\u0443\u0442/\u043E\u0444\u043B\u0430\u0439\u043D',
                        ),
                        h(
                          'div',
                          { style: { fontSize: '9px', color: T.secondary } },
                          lat > 0 ? (lat < 200 ? '\u043E\u0442\u043B\u0438\u0447\u043D\u043E' : '\u0445\u043E\u0440\u043E\u0448\u043E') : '\u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0435\u043D',
                        ),
                      ),
                    )
                  }),
                )
              })(),
            ),
          ),
        ),
      )
    }

    function apply(ctx) {
      globalCtx = ctx

      ctx.effect(() => {
        const el = document.createElement('style')
        el.id = 'dsh-link-pulse-styles'
        el.textContent = CSS
        document.head.appendChild(el)
        return () => el.remove()
      })

      ctx.effect(() =>
        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'link-pulse', order: -10 },
            (props) => h(FooterEntry, props),
          ),
        ),
      )

      ctx.effect(() =>
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'link-pulse-panel', order: 5 },
            () => h(OverlayPanel),
          ),
        ),
      )
    }

    exports.apply = apply
    exports.inject = ['slots', 'sessions', 'modelDirectories', 'uiSession']
    return module.exports
  },
})
