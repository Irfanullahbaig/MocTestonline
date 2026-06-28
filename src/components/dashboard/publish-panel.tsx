"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import {
  publishTest,
  unpublishTest,
  updateTestStatus,
} from "@/lib/actions/teacher";
import { Button, Card, StatusBadge } from "@/components/ui";
import { getPublicTestUrl } from "@/lib/utils";

export function PublishPanel({
  testId,
  published,
  status,
}: {
  testId: string;
  published: boolean;
  status: string;
  questionCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const publicUrl = getPublicTestUrl(testId);

  async function handlePublish() {
    setLoading(true);
    const result = await publishTest(testId);
    setLoading(false);
    setMessage(result.success ? "Test published!" : result.error);
    if (result.success) window.location.reload();
  }

  async function handleUnpublish() {
    setLoading(true);
    await unpublishTest(testId);
    setLoading(false);
    window.location.reload();
  }

  async function handleComplete() {
    await updateTestStatus(testId, "COMPLETED");
    window.location.reload();
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Publish Test</h3>
        <StatusBadge status={status} />
      </div>

      {published ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm text-slate-600">Public test URL</p>
            <div className="mt-2 flex gap-2">
              <input
                readOnly
                value={publicUrl}
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              />
              <Button variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleUnpublish} disabled={loading}>
              Unpublish
            </Button>
            {status !== "COMPLETED" && (
              <Button variant="secondary" onClick={handleComplete}>
                Mark as Completed
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            Publish your test to generate a public link for students.
          </p>
          {message && (
            <p className="mt-2 text-sm text-red-600">{message}</p>
          )}
          <Button className="mt-4" onClick={handlePublish} disabled={loading}>
            {loading ? "Publishing..." : "Publish Test"}
          </Button>
        </div>
      )}
    </Card>
  );
}
