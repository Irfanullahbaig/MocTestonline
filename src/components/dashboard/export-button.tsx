"use client";

import { useState } from "react";
import { exportTestResults } from "@/lib/actions/teacher";
import { Button } from "@/components/ui";
import { Download } from "lucide-react";

export function ExportButton({ testId }: { testId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const result = await exportTestResults(testId);
    setLoading(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    const blob = new Blob([result.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-results-${testId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      <Download className="h-4 w-4" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
