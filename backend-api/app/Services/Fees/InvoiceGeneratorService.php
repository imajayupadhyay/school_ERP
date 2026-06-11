<?php

namespace App\Services\Fees;

use App\Models\FeeInvoice;
use App\Models\FeeInvoiceItem;
use App\Models\StudentFeeAssignment;
use Carbon\Carbon;

/**
 * Expands a student's snapshotted fee items into dated instalment invoices
 * across the academic-session window, grouped by period.
 *
 * Amount semantics: each fee item's amount is per-occurrence. Frequency
 * decides how many occurrences fall across the session and on which months:
 *   monthly      -> every session month
 *   quarterly    -> every 3rd month from the session start
 *   half_yearly  -> every 6th month from the session start
 *   annual       -> once (session start month)
 *   one_time     -> once (session start month)
 *
 * All occurrences landing in the same month are merged into a single invoice
 * with a per-head line breakdown, so a student gets one bill per active month.
 */
class InvoiceGeneratorService
{
    /** Day of the month instalments fall due (future: per-school config). */
    private const DUE_DAY = 10;

    /**
     * Generate (or regenerate) invoices for an assignment.
     *
     * Payment-safe: invoices that already have collected money (paid or
     * partial) are preserved untouched, and only the still-open months are
     * rebuilt from the current item set. This lets an admin edit a student's
     * plan — add an optional or custom fee, change a discount — mid-year
     * without disturbing what has already been billed and paid. One-time and
     * annual fees anchor to the first still-open month so a fee added after
     * month 0 is already paid still gets billed.
     */
    public function generate(StudentFeeAssignment $assignment): void
    {
        $assignment->loadMissing(['items', 'academicSession']);
        $session = $assignment->academicSession;

        if ($session === null || $session->start_date === null || $session->end_date === null) {
            return;
        }

        $months = $this->sessionMonths($session->start_date, $session->end_date);
        $monthCount = count($months);

        if ($monthCount === 0) {
            return;
        }

        // Preserve invoices with collected money; drop the rest so they can be rebuilt.
        $existing = FeeInvoice::where('student_fee_assignment_id', $assignment->id)->with('items')->get();
        $lockedLabels = [];
        $lockedKeys = []; // identity of charges already billed on a paid invoice

        foreach ($existing as $invoice) {
            if ((float) $invoice->paid_amount > 0) {
                $lockedLabels[] = $invoice->period_label;

                foreach ($invoice->items as $invoiceItem) {
                    $lockedKeys[] = $this->lineKey($invoiceItem->fee_head_id, $invoiceItem->label);
                }

                continue;
            }

            $invoice->items()->delete();
            $invoice->delete();
        }

        $lockedLabels = array_unique($lockedLabels);
        $lockedKeys = array_unique($lockedKeys);
        $lockedIndices = [];
        $firstOpenIndex = null;

        foreach ($months as $index => $month) {
            if (in_array($month['label'], $lockedLabels, true)) {
                $lockedIndices[] = $index;
            } elseif ($firstOpenIndex === null) {
                $firstOpenIndex = $index;
            }
        }

        // bucket[monthIndex] = list of ['fee_head_id','label','amount']
        $buckets = [];

        foreach ($assignment->items as $item) {
            // Optional items are not billed unless explicitly turned non-optional.
            if ($item->is_optional) {
                continue;
            }

            $net = $item->net_amount;

            if ($net <= 0) {
                continue;
            }

            if (in_array($item->frequency, ['one_time', 'annual'], true)) {
                // A one-off already collected on a preserved invoice must not be
                // billed again; otherwise anchor it to the earliest open month.
                if (in_array($this->lineKey($item->fee_head_id, $item->label), $lockedKeys, true)) {
                    $occurrences = [];
                } else {
                    $occurrences = $firstOpenIndex === null ? [] : [$firstOpenIndex];
                }
            } else {
                $occurrences = array_values(array_filter(
                    $this->occurrenceMonths($item->frequency, $monthCount),
                    fn ($monthIndex) => ! in_array($monthIndex, $lockedIndices, true),
                ));
            }

            foreach ($occurrences as $monthIndex) {
                $buckets[$monthIndex][] = [
                    'fee_head_id' => $item->fee_head_id,
                    'label' => $item->label,
                    'amount' => $net,
                ];
            }
        }

        ksort($buckets);
        $seq = $this->nextSequence($assignment->school_id);

        foreach ($buckets as $monthIndex => $lines) {
            $period = $months[$monthIndex];
            $total = round(array_sum(array_column($lines, 'amount')), 2);

            $invoice = FeeInvoice::create([
                'school_id' => $assignment->school_id,
                'student_id' => $assignment->student_id,
                'student_fee_assignment_id' => $assignment->id,
                'invoice_no' => $this->formatNumber($assignment->school_id, $seq++),
                'period_label' => $period['label'],
                'due_date' => $period['due_date'],
                'total_amount' => $total,
                'paid_amount' => 0,
                'status' => 'pending',
            ]);

            foreach ($lines as $line) {
                FeeInvoiceItem::create([
                    'school_id' => $assignment->school_id,
                    'fee_invoice_id' => $invoice->id,
                    'fee_head_id' => $line['fee_head_id'],
                    'label' => $line['label'],
                    'amount' => $line['amount'],
                ]);
            }
        }
    }

    /** Stable identity for a charge line: by fee head when set, else by label. */
    private function lineKey(?int $feeHeadId, string $label): string
    {
        return $feeHeadId !== null ? 'h:'.$feeHeadId : 'l:'.$label;
    }

    /**
     * @return array<int, array{index: int, label: string, due_date: Carbon}>
     */
    private function sessionMonths(Carbon $start, Carbon $end): array
    {
        $cursor = $start->copy()->startOfMonth();
        $endMonth = $end->copy()->startOfMonth();
        $months = [];
        $index = 0;

        while ($cursor->lessThanOrEqualTo($endMonth)) {
            $months[$index] = [
                'index' => $index,
                'label' => $cursor->format('F Y'),
                'due_date' => $cursor->copy()->day(min(self::DUE_DAY, $cursor->daysInMonth)),
            ];

            $cursor->addMonth();
            $index++;
        }

        return $months;
    }

    /**
     * @return array<int, int>
     */
    private function occurrenceMonths(string $frequency, int $monthCount): array
    {
        return match ($frequency) {
            'monthly' => range(0, $monthCount - 1),
            'quarterly' => $this->stride($monthCount, 3),
            'half_yearly' => $this->stride($monthCount, 6),
            default => [0], // annual, one_time, and any unknown frequency
        };
    }

    /**
     * @return array<int, int>
     */
    private function stride(int $monthCount, int $step): array
    {
        $months = [];

        for ($i = 0; $i < $monthCount; $i += $step) {
            $months[] = $i;
        }

        return $months === [] ? [0] : $months;
    }

    private function nextSequence(int $schoolId): int
    {
        $last = FeeInvoice::forSchool($schoolId)->orderByDesc('id')->value('invoice_no');

        if ($last !== null && preg_match('/(\d+)$/', $last, $matches)) {
            return (int) $matches[1] + 1;
        }

        return 1;
    }

    private function formatNumber(int $schoolId, int $seq): string
    {
        return sprintf('INV-%d-%05d', $schoolId, $seq);
    }
}
