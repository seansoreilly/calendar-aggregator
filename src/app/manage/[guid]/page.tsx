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
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-14 sm:px-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-graphite">
          Manage collection
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          Edit sources or delete this collection.
        </h1>
      </div>

      <ManageCollectionForm guid={guid} />
    </div>
  )
}
