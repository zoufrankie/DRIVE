import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/DeleteButton";

export const instant = false;

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      ownerships: {
        include: { vehicle: true },
        orderBy: { createdAt: "desc" },
      },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  const addressLine = [
    client.street,
    [client.city, client.state].filter(Boolean).join(", "),
    client.zip,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="p-8 w-full">
      <Link href="/clients" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to Clients
      </Link>

      <div className="mt-3 mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
          <p className="text-gray-800 mt-1 text-sm">
            {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact info"}
          </p>
          {addressLine && <p className="text-gray-800 mt-1 text-sm">{addressLine}</p>}
          {client.howFoundUs && (
            <p className="text-gray-700 mt-1 text-xs">
              Found us via: {client.howFoundUs}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/clients/${client.id}/edit`}
            className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300 text-gray-900"
          >
            Edit
          </Link>
          <DeleteButton
            itemName={client.name}
            endpoint={`/api/clients/${client.id}`}
            redirectTo="/clients"
          />
        </div>
      </div>

      {client.notes && (
        <div className="mb-8 bg-white border border-gray-300 rounded p-4 text-sm text-gray-800 whitespace-pre-wrap">
          {client.notes}
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <Link
          href={`/vehicles/new?clientId=${client.id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + Add Vehicle
        </Link>
        <Link
          href={`/invoices/new?clientId=${client.id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + New Invoice
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-gray-900">Vehicles Owned</h2>
        {client.ownerships.length === 0 ? (
          <p className="text-gray-700 text-sm">No vehicles yet.</p>
        ) : (
          <div className="bg-white rounded shadow-sm border border-gray-300 divide-y divide-gray-200">
            {client.ownerships.map((o) => (
              <Link
                key={o.id}
                href={`/vehicles/${o.vehicle.id}`}
                className="block px-4 py-3 hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">
                  {[o.vehicle.year, o.vehicle.make, o.vehicle.model]
                    .filter(Boolean)
                    .join(" ")}
                  {o.vehicle.trim && (
                    <span className="text-gray-700 font-normal ml-1">
                      {o.vehicle.trim}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-700 mt-0.5">
                  {[o.vehicle.licensePlate, o.vehicle.vin]
                    .filter(Boolean)
                    .join(" · ") || "No plate/VIN"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3 text-gray-900">Invoices</h2>
        {client.invoices.length === 0 ? (
          <p className="text-gray-700 text-sm">No invoices yet.</p>
        ) : (
          <div className="bg-white rounded shadow-sm border border-gray-300 divide-y divide-gray-200">
            {client.invoices.map((i) => (
              <Link
                key={i.id}
                href={`/invoices/${i.id}`}
                className="block px-4 py-3 hover:bg-gray-50 flex justify-between"
              >
                <span className="font-medium text-gray-900">#{i.number}</span>
                <span className="text-gray-800 text-sm">
                  ${i.total.toFixed(2)} · {i.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
