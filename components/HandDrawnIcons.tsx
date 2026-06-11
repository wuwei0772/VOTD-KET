export function FlameIcon({ size = 19 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: '-3.5px' }}
      aria-hidden="true"
    >
      <path
        d="M12.2 2.8c.5 2.8-1.6 4.3-3.2 6.2C7.6 10.7 6.6 12.5 6.8 14.7a5.4 5.4 0 0 0 10.8-.3c.1-2.4-1.1-4.1-2.2-5.5-.3 1.1-.9 1.9-1.8 2.3.5-2.7 0-5.8-1.4-8.4z"
        fill="#E79D98"
      />
      <path
        d="M12.1 20.4a3 3 0 0 1-3-3.1c0-1.4.8-2.3 1.6-3.2.5-.6.9-1.2 1.1-2 1.2 1.1 3.3 2.8 3.3 5.2a3 3 0 0 1-3 3.1z"
        fill="#F8D7D2"
      />
    </svg>
  )
}

export function ConfettiIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      style={{ display: 'inline-block', verticalAlign: '-3px', marginLeft: '2px' }}
      aria-hidden="true"
    >
      <path d="M4.5 20.5l3.5-9.5 6 6z" fill="#F8D7D2" stroke="#E79D98" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12.5 8.5c1.2-2 3.2-1.6 4-3.8" stroke="#E8552F" strokeWidth="1.6" />
      <path d="M15.5 12.5c1.8-.8 3-.2 4.5-1.2" stroke="#FFB13B" strokeWidth="1.6" />
      <circle cx="18.5" cy="4.5" r="1.1" fill="#FFD43B" />
      <circle cx="21" cy="15.5" r="1.1" fill="#E79D98" />
      <circle cx="13" cy="3.5" r="1" fill="#E8552F" />
    </svg>
  )
}
