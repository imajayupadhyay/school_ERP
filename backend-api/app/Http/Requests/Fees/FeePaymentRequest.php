<?php

namespace App\Http\Requests\Fees;

use App\Models\FeeInvoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class FeePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $schoolId = $this->user()->school_id;

        return [
            'fee_invoice_id' => [
                'required',
                'integer',
                Rule::exists('fee_invoices', 'id')->where('school_id', $schoolId),
            ],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'mode' => ['required', 'in:cash,cheque,online,card,upi,bank_transfer'],
            'reference_no' => ['nullable', 'string', 'max:120'],
            'paid_on' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $schoolId = $this->user()->school_id;
                $invoiceId = $this->integer('fee_invoice_id');
                $amount = (float) $this->input('amount');

                $invoice = FeeInvoice::forSchool($schoolId)->find($invoiceId);

                if ($invoice === null) {
                    return;
                }

                if ($invoice->status === 'cancelled') {
                    $validator->errors()->add('fee_invoice_id', 'This invoice has been cancelled and cannot accept payments.');

                    return;
                }

                if ($amount - 0.001 > $invoice->balance) {
                    $validator->errors()->add('amount', 'Payment exceeds the outstanding balance of '.number_format($invoice->balance, 2).'.');
                }
            },
        ];
    }
}
