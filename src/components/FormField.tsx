interface Props {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
  required?: boolean
}

export default function FormField({ label, id, value, onChange, placeholder, type = 'text', hint, required }: Props) {
  return (
    <div>
      <label htmlFor={id} className="nu-label">
        {label} {required && <span className="text-nu-error">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nu-input"
      />
      {hint && <p className="mt-1 text-xs text-nu-light/40">{hint}</p>}
    </div>
  )
}
