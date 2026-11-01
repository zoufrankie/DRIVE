import { auth } from "@/auth";

export const instant = false;

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="p-8 w-full">
      <h1 className="text-3xl font-bold text-black">Home</h1>
      <p className="text-black mt-2">
        Welcome back, {session?.user?.email}
      </p>
    </div>
  );
}