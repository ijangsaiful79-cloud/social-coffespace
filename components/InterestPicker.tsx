'use client'

export const INTERESTS = [
  'Kopi', 'Musik', 'Kuliner', 'Traveling', 'Film & Series',
  'Buku', 'Olahraga', 'Gaming', 'Fotografi', 'Bisnis', 'Seni', 'Teknologi',
]

const MAX_SELECT = 5

interface Props {
  selected: string[]
  onChange: (interests: string[]) => void
}

export default function InterestPicker({ selected, onChange }: Props) {
  function toggle(interest: string) {
    if (selected.includes(interest)) {
      onChange(selected.filter((i) => i !== interest))
    } else {
      if (selected.length >= MAX_SELECT) return
      onChange([...selected, interest])
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-muted-foreground">Minat & Hobi</label>
        <span className="text-xs text-muted-foreground">{selected.length}/{MAX_SELECT}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => {
          const active = selected.includes(interest)
          const disabled = !active && selected.length >= MAX_SELECT
          return (
            <button
              key={interest}
              type="button"
              onClick={() => toggle(interest)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : disabled
                  ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {interest}
            </button>
          )
        })}
      </div>
    </div>
  )
}
