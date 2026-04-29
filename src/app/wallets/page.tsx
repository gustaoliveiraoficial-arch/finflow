import { redirect } from 'next/navigation'

// Página legada sem filtro de device_id — redireciona para a versão correta
export default function WalletsPage() {
  redirect('/carteiras')
}
