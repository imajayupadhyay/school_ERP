<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEnquiryRequest;
use App\Models\Enquiry;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class EnquiryController extends Controller
{
    use ApiResponse;

    /** Public: capture a sales lead from the marketing enquiry form. */
    public function store(StoreEnquiryRequest $request): JsonResponse
    {
        $enquiry = Enquiry::create([
            ...$request->validated(),
            'status' => 'new',
            'ip_address' => $request->ip(),
        ]);

        return $this->created(
            ['id' => $enquiry->id],
            'Thanks! Our team will reach out to you shortly.',
        );
    }
}
