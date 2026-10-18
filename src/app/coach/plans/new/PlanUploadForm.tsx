"use client";

import { useActionState, useState } from "react";
import { Button, Card } from "@/components/ui";
import { APP_NAME } from "@/lib/brand";
import { EQUIPMENT, LEVELS, SPORT_DEFS, type Sport } from "@/lib/sports";
import { createPlanFromCsvAction } from "../../actions";

const TEMPLATE =
  "days_per_week,week,session,session_title,kind,est_minutes,exercise,sets,reps,intensity_type,intensity_value,distance_m,duration_sec,rest_sec,notes\n" +
  "4,1,1,Heavy squat,STRENGTH,75,back-squat,4,5,PERCENT_1RM,75,,,180,\n" +
  "4,1,2,Easy run,RUN_EASY,40,run,,,PACE_ZONE,1,6000,,,Conversational pace\n";

const input = "mt-1 w-full rounded-xl border border-line px-3 py-2";

export function PlanUploadForm() {
  const [state, action, pending] = useActionState(createPlanFromCsvAction, { errors: [] });
  const [sport, setSport] = useState<Sport>("POWERLIFTING");
  const [access, setAccess] = useState("INCLUDED");

  return (
    <form action={action} className="space-y-4">
      <Card className="space-y-4">
        <label className="block"><span className="text-sm font-medium">Title</span><input name="title" required className={input} /></label>
        <label className="block"><span className="text-sm font-medium">One-line summary</span><input name="summary" required className={input} /></label>
        <label className="block"><span className="text-sm font-medium">Description</span><textarea name="description" rows={5} required className={input} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Sport</span>
            <select name="sport" value={sport} onChange={(e) => setSport(e.target.value as Sport)} className={input}>
              {Object.values(SPORT_DEFS).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="text-sm font-medium">Typical session (min)</span><input name="sessionMinutes" type="number" defaultValue={60} className={input} /></label>
        </div>
        <Checks name="levels" label="Suitable for" options={LEVELS.map((l) => ({ id: l, label: l.toLowerCase() }))} />
        <Checks name="goals" label="Goals" options={SPORT_DEFS[sport].goals} />
        <Checks name="equipment" label="Equipment needed" options={EQUIPMENT.filter((e) => e.id !== "full_gym")} />
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Access</span>
            <select name="access" value={access} onChange={(e) => setAccess(e.target.value)} className={input}>
              <option value="INCLUDED">Included in subscription</option>
              <option value="PREMIUM">Premium (one-off price)</option>
            </select>
          </label>
          {access === "PREMIUM" && <label className="block"><span className="text-sm font-medium">Price (£)</span><input name="price" type="number" min={1} className={input} /></label>}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">Programme CSV</p>
        <p className="text-sm text-muted">
          One row per exercise. Add a block of rows per <code>days_per_week</code> you support (e.g. a 3-day and a 4-day version) so
          more athletes match. Write loads as <code>PERCENT_1RM</code> or <code>RPE</code> and runs as <code>PACE_ZONE</code> 1–5 so every athlete gets personal numbers.
        </p>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download={`${APP_NAME.toLowerCase()}-plan-template.csv`} className="text-sm font-semibold underline">
          Download template
        </a>
        <input name="csv" type="file" accept=".csv,text/csv" required className="block text-sm" />
      </Card>

      {state.errors.length > 0 && (
        <Card tone="error" className="text-sm">
          <ul className="list-disc pl-5">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </Card>
      )}
      <Button variant="brand" className="w-full" disabled={pending}>{pending ? "Checking…" : "Submit for review"}</Button>
    </form>
  );
}

function Checks({ name, label, options }: { name: string; label: string; options: readonly { id: string; label: string }[] }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name={name} value={o.id} /> {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
