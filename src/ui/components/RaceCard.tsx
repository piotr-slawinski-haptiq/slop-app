import styles from './RaceCard.module.css'

export type FormRowSurface = 'turf' | 'synthetic' | 'dirt'

export type RaceCardFormRow = {
  date: string
  distance: string
  surface: FormRowSurface
  rating: string
  finish: string
}

export type RaceCardProps = {
  saddleClothNumber: number
  horseName: string
  horseNameSuffix?: string
  powerpicksLabel?: string
  jockeyName: string
  trainerName: string
  jockeyRating?: string
  trainerRating?: string
  liveOdds: string
  projected: string
  careerRecord: { totalRaces: number; winPlaceShow: string }
  formRows: RaceCardFormRow[]
  spotlightRating: number | null
  spotlightRatingPercent?: number
  runningStyle: string
  earlyPacePercent?: number
  latePacePercent?: number
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width={10} height={10}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width={16} height={18}>
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
    </svg>
  )
}

export function RaceCard({
  saddleClothNumber,
  horseName,
  horseNameSuffix,
  powerpicksLabel,
  jockeyName,
  trainerName,
  jockeyRating,
  trainerRating,
  liveOdds,
  projected,
  careerRecord,
  formRows,
  spotlightRating,
  spotlightRatingPercent = 75,
  runningStyle,
  earlyPacePercent = 70,
  latePacePercent = 45,
}: RaceCardProps) {
  return (
    <article className={styles.card}>
      <section className={styles.top}>
        <div className={styles.companyInfo}>
          <div className={styles.headerRow}>
            <div className={styles.titlesRow}>
              <div className={styles.saddleCloth}>
                <span className={styles.saddleClothNumber}>{saddleClothNumber}</span>
              </div>
              <div>
                <span className={styles.horseName}>{horseName}</span>
                {horseNameSuffix != null && (
                  <span className={styles.horseNameSuffix}> {horseNameSuffix}</span>
                )}
              </div>
            </div>
            {powerpicksLabel != null && (
              <div className={styles.powerpicks}>
                <StarIcon className={styles.powerpicksStar} />
                <span className={styles.powerpicksLabel}>{powerpicksLabel}</span>
              </div>
            )}
          </div>

          <div className={styles.row}>
            <div>
              <span className={styles.label}>Jockey</span>
              <span className={styles.labelValue}>{jockeyName}</span>
            </div>
            <div className={styles.ratingPill}>
              <span>Rating:</span>
              <span>{jockeyRating ?? '-'}</span>
            </div>
          </div>

          <div className={styles.row}>
            <div>
              <span className={styles.label}>Trainer</span>
              <span className={styles.labelValue}>{trainerName}</span>
            </div>
            <div className={styles.ratingPill}>
              <span>Rating:</span>
              <span>{trainerRating ?? '-'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      <section className={styles.bottom}>
        <div className={styles.statsRow}>
          <div className={styles.oddsBox}>
            <span className={styles.oddsLabel}>Live Odds</span>
            <span className={styles.oddsValueLive}>{liveOdds}</span>
          </div>
          <div className={styles.oddsBox}>
            <span className={styles.oddsLabel}>Projected</span>
            <span className={styles.oddsValueProjected}>{projected}</span>
          </div>
          <div className={styles.statsDivider} />
          <div className={styles.careerRecord}>
            <p className={styles.careerRecordLabel}>
              Career Record <span className={styles.careerRecordLabelSmall}>(win-place-show)</span>
            </p>
            <div className={styles.careerRecordValue}>
              <span className={styles.careerRecordRaces}>{careerRecord.totalRaces}</span>
              <span>races</span>
              <span className={styles.careerRecordWinPlaceShow}>({careerRecord.winPlaceShow})</span>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.horseFormSection}>
          <h3 className={styles.horseFormTitle}>Horse Form</h3>
          <div className={styles.formTable}>
            <div className={styles.formHeader}>
              <div className={styles.formHeaderCell}>
                Date
                <ChevronUpIcon className={styles.sortIcon} />
              </div>
              <div className={styles.formHeaderCell}>
                Distance
                <ChevronUpIcon className={styles.sortIcon} />
              </div>
              <div className={styles.formHeaderCell}>
                Surface
                <ChevronUpIcon className={styles.sortIcon} />
              </div>
              <div className={styles.formHeaderCell}>
                Rating
                <ChevronUpIcon className={styles.sortIcon} />
              </div>
              <div className={`${styles.formHeaderCell} ${styles.formHeaderCellFinish}`}>
                Finish
                <ChevronUpIcon className={styles.sortIcon} />
              </div>
            </div>
            {formRows.map((row, i) => (
              <div key={i} className={styles.formRow}>
                <div className={styles.formCell}>{row.date}</div>
                <div className={`${styles.formCell} ${styles.formCellDistance}`}>
                  {row.distance}
                </div>
                <div
                  className={`${styles.formCell} ${styles.formCellSurface} ${
                    row.surface === 'turf'
                      ? styles.surfaceTurf
                      : row.surface === 'synthetic'
                        ? styles.surfaceSynthetic
                        : styles.surfaceDirt
                  }`}
                >
                  {row.surface === 'turf' ? 'Turf' : row.surface === 'synthetic' ? 'Synthetic' : 'Dirt'}
                </div>
                <div className={`${styles.formCell} ${styles.formCellRating}`}>{row.rating}</div>
                <div className={`${styles.formCell} ${styles.formCellFinish}`}>{row.finish}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.ratingSection}>
          <div className={styles.spotlightBlock}>
            <span className={styles.spotlightTitle}>Spotlight Rating</span>
            <div
              className={styles.spotlightCircle}
              style={
                { '--spotlight-fill-deg': `${spotlightRatingPercent * 3.6}deg` } as React.CSSProperties
              }
            >
              <span className={styles.spotlightValue}>
                {spotlightRating != null ? spotlightRating : '-'}
              </span>
            </div>
          </div>

          <div className={styles.ratingSectionDivider} />

          <div className={styles.runningStyleBlock}>
            <div className={styles.runningStyleHeader}>
              <span className={styles.runningStyleLabel}>Running Style</span>
              <span className={styles.runningStyleValue}>{runningStyle || '-'}</span>
            </div>
            <div className={styles.paceRow}>
              <div className={styles.paceLabelRow}>
                <span className={styles.paceLabel}>Early Pace</span>
                <span className={styles.paceValue}>-</span>
              </div>
              <div className={styles.paceBarTrack}>
                <div
                  className={styles.paceBarFill}
                  style={{ width: `${earlyPacePercent}%` }}
                />
              </div>
            </div>
            <div className={styles.paceRow}>
              <div className={styles.paceLabelRow}>
                <span className={styles.paceLabel}>Late Pace</span>
                <span className={styles.paceValue}>-</span>
              </div>
              <div className={styles.paceBarTrack}>
                <div
                  className={styles.paceBarFill}
                  style={{ width: `${latePacePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  )
}
