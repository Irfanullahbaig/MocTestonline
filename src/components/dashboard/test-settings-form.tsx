"use client";

import { useState } from "react";
import { updateTestSettings } from "@/lib/actions/teacher";
import { Button, Input, Card } from "@/components/ui";
import type { TimerMode } from "@prisma/client";

export function TestSettingsForm({
  testId,
  settings,
}: {
  testId: string;
  settings: {
    timerMode: TimerMode;
    defaultQuestionSeconds: number;
    allowSkip: boolean;
    allowReturnToSkipped: boolean;
    allowRetake: boolean;
    disableCopyPaste: boolean;
    requireFullscreen: boolean;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(settings);

  async function handleSave() {
    setLoading(true);
    setMessage("");
    const result = await updateTestSettings(testId, form);
    setLoading(false);
    setMessage(result.success ? "Settings saved" : result.error);
  }

  return (
    <Card>
      <h3 className="font-semibold">Test Settings</h3>
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Question Timer</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.timerMode}
            onChange={(e) =>
              setForm({ ...form, timerMode: e.target.value as TimerMode })
            }
          >
            <option value="SAME_FOR_ALL">Same timer for every question</option>
            <option value="CUSTOM_PER_QUESTION">Custom timer per question</option>
          </select>
        </div>

        {form.timerMode === "SAME_FOR_ALL" && (
          <Input
            label="Default question timer (seconds)"
            type="number"
            min={10}
            value={form.defaultQuestionSeconds}
            onChange={(e) =>
              setForm({ ...form, defaultQuestionSeconds: Number(e.target.value) })
            }
          />
        )}

        {[
          { key: "allowSkip" as const, label: "Allow skip question" },
          { key: "allowReturnToSkipped" as const, label: "Allow return to skipped questions" },
          { key: "allowRetake" as const, label: "Allow retake (same roll number)" },
          { key: "disableCopyPaste" as const, label: "Disable copy/paste" },
          { key: "requireFullscreen" as const, label: "Require fullscreen mode" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <span className="text-sm text-slate-700">{label}</span>
          </label>
        ))}

        {message && (
          <p
            className={`text-sm ${message === "Settings saved" ? "text-emerald-600" : "text-red-600"}`}
          >
            {message}
          </p>
        )}

        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </Card>
  );
}
