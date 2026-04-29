import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

const KEY = 'amigao_device_id'

/** Retorna ou cria o device_id persistente no localStorage */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = uuidv4()
    localStorage.setItem(KEY, id)
  }
  return id
}

/** Hook React que retorna o device_id (null durante SSR/hidratação) */
export function useDeviceId(): string | null {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => { setId(getDeviceId()) }, [])
  return id
}
