import { Metadata } from 'next'
import ManageCollectionForm from '../../../components/manage-collection-form'

export const metadata: Metadata = {
  title: 'Manage Collection | Calendar Aggregator',
}

export default async function ManageCollectionPage({
  params,
}: {
  params: Promise<{ guid: string }>
}) {
  const { guid } = await params

  return (
    <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-4 pt-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
          Manage Collection
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto">
          Update your source calendars or delete this collection.
        </p>
      </div>

      <ManageCollectionForm guid={guid} />
    </div>
  )
}
