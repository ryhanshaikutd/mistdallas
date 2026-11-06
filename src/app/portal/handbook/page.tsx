import { requireBoard } from "@/lib/auth";
import { RULEBOOK_ENTRIES } from "@/lib/content/rulebook";
import { RUNBOOK_SECTIONS } from "@/lib/content/runbook";
import { MEETING_TEMPLATES } from "@/lib/content/meeting-templates";
import { BOARD_STANDARD } from "@/lib/workbook/content";
import HandbookClient from "@/components/portal/handbook/HandbookClient";

export default async function HandbookPage() {
  await requireBoard();
  return (
    <HandbookClient entries={RULEBOOK_ENTRIES} runbook={RUNBOOK_SECTIONS} boardStandard={BOARD_STANDARD} templates={MEETING_TEMPLATES} />
  );
}
