import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function HomePage() {
  const session = await auth();

  const jobcards = await prisma.invoice.findMany({
    where: {
      jobStartedAt: { not: null },
      status: "IN_PROGRESS",
    },
    include: {
      client: { select: { id: true, name: true } },
      vehicle: {
        select: {
          id: true, year: true, make: true, model: true, licensePlate: true,
        },
      },
    },
    orderBy: { jobStartedAt: "desc" },
  });

  return (
    <div className="p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Active Jobcards</h1>
          <p className="text-gray-700 mt-1">
            {jobcards.length === 0
              ? "No jobs in progress."
              : `${jobcards.length} job${jobcards.length === 1 ? "" : "s"} in progress`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/invoices/new"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            + New Invoice
          </Link>
          <Link
            href="/jobcards"
            className="bg-gray-200 text-gray-900 px-4 py-2 rounded text-sm hover:bg-gray-300"
          >
            All Jobcards
          </Link>
        </div>
      </div>

      {jobcards.length === 0 ? (
        <div className="bg-white border border-gray-300 rounded p-12 text-center">
          <p className="text-gray-700">
            No jobs in progress. Start a job from any invoice to see it here.
          </p>
          <Link
            href="/invoices"
            className="text-blue-700 hover:underline mt-2 inline-block text-sm"
          >
            Go to Invoices
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobcards.map((job) => {
            const daysAgo = job.jobStartedAt
              ? Math.floor((Date.now() - job.jobStartedAt.getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            const vehicleText = job.vehicle
              ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                  .filter(Boolean)
                  .join(" ")
              : "No vehicle";
            const balance = job.total - job.amountPaid;

            return (
              <Link
                key={job.id}
                href={`/invoices/${job.id}`}
                className="block bg-white border-2 border-gray-300 rounded p-5 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xl font-mono font-bold text-black">
                    {job.number}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
                    In Progress
                  </span>
                </div>
                <div className="text-sm font-semibold text-black mb-1">
                  {job.client.name}
                </div>
                <div className="text-sm text-gray-700 mb-3 truncate">
                  {vehicleText}
                  {job.vehicle?.licensePlate && (
                    <span className="text-gray-500 ml-1">· {job.vehicle.licensePlate}</span>
                  )}
                </div>
                <div className="flex items-end justify-between pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    Started{" "}
                    {daysAgo === 0
                      ? "today"
                      : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Total</div>
                    <div className="font-mono font-bold text-black">
                      ${job.total.toFixed(2)}
                    </div>
                    {balance > 0.01 && (
                      <div className="text-xs text-orange-700 font-mono">
                        ${balance.toFixed(2)} due
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}