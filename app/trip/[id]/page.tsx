import TripPage from './TripPage'

export default function Page({ params }: { params: { id: string } }) {
  return <TripPage tripId={params.id} />
}
