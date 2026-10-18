import { Button, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { applyAsCoachAction } from "../actions";

export default async function ApplyPage() {
  await requireUser("/coach/apply");
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Become a creator" subtitle="Tell athletes who you are." />
      <Card>
        <form action={applyAsCoachAction} className="space-y-4">
          <Field name="displayName" label="Name athletes will see" required />
          <Field name="gymName" label="Gym or business (optional)" />
          <label className="block">
            <span className="text-sm font-medium">Bio</span>
            <textarea name="bio" rows={4} className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="Qualifications, who you coach, results…" />
          </label>
          <Button className="w-full">Create creator profile</Button>
        </form>
      </Card>
    </div>
  );
}

function Field({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input name={name} required={required} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
    </label>
  );
}
