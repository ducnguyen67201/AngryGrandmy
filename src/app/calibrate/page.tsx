import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CalibrationStudio } from "@/components/calibration-studio";

export default function CalibratePage() {
  return (
    <main className="min-h-screen bg-[#f1eee4] text-[#172018]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-6 lg:px-8">
        <Link className="flex items-center gap-3 font-black" href="/">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#172018] text-xs text-white">GS</span>
          GrannySmith
        </Link>
        <Link className="inline-flex items-center gap-2 text-sm font-black" href="/lab"><ArrowLeft size={16} /> Back to lab</Link>
      </nav>
      <CalibrationStudio />
    </main>
  );
}
