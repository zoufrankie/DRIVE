import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/DeleteButton";

export const instant = false;

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      owners: { include: { client: true } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!vehicle) notFound();

  const title = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="p-8 w-full">
      <Link href="/vehicles" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to Vehicles
      </Link>

      <div className="mt-3 mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {title}
            {vehicle.trim && (
              <span className="text-gray-700 font-normal ml-2">
                {vehicle.trim}
              </span>
            )}
          </h1>
          <p className="text-gray-800 mt-1 text-sm">
            {vehicle.owners.length === 0
              ? "No owners"
              : "Owned by " +
                vehicle.owners.map((o) => o.client.name).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/vehicles/${vehicle.id}/edit`}
            className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300 text-gray-900"
          >
            Edit
          </Link>
          <DeleteButton
            itemName={`${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`.trim()}
            endpoint={`/api/vehicles/${vehicle.id}`}
            redirectTo="/vehicles"
          />
        </div>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-300 p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-6 text-sm">
        <Detail label="VIN" value={vehicle.vin} mono />
        <Detail label="License Plate" value={vehicle.licensePlate} mono />
        <Detail label="Type" value={vehicle.vehicleType} />
        <Detail label="Color" value={vehicle.color} />
        <Detail label="Transmission" value={vehicle.transmission} />
        <Detail label="Driven Wheels" value={vehicle.drivenWheels} />
        <Detail label="Engine" value={vehicle.engine} />
        <Detail
          label="Odometer"
          value={
            vehicle.odometer != null
              ? vehicle.odometer.toLocaleString() + " mi"
              : null
          }
        />
      </div>

      {vehicle.notes && (
        <div className="mb-8 bg-white border border-gray-300 rounded p-4 text-sm text-gray-800 whitespace-pre-wrap">
          {vehicle.notes}
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <Link
          href={`/invoices/new?clientId=${vehicle.owners[0]?.clientId ?? ""}&vehicleId=${vehicle.id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + New Invoice
        </Link>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-3 text-gray-900">Service History</h2>
        {vehicle.invoices.length === 0 ? (
          <p className="text-gray-700 text-sm">No invoices yet.</p>
        ) : (
          <div className="bg-white rounded shadow-sm border border-gray-300 divide-y divide-gray-200">
            {vehicle.invoices.map((i) => (
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

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-700">{label}</div>
      <div className={`text-gray-900 ${mono ? "font-mono text-sm" : ""}`}>
        {value ?? <span className="text-gray-500">—</span>}
      </div>
    </div>
  );
}