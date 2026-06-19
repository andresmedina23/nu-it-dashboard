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
        {label} {required && <span className="text-[#E04045]">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nu-input"
      />
      {hint && <p className="mt-1 text-[11px] text-[#C9B3D9]/40">{hint}</p>}
    </div>
  )
}
