'use client'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface Props {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
}

export default function DateTimePicker({ value, onChange, placeholder }: Props) {
  return (
    <DatePicker
      selected={value}
      onChange={onChange}
      showTimeSelect
      timeFormat="HH:mm"
      timeIntervals={15}
      dateFormat="dd MMM yyyy, HH:mm"
      showYearDropdown
      scrollableYearDropdown
      yearDropdownItemNumber={10}
      placeholderText={placeholder ?? 'Select date & time…'}
      className="dtp-input"
      wrapperClassName="dtp-wrapper"
      popperPlacement="bottom-start"
    />
  )
}
