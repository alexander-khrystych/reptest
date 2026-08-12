import { useTranslation } from 'react-i18next'

/**
 * The grid legend: what a ✓, a blank, the triad frame and the pair +1 / -1 hatching mean.
 * Shared by the on-screen analysis toolbar (next to "Add pair") and each page of the PDF.
 */
export function GridLegend({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2 ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <i className="rg-sw rg-sw-match">✓</i> {t('result.legendMatch')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="rg-sw" /> {t('result.legendContrast')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="rg-sw rg-sw-frame" /> {t('result.legendTriad')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="rg-sw rg-sw-pos" /> {t('result.legendPos')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="rg-sw rg-sw-neg" /> {t('result.legendNeg')}
      </span>
    </div>
  )
}
