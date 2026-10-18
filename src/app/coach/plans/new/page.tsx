import { PageHeader } from "@/components/ui";
import { requireCoach } from "@/lib/session";
import { PlanUploadForm } from "./PlanUploadForm";

export default async function NewPlanPage() {
  await requireCoach();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Upload a plan" subtitle="Describe it, then attach your programme as a CSV." />
      <PlanUploadForm />
    </div>
  );
}
